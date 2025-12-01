import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { figures } from '../mock/mockData';
import { Timer, Eye } from 'lucide-react';

const GamePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [settings, setSettings] = useState(null);
  const [currentFigureIndex, setCurrentFigureIndex] = useState(0);
  const [isTracing, setIsTracing] = useState(false);
  const [allTracedPaths, setAllTracedPaths] = useState([]); // Все пути обводки
  const [currentPath, setCurrentPath] = useState([]); // Текущий путь
  const [showResult, setShowResult] = useState(false);
  const [timer, setTimer] = useState(0);
  const [sessionStats, setSessionStats] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sessionTimer, setSessionTimer] = useState(0);
  const [shuffledFigures, setShuffledFigures] = useState([]);
  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (!savedSettings) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(savedSettings);
    setSettings(parsed);
    
    // Перемешиваем все фигуры при первой загрузке
    const shuffled = shuffleArray([...figures]);
    setShuffledFigures(shuffled);
  }, [navigate]);

  // Функция для перемешивания массива (алгоритм Fisher-Yates)
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    if (!showResult && !showInstructions) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [showResult, showInstructions]);

  // Таймер для всей сессии - запускается СТРОГО один раз
  useEffect(() => {
    if (settings && !showInstructions && !sessionTimerRef.current) {
      const maxTime = (settings.duration || 10) * 60;
      console.log('🕐 Запуск таймера сессии на', settings.duration, 'минут (', maxTime, 'секунд)');
      
      sessionTimerRef.current = setInterval(() => {
        setSessionTimer((prev) => {
          const newTime = prev + 1;
          
          if (newTime % 10 === 0) {
            console.log('⏱️ Прошло:', newTime, 'сек из', maxTime, 'сек');
          }
          
          if (newTime >= maxTime) {
            console.log('⏰ Время вышло! Завершаем сессию');
            clearInterval(sessionTimerRef.current);
            sessionTimerRef.current = null;
            // Используем setTimeout чтобы избежать проблем с state
            setTimeout(() => endSession(), 100);
            return maxTime;
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    // Очистка только при размонтировании компонента
    return () => {
      if (sessionTimerRef.current) {
        console.log('🛑 Очистка таймера при размонтировании');
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [settings, showInstructions]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' && showInstructions) {
        e.preventDefault();
        setShowInstructions(false);
      } else if (e.key === ' ' && !showInstructions && !showResult) {
        // Первое нажатие пробела - показываем результат
        e.preventDefault();
        handleShowResult();
      } else if (e.key === ' ' && showResult) {
        // Второе нажатие пробела - переход к следующей фигуре
        e.preventDefault();
        nextFigure();
      } else if (e.key === 'Escape') {
        endSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResult, showInstructions]);

  useEffect(() => {
    if (settings && !showResult && !showInstructions) {
      drawScene();
    }
  }, [settings, currentFigureIndex, showResult, showInstructions, mousePos, allTracedPaths, currentPath, isTracing]);

  // Эффект для отрисовки результата
  useEffect(() => {
    if (showResult && settings) {
      drawResultOverlay();
    }
  }, [showResult, settings, allTracedPaths]);

  const drawScene = () => {
    const canvas = canvasRef.current;
    if (!canvas || !settings) return;

    const ctx = canvas.getContext('2d');
    
    // Заливаем фон выбранным цветом
    const bgColor = settings.backgroundColor === 'black' ? '#000000' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const figure = getFigures()[currentFigureIndex];
    if (!figure) return;

    // Рисуем фигуру Color 1
    ctx.strokeStyle = settings.color1;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawShape(ctx, figure);

    // Рисуем ВСЕ предыдущие пути обводки Color 2
    ctx.strokeStyle = settings.color2;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    allTracedPaths.forEach((path) => {
      if (path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      }
    });

    // Рисуем текущий путь (пока ещё рисуем)
    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }

    // Рисуем кружок на позиции мыши
    if (mousePos.x > 0 && mousePos.y > 0 && mousePos.x < canvas.width && mousePos.y < canvas.height) {
      ctx.fillStyle = settings.color2;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawShape = (ctx, figure) => {
    const centerX = 540;
    const centerY = 405;
    const size = 180;

    ctx.beginPath();

    switch (figure.type) {
      case 'circle':
        ctx.arc(centerX, centerY, size, 0, 2 * Math.PI);
        break;
      case 'square':
        ctx.rect(centerX - size, centerY - size, size * 2, size * 2);
        break;
      case 'triangle':
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size, centerY + size);
        ctx.lineTo(centerX - size, centerY + size);
        ctx.closePath();
        break;
      case 'star':
        drawStar(ctx, centerX, centerY, 5, size, size / 2);
        break;
      case 'heart':
        drawHeart(ctx, centerX, centerY, size);
        break;
      case 'house':
        drawHouse(ctx, centerX, centerY, size);
        break;
      case 'sun':
        drawSun(ctx, centerX, centerY, size);
        break;
      case 'flower':
        drawFlower(ctx, centerX, centerY, size);
        break;
      case 'ball':
        ctx.arc(centerX, centerY, size * 0.8, 0, 2 * Math.PI);
        break;
      case 'apple':
        drawApple(ctx, centerX, centerY, size);
        break;
      case 'pear':
        drawPear(ctx, centerX, centerY, size);
        break;
      case 'ladybug':
        drawLadybug(ctx, centerX, centerY, size);
        break;
      case 'chick':
        drawChick(ctx, centerX, centerY, size);
        break;
      case 'hedgehog':
        drawHedgehog(ctx, centerX, centerY, size);
        break;
      case 'horse':
        drawHorse(ctx, centerX, centerY, size);
        break;
      case 'whale':
        drawWhale(ctx, centerX, centerY, size);
        break;
      case 'hippo':
        drawHippo(ctx, centerX, centerY, size);
        break;
      case 'dolphin':
        drawDolphin(ctx, centerX, centerY, size);
        break;
      case 'sheep':
        drawSheep(ctx, centerX, centerY, size);
        break;
      case 'elephant':
        drawElephant(ctx, centerX, centerY, size);
        break;
      case 'train':
        drawTrain(ctx, centerX, centerY, size);
        break;
      case 'ship':
        drawShip(ctx, centerX, centerY, size);
        break;
      case 'turtle':
        drawTurtle(ctx, centerX, centerY, size);
        break;
      case 'cat':
        drawCat(ctx, centerX, centerY, size);
        break;
      case 'fish':
        drawFish(ctx, centerX, centerY, size);
        break;
      case 'butterfly':
        drawButterfly(ctx, centerX, centerY, size);
        break;
      case 'car':
        drawCar(ctx, centerX, centerY, size);
        break;
      case 'tree':
        drawTree(ctx, centerX, centerY, size);
        break;
      case 'cup':
        drawCup(ctx, centerX, centerY, size);
        break;
      case 'teddy':
        drawTeddy(ctx, centerX, centerY, size);
        break;
      case 'maze_simple':
        drawMazeSimple(ctx, centerX, centerY, size);
        break;
      case 'dog':
        drawDog(ctx, centerX, centerY, size);
        break;
      case 'bird':
        drawBird(ctx, centerX, centerY, size);
        break;
      case 'spider':
        drawSpider(ctx, centerX, centerY, size);
        break;
      case 'airplane':
        drawAirplane(ctx, centerX, centerY, size);
        break;
      case 'mushroom':
        drawMushroom(ctx, centerX, centerY, size);
        break;
      case 'rabbit':
        drawRabbit(ctx, centerX, centerY, size);
        break;
      case 'snail':
        drawSnail(ctx, centerX, centerY, size);
        break;
      case 'maze_complex':
        drawMazeComplex(ctx, centerX, centerY, size);
        break;
      case 'pig':
        drawPig(ctx, centerX, centerY, size);
        break;
      case 'duck':
        drawDuck(ctx, centerX, centerY, size);
        break;
      case 'parrot':
        drawParrot(ctx, centerX, centerY, size);
        break;
      case 'bat':
        drawBat(ctx, centerX, centerY, size);
        break;
      case 'frog':
        drawFrog(ctx, centerX, centerY, size);
        break;
      case 'owl':
        drawOwl(ctx, centerX, centerY, size);
        break;
      case 'snake':
        drawSnake(ctx, centerX, centerY, size);
        break;
      case 'beaver':
        drawBeaver(ctx, centerX, centerY, size);
        break;
      case 'squirrel':
        drawSquirrel(ctx, centerX, centerY, size);
        break;
      case 'letter':
        ctx.font = `bold ${size * 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(figure.shape, centerX, centerY);
        return;
      case 'number':
        ctx.font = `bold ${size * 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(figure.shape, centerX, centerY);
        return;
    }

    ctx.stroke();
  };

  const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  const drawHeart = (ctx, cx, cy, size) => {
    const topCurveHeight = size * 0.3;
    ctx.moveTo(cx, cy + size / 4);
    ctx.bezierCurveTo(cx, cy, cx - size / 2, cy - topCurveHeight, cx - size / 2, cy + size / 4);
    ctx.bezierCurveTo(cx - size / 2, cy + size / 2, cx, cy + size * 0.75, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + size * 0.75, cx + size / 2, cy + size / 2, cx + size / 2, cy + size / 4);
    ctx.bezierCurveTo(cx + size / 2, cy - topCurveHeight, cx, cy, cx, cy + size / 4);
  };

  const drawHouse = (ctx, cx, cy, size) => {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx + size, cy + size);
    ctx.lineTo(cx - size, cy + size);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
  };

  const drawSun = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.5, 0, 2 * Math.PI);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      ctx.moveTo(cx + Math.cos(angle) * size * 0.6, cy + Math.sin(angle) * size * 0.6);
      ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    }
  };

  const drawFlower = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.3, 0, 2 * Math.PI);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * 2 * Math.PI;
      ctx.moveTo(cx, cy);
      ctx.arc(cx + Math.cos(angle) * size * 0.5, cy + Math.sin(angle) * size * 0.5, size * 0.3, 0, 2 * Math.PI);
    }
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + size);
  };

  const drawCat = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.5, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.3, cy - size);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.6);
    ctx.moveTo(cx + size * 0.5, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.3, cy - size);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.6);
  };

  const drawFish = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy);
    ctx.quadraticCurveTo(cx - size * 0.5, cy - size * 0.5, cx + size * 0.3, cy);
    ctx.quadraticCurveTo(cx - size * 0.5, cy + size * 0.5, cx - size, cy);
    ctx.moveTo(cx + size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.3);
  };

  const drawButterfly = (ctx, cx, cy, size) => {
    ctx.arc(cx - size * 0.3, cy - size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.7, cy - size * 0.3);
    ctx.arc(cx + size * 0.3, cy - size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.7, cy + size * 0.3);
    ctx.arc(cx - size * 0.3, cy + size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.7, cy + size * 0.3);
    ctx.arc(cx + size * 0.3, cy + size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx, cy + size * 0.5);
  };

  const drawCar = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy, size * 2, size * 0.6);
    ctx.rect(cx - size * 0.5, cy - size * 0.5, size, size * 0.5);
    ctx.arc(cx - size * 0.5, cy + size * 0.6, size * 0.3, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.8, cy + size * 0.6);
    ctx.arc(cx + size * 0.5, cy + size * 0.6, size * 0.3, 0, 2 * Math.PI);
  };

  const drawTree = (ctx, cx, cy, size) => {
    ctx.rect(cx - size * 0.2, cy + size * 0.3, size * 0.4, size * 0.7);
    ctx.arc(cx, cy - size * 0.3, size * 0.7, 0, 2 * Math.PI);
  };

  const drawCup = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.6, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.7, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.7, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.6, cy - size * 0.5);
    ctx.closePath();
    ctx.moveTo(cx + size * 0.7, cy);
    ctx.quadraticCurveTo(cx + size, cy, cx + size, cy + size * 0.3);
    ctx.quadraticCurveTo(cx + size, cy + size * 0.5, cx + size * 0.7, cy + size * 0.5);
  };

  const drawTeddy = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.5, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.2, cy - size * 0.7);
    ctx.arc(cx - size * 0.5, cy - size * 0.7, size * 0.3, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.8, cy - size * 0.7);
    ctx.arc(cx + size * 0.5, cy - size * 0.7, size * 0.3, 0, 2 * Math.PI);
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.arc(cx, cy + size * 0.8, size * 0.3, 0, 2 * Math.PI);
  };

  const drawMazeSimple = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy - size, size * 2, size * 2);
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size * 0.5, cy);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size * 0.5);
    ctx.moveTo(cx + size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx + size, cy + size * 0.5);
  };

  const drawDog = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.6, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.8, cy - size * 0.8);
    ctx.lineTo(cx - size * 0.4, cy - size * 0.5);
    ctx.moveTo(cx + size * 0.6, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.8, cy - size * 0.8);
    ctx.lineTo(cx + size * 0.4, cy - size * 0.5);
    ctx.moveTo(cx, cy + size * 0.6);
    ctx.lineTo(cx - size * 0.3, cy + size);
    ctx.moveTo(cx, cy + size * 0.6);
    ctx.lineTo(cx + size * 0.3, cy + size);
  };

  const drawBird = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.8, cy - size * 0.3);
    ctx.quadraticCurveTo(cx - size, cy - size * 0.7, cx - size * 0.5, cy - size * 0.3);
    ctx.moveTo(cx + size * 0.8, cy - size * 0.3);
    ctx.quadraticCurveTo(cx + size, cy - size * 0.7, cx + size * 0.5, cy - size * 0.3);
    ctx.moveTo(cx + size * 0.3, cy);
    ctx.lineTo(cx + size * 0.7, cy + size * 0.2);
  };

  const drawSpider = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.4, 0, 2 * Math.PI);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      ctx.moveTo(cx + Math.cos(angle) * size * 0.4, cy + Math.sin(angle) * size * 0.4);
      ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    }
  };

  const drawAirplane = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.7);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.7);
    ctx.lineTo(cx, cy);
    ctx.moveTo(cx + size * 0.7, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy);
  };

  const drawMushroom = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy - size * 0.3, size * 0.7, Math.PI, 0);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
  };

  const drawRabbit = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.5, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.2, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.3, cy - size * 1.2);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.7);
    ctx.moveTo(cx + size * 0.2, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy - size * 1.2);
    ctx.lineTo(cx + size * 0.1, cy - size * 0.7);
  };

  const drawSnail = (ctx, cx, cy, size) => {
    ctx.arc(cx + size * 0.3, cy - size * 0.3, size * 0.5, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.2, cy - size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.5, cy, cx - size * 0.8, cy + size * 0.3);
    ctx.moveTo(cx - size * 0.8, cy);
    ctx.lineTo(cx - size, cy - size * 0.3);
    ctx.moveTo(cx - size * 0.8, cy);
    ctx.lineTo(cx - size, cy + size * 0.3);
  };

  const drawMazeComplex = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy - size, size * 2, size * 2);
    ctx.moveTo(cx - size, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.5);
    ctx.moveTo(cx - size * 0.5, cy - size);
    ctx.lineTo(cx - size * 0.5, cy + size * 0.3);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx + size * 0.5, cy - size);
    ctx.lineTo(cx + size * 0.5, cy + size);
    ctx.moveTo(cx - size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.5);
  };

  const drawApple = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy + size * 0.2, size * 0.7, 0, 2 * Math.PI);
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx, cy - size * 0.8);
    ctx.moveTo(cx, cy - size * 0.8);
    ctx.quadraticCurveTo(cx - size * 0.3, cy - size * 0.7, cx - size * 0.2, cy - size * 0.5);
  };

  const drawPear = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy + size * 0.3, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.3, cy);
    ctx.arc(cx, cy - size * 0.2, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx, cy - size * 0.6);
    ctx.lineTo(cx, cy - size * 0.9);
  };

  const drawLadybug = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx, cy - size * 0.6);
    ctx.lineTo(cx, cy + size * 0.6);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.3);
    ctx.arc(cx - size * 0.3, cy - size * 0.3, size * 0.15, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.45, cy - size * 0.3);
    ctx.arc(cx + size * 0.3, cy - size * 0.3, size * 0.15, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.15, cy + size * 0.3);
    ctx.arc(cx, cy + size * 0.3, size * 0.15, 0, 2 * Math.PI);
  };

  const drawChick = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.5, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.6, cy);
    ctx.lineTo(cx + size * 0.9, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.6, cy + size * 0.1);
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.2, cy + size * 0.9);
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.9);
  };

  const drawHedgehog = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, Math.PI * 0.2, Math.PI * 0.8);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.5, cy - size * 0.8);
    ctx.moveTo(cx - size * 0.1, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.9);
    ctx.moveTo(cx + size * 0.1, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.9);
    ctx.moveTo(cx + size * 0.3, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.7);
  };

  const drawHorse = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy - size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.8, cy - size * 0.7);
    ctx.moveTo(cx, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.8);
    ctx.moveTo(cx, cy + size * 0.1);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.8);
    ctx.moveTo(cx + size * 0.5, cy);
    ctx.quadraticCurveTo(cx + size * 0.7, cy - size * 0.3, cx + size * 0.5, cy - size * 0.6);
  };

  const drawWhale = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy);
    ctx.quadraticCurveTo(cx - size * 0.5, cy - size * 0.7, cx + size * 0.5, cy);
    ctx.quadraticCurveTo(cx + size, cy + size * 0.3, cx - size, cy);
    ctx.moveTo(cx + size * 0.5, cy);
    ctx.lineTo(cx + size * 0.7, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.9, cy);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.9);
  };

  const drawHippo = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.7, cy - size * 0.2);
    ctx.quadraticCurveTo(cx + size, cy - size * 0.3, cx + size * 0.7, cy - size * 0.5);
    ctx.moveTo(cx - size * 0.7, cy - size * 0.2);
    ctx.quadraticCurveTo(cx - size, cy - size * 0.3, cx - size * 0.7, cy - size * 0.5);
    ctx.moveTo(cx - size * 0.3, cy + size * 0.6);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.9);
    ctx.moveTo(cx + size * 0.3, cy + size * 0.6);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.9);
  };

  const drawDolphin = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy + size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.5, cy - size * 0.5, cx, cy - size * 0.3);
    ctx.quadraticCurveTo(cx + size * 0.5, cy - size * 0.5, cx + size, cy);
    ctx.quadraticCurveTo(cx + size * 0.7, cy + size * 0.3, cx + size * 0.5, cy + size * 0.5);
    ctx.moveTo(cx + size * 0.5, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.7, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.4);
  };

  const drawSheep = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.8, cy - size * 0.1);
    ctx.arc(cx - size * 0.6, cy, size * 0.3, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.3, cy + size * 0.6);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.9);
    ctx.moveTo(cx + size * 0.3, cy + size * 0.6);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.9);
  };

  const drawElephant = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy - size * 0.2, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.3, cy - size * 0.6);
    ctx.arc(cx + size * 0.4, cy - size * 0.7, size * 0.25, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.3, cy - size * 0.6);
    ctx.arc(cx - size * 0.4, cy - size * 0.7, size * 0.25, 0, 2 * Math.PI);
    ctx.moveTo(cx, cy + size * 0.4);
    ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.9, cx - size * 0.5, cy + size);
  };

  const drawTrain = (ctx, cx, cy, size) => {
    ctx.rect(cx - size * 0.7, cy - size * 0.3, size * 1.4, size * 0.8);
    ctx.rect(cx - size * 0.5, cy - size * 0.6, size, size * 0.3);
    ctx.moveTo(cx + size * 0.2, cy + size * 0.5);
    ctx.arc(cx - size * 0.3, cy + size * 0.5, size * 0.25, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.55, cy + size * 0.5);
    ctx.arc(cx + size * 0.3, cy + size * 0.5, size * 0.25, 0, 2 * Math.PI);
  };

  const drawShip = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.5, cy);
    ctx.lineTo(cx + size * 0.5, cy);
    ctx.lineTo(cx + size, cy + size * 0.5);
    ctx.closePath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - size);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.6, cy - size * 0.7);
    ctx.lineTo(cx, cy - size * 0.4);
    ctx.closePath();
  };

  const drawTurtle = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.7, cy);
    ctx.arc(cx - size * 0.6, cy, size * 0.2, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.4, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.6, cy + size * 0.8);
    ctx.moveTo(cx + size * 0.4, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.6, cy + size * 0.8);
  };

  const drawPig = (ctx, cx, cy, size) => {
    // Большое тело-овал
    ctx.ellipse(cx + size * 0.1, cy, size * 0.7, size * 0.45, 0, 0, 2 * Math.PI);
    
    // Голова
    ctx.moveTo(cx - size * 0.4, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.65, cy - size * 0.35);
    ctx.lineTo(cx - size * 0.8, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.85, cy);
    ctx.lineTo(cx - size * 0.8, cy + size * 0.15);
    ctx.lineTo(cx - size * 0.65, cy + size * 0.25);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.3);
    
    // Пятачок
    ctx.moveTo(cx - size * 0.75, cy - size * 0.05);
    ctx.ellipse(cx - size * 0.85, cy, size * 0.12, size * 0.09, 0, 0, 2 * Math.PI);
    
    // Четыре ноги
    ctx.moveTo(cx - size * 0.3, cy + size * 0.45);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.7);
    ctx.moveTo(cx, cy + size * 0.45);
    ctx.lineTo(cx, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.3, cy + size * 0.45);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.55, cy + size * 0.45);
    ctx.lineTo(cx + size * 0.55, cy + size * 0.7);
    
    // Закрученный хвостик
    ctx.moveTo(cx + size * 0.75, cy - size * 0.05);
    ctx.quadraticCurveTo(cx + size * 0.82, cy - size * 0.15, cx + size * 0.78, cy - size * 0.25);
  };

  const drawDuck = (ctx, cx, cy, size) => {
    // Круглое тело
    ctx.arc(cx, cy + size * 0.15, size * 0.5, 0, 2 * Math.PI);
    
    // Круглая голова
    ctx.moveTo(cx - size * 0.1, cy - size * 0.5);
    ctx.arc(cx - size * 0.25, cy - size * 0.5, size * 0.3, 0, 2 * Math.PI);
    
    // Большой клюв
    ctx.moveTo(cx - size * 0.55, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.8, cy - size * 0.42);
    ctx.lineTo(cx - size * 0.75, cy - size * 0.58);
    ctx.lineTo(cx - size * 0.55, cy - size * 0.62);
    ctx.closePath();
    
    // Глаз
    ctx.moveTo(cx - size * 0.2, cy - size * 0.5);
    ctx.arc(cx - size * 0.22, cy - size * 0.52, size * 0.06, 0, 2 * Math.PI);
    
    // Крыло
    ctx.moveTo(cx - size * 0.05, cy + size * 0.05);
    ctx.quadraticCurveTo(cx - size * 0.25, cy + size * 0.25, cx - size * 0.1, cy + size * 0.4);
    
    // Две ноги с лапками
    ctx.moveTo(cx - size * 0.15, cy + size * 0.65);
    ctx.lineTo(cx - size * 0.15, cy + size * 0.8);
    ctx.lineTo(cx - size * 0.28, cy + size * 0.83);
    ctx.moveTo(cx - size * 0.15, cy + size * 0.8);
    ctx.lineTo(cx - size * 0.02, cy + size * 0.83);
    
    ctx.moveTo(cx + size * 0.08, cy + size * 0.65);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.8);
    ctx.lineTo(cx - size * 0.05, cy + size * 0.83);
    ctx.moveTo(cx + size * 0.08, cy + size * 0.8);
    ctx.lineTo(cx + size * 0.21, cy + size * 0.83);
  };

  const drawParrot = (ctx, cx, cy, size) => {
    // Круглое тело
    ctx.arc(cx, cy + size * 0.1, size * 0.45, 0, 2 * Math.PI);
    
    // Круглая голова
    ctx.moveTo(cx + size * 0.35, cy - size * 0.6);
    ctx.arc(cx, cy - size * 0.6, size * 0.35, 0, 2 * Math.PI);
    
    // Загнутый клюв
    ctx.moveTo(cx - size * 0.32, cy - size * 0.65);
    ctx.quadraticCurveTo(cx - size * 0.5, cy - size * 0.75, cx - size * 0.52, cy - size * 0.58);
    ctx.quadraticCurveTo(cx - size * 0.48, cy - size * 0.48, cx - size * 0.35, cy - size * 0.55);
    
    // Глаз
    ctx.moveTo(cx - size * 0.08, cy - size * 0.6);
    ctx.arc(cx - size * 0.12, cy - size * 0.65, size * 0.08, 0, 2 * Math.PI);
    
    // Крыло
    ctx.moveTo(cx + size * 0.02, cy - size * 0.1);
    ctx.quadraticCurveTo(cx + size * 0.55, cy + size * 0.05, cx + size * 0.48, cy + size * 0.35);
    ctx.quadraticCurveTo(cx + size * 0.3, cy + size * 0.45, cx + size * 0.05, cy + size * 0.35);
    
    // Хвост (три пера)
    ctx.moveTo(cx - size * 0.05, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.18, cy + size * 0.95);
    ctx.moveTo(cx - size * 0.05, cy + size * 0.55);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.95);
    ctx.moveTo(cx - size * 0.05, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.03, cy + size * 1.0);
    
    // Лапки
    ctx.moveTo(cx - size * 0.18, cy + size * 0.55);
    ctx.lineTo(cx - size * 0.18, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.08, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.7);
  };

  const drawBat = (ctx, cx, cy, size) => {
    // Маленькое круглое тело
    ctx.arc(cx, cy, size * 0.22, 0, 2 * Math.PI);
    
    // Круглая голова
    ctx.moveTo(cx + size * 0.18, cy - size * 0.42);
    ctx.arc(cx, cy - size * 0.42, size * 0.18, 0, 2 * Math.PI);
    
    // Заостренные уши
    ctx.moveTo(cx - size * 0.12, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.18, cy - size * 0.78);
    ctx.lineTo(cx - size * 0.08, cy - size * 0.65);
    ctx.moveTo(cx + size * 0.12, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.18, cy - size * 0.78);
    ctx.lineTo(cx + size * 0.08, cy - size * 0.65);
    
    // Глаза
    ctx.moveTo(cx - size * 0.06, cy - size * 0.42);
    ctx.arc(cx - size * 0.06, cy - size * 0.42, size * 0.03, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.06, cy - size * 0.42);
    ctx.arc(cx + size * 0.06, cy - size * 0.42, size * 0.03, 0, 2 * Math.PI);
    
    // Левое крыло - упрощенное
    ctx.moveTo(cx - size * 0.22, cy - size * 0.05);
    ctx.quadraticCurveTo(cx - size * 0.6, cy - size * 0.25, cx - size * 0.75, cy - size * 0.08);
    ctx.quadraticCurveTo(cx - size * 0.72, cy + size * 0.08, cx - size * 0.58, cy + size * 0.15);
    ctx.quadraticCurveTo(cx - size * 0.4, cy - size * 0.02, cx - size * 0.28, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.22, cy);
    
    // Правое крыло - упрощенное
    ctx.moveTo(cx + size * 0.22, cy - size * 0.05);
    ctx.quadraticCurveTo(cx + size * 0.6, cy - size * 0.25, cx + size * 0.75, cy - size * 0.08);
    ctx.quadraticCurveTo(cx + size * 0.72, cy + size * 0.08, cx + size * 0.58, cy + size * 0.15);
    ctx.quadraticCurveTo(cx + size * 0.4, cy - size * 0.02, cx + size * 0.28, cy + size * 0.12);
    ctx.lineTo(cx + size * 0.22, cy);
  };

  const drawFrog = (ctx, cx, cy, size) => {
    // Приплюснутое круглое тело
    ctx.ellipse(cx, cy, size * 0.45, size * 0.35, 0, 0, 2 * Math.PI);
    
    // Огромные глаза на макушке
    ctx.moveTo(cx - size * 0.05, cy - size * 0.55);
    ctx.arc(cx - size * 0.22, cy - size * 0.45, size * 0.22, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.44, cy - size * 0.55);
    ctx.arc(cx + size * 0.22, cy - size * 0.45, size * 0.22, 0, 2 * Math.PI);
    
    // Зрачки
    ctx.moveTo(cx - size * 0.17, cy - size * 0.45);
    ctx.arc(cx - size * 0.22, cy - size * 0.45, size * 0.08, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.27, cy - size * 0.45);
    ctx.arc(cx + size * 0.22, cy - size * 0.45, size * 0.08, 0, 2 * Math.PI);
    
    // Улыбка
    ctx.moveTo(cx - size * 0.28, cy + size * 0.02);
    ctx.quadraticCurveTo(cx, cy + size * 0.15, cx + size * 0.28, cy + size * 0.02);
    
    // Передние короткие лапки
    ctx.moveTo(cx - size * 0.38, cy + size * 0.05);
    ctx.lineTo(cx - size * 0.62, cy + size * 0.18);
    ctx.lineTo(cx - size * 0.72, cy + size * 0.25);
    ctx.moveTo(cx + size * 0.38, cy + size * 0.05);
    ctx.lineTo(cx + size * 0.62, cy + size * 0.18);
    ctx.lineTo(cx + size * 0.72, cy + size * 0.25);
    
    // Задние длинные лапки с пальцами
    ctx.moveTo(cx - size * 0.28, cy + size * 0.35);
    ctx.lineTo(cx - size * 0.45, cy + size * 0.55);
    ctx.lineTo(cx - size * 0.72, cy + size * 0.5);
    ctx.moveTo(cx + size * 0.28, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.45, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.72, cy + size * 0.5);
  };

  const drawOwl = (ctx, cx, cy, size) => {
    // Круглое тело
    ctx.ellipse(cx, cy + size * 0.15, size * 0.45, size * 0.55, 0, 0, 2 * Math.PI);
    
    // Круглая голова
    ctx.moveTo(cx + size * 0.4, cy - size * 0.25);
    ctx.arc(cx, cy - size * 0.25, size * 0.4, 0, 2 * Math.PI);
    
    // Огромные круглые глаза
    ctx.moveTo(cx - size * 0.08, cy - size * 0.28);
    ctx.arc(cx - size * 0.22, cy - size * 0.3, size * 0.18, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.4, cy - size * 0.28);
    ctx.arc(cx + size * 0.22, cy - size * 0.3, size * 0.18, 0, 2 * Math.PI);
    
    // Зрачки
    ctx.moveTo(cx - size * 0.18, cy - size * 0.3);
    ctx.arc(cx - size * 0.22, cy - size * 0.3, size * 0.07, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.26, cy - size * 0.3);
    ctx.arc(cx + size * 0.22, cy - size * 0.3, size * 0.07, 0, 2 * Math.PI);
    
    // Маленький клюв треугольник
    ctx.moveTo(cx, cy - size * 0.18);
    ctx.lineTo(cx - size * 0.07, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.07, cy - size * 0.05);
    ctx.closePath();
    
    // V-образные перья на груди
    ctx.moveTo(cx - size * 0.18, cy + size * 0.08);
    ctx.lineTo(cx - size * 0.14, cy + size * 0.22);
    ctx.lineTo(cx - size * 0.18, cy + size * 0.36);
    ctx.moveTo(cx, cy + size * 0.08);
    ctx.lineTo(cx, cy + size * 0.22);
    ctx.lineTo(cx - size * 0.04, cy + size * 0.36);
    ctx.moveTo(cx + size * 0.18, cy + size * 0.08);
    ctx.lineTo(cx + size * 0.14, cy + size * 0.22);
    ctx.lineTo(cx + size * 0.18, cy + size * 0.36);
    
    // Короткие лапки
    ctx.moveTo(cx - size * 0.12, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.82);
    ctx.moveTo(cx + size * 0.12, cy + size * 0.7);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.82);
  };

  const drawSnake = (ctx, cx, cy, size) => {
    // Круглая голова
    ctx.arc(cx - size * 0.75, cy - size * 0.35, size * 0.18, 0, 2 * Math.PI);
    
    // Глаз
    ctx.moveTo(cx - size * 0.72, cy - size * 0.35);
    ctx.arc(cx - size * 0.72, cy - size * 0.38, size * 0.04, 0, 2 * Math.PI);
    
    // Извилистое тело - упрощенное
    ctx.moveTo(cx - size * 0.57, cy - size * 0.32);
    ctx.quadraticCurveTo(cx - size * 0.35, cy - size * 0.55, cx - size * 0.15, cy - size * 0.38);
    ctx.quadraticCurveTo(cx + size * 0.05, cy - size * 0.2, cx + size * 0.22, cy - size * 0.28);
    ctx.quadraticCurveTo(cx + size * 0.42, cy - size * 0.38, cx + size * 0.52, cy - size * 0.08);
    ctx.quadraticCurveTo(cx + size * 0.58, cy + size * 0.18, cx + size * 0.42, cy + size * 0.38);
    ctx.quadraticCurveTo(cx + size * 0.22, cy + size * 0.55, cx, cy + size * 0.48);
    ctx.quadraticCurveTo(cx - size * 0.18, cy + size * 0.38, cx - size * 0.38, cy + size * 0.48);
    ctx.quadraticCurveTo(cx - size * 0.55, cy + size * 0.58, cx - size * 0.68, cy + size * 0.42);
    
    // Упрощенные узоры (меньше ромбиков)
    ctx.moveTo(cx - size * 0.28, cy - size * 0.46);
    ctx.lineTo(cx - size * 0.18, cy - size * 0.38);
    ctx.lineTo(cx - size * 0.28, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.38, cy - size * 0.38);
    ctx.closePath();
    
    ctx.moveTo(cx + size * 0.12, cy - size * 0.35);
    ctx.lineTo(cx + size * 0.22, cy - size * 0.27);
    ctx.lineTo(cx + size * 0.32, cy - size * 0.35);
    ctx.lineTo(cx + size * 0.22, cy - size * 0.43);
    ctx.closePath();
    
    ctx.moveTo(cx + size * 0.32, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.28);
    ctx.lineTo(cx + size * 0.32, cy + size * 0.36);
    ctx.lineTo(cx + size * 0.24, cy + size * 0.28);
    ctx.closePath();
  };

  const drawBeaver = (ctx, cx, cy, size) => {
    // Тело бобра
    ctx.moveTo(cx - size * 0.8, cy - size * 0.2);
    ctx.quadraticCurveTo(cx - size * 0.6, cy - size * 0.6, cx, cy - size * 0.5);
    ctx.quadraticCurveTo(cx + size * 0.6, cy - size * 0.6, cx + size * 0.7, cy);
    ctx.quadraticCurveTo(cx + size * 0.75, cy + size * 0.3, cx + size * 0.5, cy + size * 0.4);
    
    // Голова
    ctx.moveTo(cx - size * 0.7, cy - size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.9, cy - size * 0.2, cx - size * 0.95, cy);
    ctx.quadraticCurveTo(cx - size * 0.9, cy + size * 0.15, cx - size * 0.75, cy + size * 0.2);
    
    // Глаз
    ctx.moveTo(cx - size * 0.8, cy - size * 0.1);
    ctx.arc(cx - size * 0.8, cy - size * 0.12, size * 0.05, 0, 2 * Math.PI);
    
    // Передние лапки
    ctx.moveTo(cx - size * 0.5, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.5, cy + size * 0.35);
    ctx.lineTo(cx - size * 0.45, cy + size * 0.4);
    ctx.moveTo(cx - size * 0.2, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.15, cy + size * 0.45);
    ctx.lineTo(cx - size * 0.1, cy + size * 0.5);
    
    // Задние лапки
    ctx.moveTo(cx + size * 0.2, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.25, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.6);
    ctx.moveTo(cx + size * 0.45, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.55, cy + size * 0.55);
    
    // Хвост (плоский и широкий)
    ctx.moveTo(cx + size * 0.5, cy + size * 0.4);
    ctx.quadraticCurveTo(cx + size * 0.7, cy + size * 0.5, cx + size * 0.85, cy + size * 0.45);
    ctx.lineTo(cx + size * 0.9, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.88, cy + size * 0.65);
    ctx.lineTo(cx + size * 0.7, cy + size * 0.7);
    ctx.quadraticCurveTo(cx + size * 0.6, cy + size * 0.65, cx + size * 0.5, cy + size * 0.5);
  };

  const drawSquirrel = (ctx, cx, cy, size) => {
    // Тело белки
    ctx.moveTo(cx + size * 0.3, cy);
    ctx.ellipse(cx, cy, size * 0.3, size * 0.45, 0, 0, 2 * Math.PI);
    
    // Голова
    ctx.moveTo(cx - size * 0.25, cy - size * 0.6);
    ctx.arc(cx - size * 0.3, cy - size * 0.7, size * 0.25, 0, 2 * Math.PI);
    
    // Ушки с кисточками
    ctx.moveTo(cx - size * 0.45, cy - size * 0.95);
    ctx.lineTo(cx - size * 0.4, cy - size * 1.05);
    ctx.lineTo(cx - size * 0.35, cy - size * 0.95);
    ctx.moveTo(cx - size * 0.15, cy - size * 0.95);
    ctx.lineTo(cx - size * 0.2, cy - size * 1.05);
    ctx.lineTo(cx - size * 0.25, cy - size * 0.95);
    
    // Мордочка и нос
    ctx.moveTo(cx - size * 0.48, cy - size * 0.75);
    ctx.arc(cx - size * 0.52, cy - size * 0.75, size * 0.05, 0, 2 * Math.PI);
    
    // Глаз
    ctx.moveTo(cx - size * 0.25, cy - size * 0.75);
    ctx.arc(cx - size * 0.27, cy - size * 0.77, size * 0.08, 0, 2 * Math.PI);
    
    // Передняя лапка (согнутая)
    ctx.moveTo(cx - size * 0.15, cy - size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.25, cy - size * 0.15, cx - size * 0.2, cy);
    
    // Задняя лапка
    ctx.moveTo(cx + size * 0.1, cy + size * 0.45);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.65);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.7);
    
    // Пушистый хвост (большой и изогнутый)
    ctx.moveTo(cx + size * 0.2, cy + size * 0.2);
    ctx.quadraticCurveTo(cx + size * 0.5, cy + size * 0.4, cx + size * 0.7, cy + size * 0.2);
    ctx.quadraticCurveTo(cx + size * 0.85, cy - size * 0.1, cx + size * 0.8, cy - size * 0.5);
    ctx.quadraticCurveTo(cx + size * 0.7, cy - size * 0.8, cx + size * 0.4, cy - size * 0.9);
    // Внутренний контур хвоста для пушистости
    ctx.moveTo(cx + size * 0.3, cy);
    ctx.quadraticCurveTo(cx + size * 0.5, cy + size * 0.1, cx + size * 0.65, cy);
    ctx.quadraticCurveTo(cx + size * 0.75, cy - size * 0.25, cx + size * 0.65, cy - size * 0.5);
    ctx.quadraticCurveTo(cx + size * 0.55, cy - size * 0.7, cx + size * 0.35, cy - size * 0.75);
  };

  const handleMouseDown = (e) => {
    if (showResult || showInstructions) return;
    setIsTracing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath([{ x, y }]);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    if (isTracing && !showResult && !showInstructions) {
      setCurrentPath((prev) => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (!isTracing) return;
    setIsTracing(false);
    
    // Сохраняем текущий путь в список всех путей
    if (currentPath.length > 1) {
      setAllTracedPaths((prev) => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  const handleShowResult = () => {
    console.log('📊 Показываем результат. Путей обводки:', allTracedPaths.length);
    setShowResult(true);
    clearInterval(timerRef.current);

    const stats = {
      figure: getFigures()[currentFigureIndex],
      time: timer,
      completed: true
    };
    setSessionStats((prev) => [...prev, stats]);
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -100, y: -100 });
    if (isTracing) {
      setIsTracing(false);
    }
  };

  const drawResultOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas || !settings) return;
    
    const ctx = canvas.getContext('2d');
    const bgColor = settings.backgroundColor === 'black' ? '#000000' : '#ffffff';
    
    // Очищаем canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Цвет для отображения - контрастный к фону (один цвет для обеих линий)
    const compareColor = settings.backgroundColor === 'black' ? '#FFFFFF' : '#000000';
    ctx.strokeStyle = compareColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Рисуем оригинальную фигуру ПУНКТИРОМ
    ctx.setLineDash([10, 10]); // Пунктирная линия: 10px линия, 10px пробел
    const figure = getFigures()[currentFigureIndex];
    drawShape(ctx, figure);
    
    // Рисуем ВСЕ пути обводки игрока СПЛОШНОЙ ЛИНИЕЙ
    ctx.setLineDash([]); // Сплошная линия
    ctx.lineWidth = 3;
    allTracedPaths.forEach((path) => {
      if (path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      }
    });
    
    // Сбрасываем пунктир для будущих отрисовок
    ctx.setLineDash([]);
  };

  const nextFigure = () => {
    const figures = getFigures();
    if (currentFigureIndex < figures.length - 1) {
      setCurrentFigureIndex((prev) => prev + 1);
      setShowResult(false);
      setAllTracedPaths([]);
      setCurrentPath([]);
      setTimer(0);
    } else {
      endSession();
    }
  };

  const endSession = () => {
    // Очищаем все таймеры
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    localStorage.setItem('sessionStats', JSON.stringify(sessionStats));
    navigate('/results');
  };

  const getFigures = () => {
    return shuffledFigures;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    if (!settings) return '';
    const maxTime = (settings.duration || 10) * 60;
    const remaining = maxTime - sessionTimer;
    return formatTime(Math.max(0, remaining));
  };

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-400" style={{ color: settings.color1 }} />
              <Eye className="w-5 h-5 text-slate-400" style={{ color: settings.color2 }} />
            </div>
            <div className="text-white font-semibold">
              Figure {currentFigureIndex + 1} of {getFigures().length}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white">
              <Timer className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="font-mono text-lg">{formatTime(timer)}</span>
                <span className="text-xs text-slate-400">Фигура</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white bg-slate-700 px-4 py-2 rounded-lg">
              <Timer className="w-5 h-5 text-green-400" />
              <div className="flex flex-col">
                <span className="font-mono text-lg text-green-400">{getRemainingTime()}</span>
                <span className="text-xs text-slate-400">Осталось</span>
              </div>
            </div>
            <Button
              onClick={endSession}
              variant="outline"
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              End Session (ESC)
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={1080}
            height={810}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className="rounded-2xl shadow-2xl"
            style={{ 
              cursor: 'none',
              backgroundColor: settings?.backgroundColor === 'black' ? '#000000' : '#ffffff'
            }}
          />

          {showInstructions && (
            <div className="absolute inset-0 bg-black bg-opacity-80 rounded-2xl flex items-center justify-center">
              <div className="text-center text-white space-y-6 p-8 max-w-md">
                <Eye className="w-16 h-16 mx-auto" />
                <h2 className="text-3xl font-bold">How to Play</h2>
                <div className="space-y-4 text-left">
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">1️⃣</span>
                    <span>Put on your anaglyph glasses (colored lenses)</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">2️⃣</span>
                    <span>One eye will see the figure, the other will see the tracing circle</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">3️⃣</span>
                    <span>Trace the figure with the colored circle by holding mouse button</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">4️⃣</span>
                    <span>After tracing, remove glasses to see accuracy</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">5️⃣</span>
                    <span>Press SPACE for next figure, ESC to end session</span>
                  </p>
                </div>
                <Button
                  onClick={() => setShowInstructions(false)}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Start (Press SPACE)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Постоянная подсказка во время обводки */}
        {!showInstructions && !showResult && (
          <div 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-4 max-w-2xl w-full"
            style={{
              animation: 'pulse 2s infinite'
            }}
          >
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.85; }
              }
            `}</style>
            <p className="text-center text-white text-xl font-semibold">
              ⌨️ Когда закончите обводить, нажмите <span className="bg-white text-blue-600 px-3 py-1 rounded-lg font-bold mx-2">ПРОБЕЛ</span>
            </p>
          </div>
        )}

        {showResult && (
          <div 
            className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl shadow-2xl p-6 max-w-3xl w-full"
            style={{
              animation: 'slideUp 0.4s ease-out'
            }}
          >
            <style>{`
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
              }
            `}</style>
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 text-white">
                  <h2 className="text-2xl font-bold mb-2">Фигура завершена!</h2>
                  <p className="text-lg">Время: {formatTime(timer)}</p>
                  <p className="text-slate-300 mt-1">
                    Обе линии показаны одним цветом для сравнения
                  </p>
                </div>
                <Button
                  onClick={nextFigure}
                  className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex-shrink-0"
                >
                  {currentFigureIndex < getFigures().length - 1 ? 'Далее' : 'Результаты'}
                </Button>
              </div>
              
              <div 
                className="bg-blue-900 bg-opacity-50 border-2 border-blue-400 rounded-xl p-4 text-center"
                style={{ animation: 'pulse 2s infinite' }}
              >
                <p className="text-blue-200 text-lg font-semibold">
                  ⌨️ Нажмите <span className="bg-blue-600 px-3 py-1 rounded mx-2">ПРОБЕЛ</span> для перехода к следующей фигуре
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;
