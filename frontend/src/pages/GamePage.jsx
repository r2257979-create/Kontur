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
    const baseCenterX = 540;
    const baseCenterY = 405;
    const size = 180;
    
    // Случайное смещение ±10% от центра (генерируется один раз для каждой фигуры)
    if (!figure.offsetX) {
      figure.offsetX = (Math.random() - 0.5) * 2 * baseCenterX * 0.1;
      figure.offsetY = (Math.random() - 0.5) * 2 * baseCenterY * 0.1;
    }
    
    const centerX = baseCenterX + figure.offsetX;
    const centerY = baseCenterY + figure.offsetY;

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
      case 'rectangle':
        ctx.rect(centerX - size * 1.3, centerY - size * 0.7, size * 2.6, size * 1.4);
        break;
      case 'oval':
        ctx.ellipse(centerX, centerY, size * 1.3, size * 0.7, 0, 0, 2 * Math.PI);
        break;
      case 'diamond':
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size, centerY);
        ctx.lineTo(centerX, centerY + size);
        ctx.lineTo(centerX - size, centerY);
        ctx.closePath();
        break;
      case 'star5':
        drawStar(ctx, centerX, centerY, 5, size, size / 2);
        break;
      case 'star4':
        drawStar(ctx, centerX, centerY, 4, size, size / 2);
        break;
      case 'star6':
        drawStar(ctx, centerX, centerY, 6, size, size / 2);
        break;
      case 'star8':
        drawStar(ctx, centerX, centerY, 8, size, size / 2);
        break;
      case 'heart':
        drawHeart(ctx, centerX, centerY, size);
        break;
      case 'pentagon':
        drawPolygon(ctx, centerX, centerY, 5, size);
        break;
      case 'hexagon':
        drawPolygon(ctx, centerX, centerY, 6, size);
        break;
      case 'octagon':
        drawPolygon(ctx, centerX, centerY, 8, size);
        break;
      case 'semicircle':
        ctx.arc(centerX, centerY, size, 0, Math.PI);
        ctx.lineTo(centerX - size, centerY);
        break;
      case 'quartercircle':
        ctx.arc(centerX, centerY, size, 0, Math.PI / 2);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        break;
      case 'cross':
        drawCross(ctx, centerX, centerY, size);
        break;
      case 'plus':
        drawPlus(ctx, centerX, centerY, size);
        break;
      case 'arrowup':
        drawArrowUp(ctx, centerX, centerY, size);
        break;
      case 'arrowright':
        drawArrowRight(ctx, centerX, centerY, size);
        break;
      case 'arrowdown':
        drawArrowDown(ctx, centerX, centerY, size);
        break;
      case 'arrowleft':
        drawArrowLeft(ctx, centerX, centerY, size);
        break;
      case 'parallelogram':
        drawParallelogram(ctx, centerX, centerY, size);
        break;
      case 'trapezoid':
        drawTrapezoid(ctx, centerX, centerY, size);
        break;
      case 'rightTriangle':
        drawRightTriangle(ctx, centerX, centerY, size);
        break;
      case 'circles2':
        drawCircles2(ctx, centerX, centerY, size);
        break;
      case 'circles3':
        drawCircles3(ctx, centerX, centerY, size);
        break;
      case 'squares2':
        drawSquares2(ctx, centerX, centerY, size);
        break;
      case 'triangles2':
        drawTriangles2(ctx, centerX, centerY, size);
        break;
      case 'crescent':
        drawCrescent(ctx, centerX, centerY, size);
        break;
      case 'drop':
        drawDrop(ctx, centerX, centerY, size);
        break;
      case 'eight':
        drawEight(ctx, centerX, centerY, size);
        break;
      case 'infinity':
        drawInfinity(ctx, centerX, centerY, size);
        break;
      case 'zigzag':
        drawZigzag(ctx, centerX, centerY, size);
        break;
      case 'wave':
        drawWave(ctx, centerX, centerY, size);
        break;
      case 'sine':
        drawSine(ctx, centerX, centerY, size);
        break;
      case 'spiralSquare':
        drawSpiralSquare(ctx, centerX, centerY, size);
        break;
      case 'spiralRound':
        drawSpiralRound(ctx, centerX, centerY, size);
        break;
      case 'crossX':
        drawCrossX(ctx, centerX, centerY, size);
        break;
      case 'lightning':
        drawLightning(ctx, centerX, centerY, size);
        break;
      case 'cloud':
        drawCloud(ctx, centerX, centerY, size);
        break;
      case 'arch':
        drawArch(ctx, centerX, centerY, size);
        break;
      case 'letterL':
        drawLetterL(ctx, centerX, centerY, size);
        break;
      case 'letterT':
        drawLetterT(ctx, centerX, centerY, size);
        break;
      case 'letterH':
        drawLetterH(ctx, centerX, centerY, size);
        break;
      case 'maze1':
        drawMaze1(ctx, centerX, centerY, size);
        break;
      case 'maze2':
        drawMaze2(ctx, centerX, centerY, size);
        break;
      case 'maze3':
        drawMaze3(ctx, centerX, centerY, size);
        break;
      case 'grid':
        drawGrid(ctx, centerX, centerY, size);
        break;
      case 'flower':
        drawFlower(ctx, centerX, centerY, size);
        break;
      case 'fish':
        drawFish(ctx, centerX, centerY, size);
        break;
      case 'tree':
        drawTree(ctx, centerX, centerY, size);
        break;
      case 'car':
        drawCar(ctx, centerX, centerY, size);
        break;
      case 'house':
        drawHouse(ctx, centerX, centerY, size);
        break;
      case 'dog':
        drawDog(ctx, centerX, centerY, size);
        break;
      case 'horse':
        drawHorse(ctx, centerX, centerY, size);
        break;
      case 'bear':
        drawBear(ctx, centerX, centerY, size);
        break;
      case 'chicken':
        drawChicken(ctx, centerX, centerY, size);
        break;
      case 'boat':
        drawBoat(ctx, centerX, centerY, size);
        break;
      case 'cow':
        drawCow(ctx, centerX, centerY, size);
        break;
      case 'kangaroo':
        drawKangaroo(ctx, centerX, centerY, size);
        break;
      case 'peppa':
        drawPeppa(ctx, centerX, centerY, size);
        break;
      case 'rabbit':
        drawRabbit(ctx, centerX, centerY, size);
        break;
      case 'teddy':
        drawTeddy(ctx, centerX, centerY, size);
        break;
      case 'elephant':
        drawElephant(ctx, centerX, centerY, size);
        break;
      case 'butterfly':
        drawButterfly(ctx, centerX, centerY, size);
        break;
      case 'snail':
        drawSnail(ctx, centerX, centerY, size);
        break;
      case 'apple':
        drawApple(ctx, centerX, centerY, size);
        break;
      case 'mushroom':
        drawMushroom(ctx, centerX, centerY, size);
        break;
      case 'cup':
        drawCup(ctx, centerX, centerY, size);
        break;
      case 'cat':
        drawCat(ctx, centerX, centerY, size);
        break;
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
    // Основание дома
    ctx.rect(cx - size * 0.6, cy, size * 1.2, size * 0.8);
    // Крыша
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.8, cy);
    ctx.lineTo(cx - size * 0.8, cy);
    ctx.closePath();
    // Дверь
    ctx.moveTo(cx - size * 0.15, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.15, cy + size * 0.8);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.8);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.3);
    ctx.closePath();
    // Окно
    ctx.rect(cx + size * 0.25, cy + size * 0.3, size * 0.25, size * 0.25);
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

  const drawFish = (ctx, cx, cy, size) => {
    // Тело рыбы
    ctx.moveTo(cx - size * 0.8, cy);
    ctx.quadraticCurveTo(cx - size * 0.4, cy - size * 0.5, cx + size * 0.3, cy);
    ctx.quadraticCurveTo(cx - size * 0.4, cy + size * 0.5, cx - size * 0.8, cy);
    // Хвост
    ctx.moveTo(cx + size * 0.3, cy - size * 0.4);
    ctx.lineTo(cx + size * 0.8, cy);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.4);
    // Плавник
    ctx.moveTo(cx - size * 0.2, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.6);
    ctx.lineTo(cx, cy - size * 0.4);
    // Глаз
    ctx.moveTo(cx - size * 0.42, cy - size * 0.15);
    ctx.arc(cx - size * 0.45, cy - size * 0.15, size * 0.08, 0, 2 * Math.PI);
  };

  const drawTree = (ctx, cx, cy, size) => {
    // Ствол
    ctx.moveTo(cx - size * 0.15, cy + size * 0.8);
    ctx.lineTo(cx - size * 0.15, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.8);
    ctx.closePath();
    // Крона - три круга
    ctx.moveTo(cx + size * 0.6, cy);
    ctx.arc(cx, cy, size * 0.6, 0, 2 * Math.PI);
    ctx.moveTo(cx - size * 0.2, cy - size * 0.6);
    ctx.arc(cx - size * 0.5, cy - size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.7, cy - size * 0.6);
    ctx.arc(cx + size * 0.5, cy - size * 0.3, size * 0.4, 0, 2 * Math.PI);
  };

  const drawCar = (ctx, cx, cy, size) => {
    // Кузов
    ctx.moveTo(cx - size * 0.8, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.6, cy - size * 0.1);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.6, cy - size * 0.1);
    ctx.lineTo(cx + size * 0.8, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.8, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.8, cy + size * 0.5);
    ctx.closePath();
    // Окна
    ctx.moveTo(cx - size * 0.5, cy - size * 0.05);
    ctx.lineTo(cx - size * 0.35, cy - size * 0.25);
    ctx.lineTo(cx - size * 0.05, cy - size * 0.25);
    ctx.lineTo(cx - size * 0.05, cy - size * 0.05);
    ctx.closePath();
    ctx.moveTo(cx + size * 0.05, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.05, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.35, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.05);
    ctx.closePath();
    // Колеса
    ctx.moveTo(cx - size * 0.45, cy + size * 0.5);
    ctx.arc(cx - size * 0.5, cy + size * 0.5, size * 0.2, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.65, cy + size * 0.5);
    ctx.arc(cx + size * 0.5, cy + size * 0.5, size * 0.2, 0, 2 * Math.PI);
  };

  const drawPolygon = (ctx, cx, cy, sides, size) => {
    const angle = (2 * Math.PI) / sides;
    ctx.moveTo(cx + size * Math.cos(0), cy + size * Math.sin(0));
    for (let i = 1; i <= sides; i++) {
      ctx.lineTo(cx + size * Math.cos(angle * i), cy + size * Math.sin(angle * i));
    }
    ctx.closePath();
  };

  const drawCross = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.8, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.8);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.8);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.8, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.8, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.8);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.8);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.8, cy + size * 0.3);
    ctx.closePath();
  };

  const drawPlus = (ctx, cx, cy, size) => {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
  };

  const drawArrowUp = (ctx, cx, cy, size) => {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.2, cy + size);
    ctx.lineTo(cx - size * 0.2, cy + size);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.5, cy - size * 0.3);
    ctx.closePath();
  };

  const drawArrowRight = (ctx, cx, cy, size) => {
    ctx.moveTo(cx + size, cy);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.2);
    ctx.lineTo(cx - size, cy - size * 0.2);
    ctx.lineTo(cx - size, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.5);
    ctx.closePath();
  };

  const drawArrowDown = (ctx, cx, cy, size) => {
    ctx.moveTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.5, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.2, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.2, cy - size);
    ctx.lineTo(cx + size * 0.2, cy - size);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.3);
    ctx.closePath();
  };

  const drawArrowLeft = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.2);
    ctx.lineTo(cx + size, cy + size * 0.2);
    ctx.lineTo(cx + size, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.5);
    ctx.closePath();
  };

  const drawParallelogram = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.8, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.4, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.8, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.5);
    ctx.closePath();
  };

  const drawTrapezoid = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.5, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.6);
    ctx.lineTo(cx + size, cy + size * 0.6);
    ctx.lineTo(cx - size, cy + size * 0.6);
    ctx.closePath();
  };

  const drawRightTriangle = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy + size);
    ctx.lineTo(cx + size, cy + size);
    ctx.lineTo(cx + size, cy - size);
    ctx.closePath();
  };

  const drawCircles2 = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size * 0.8, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.5, cy);
    ctx.arc(cx, cy, size * 0.5, 0, 2 * Math.PI);
  };

  const drawCircles3 = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.65, cy);
    ctx.arc(cx, cy, size * 0.65, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.3, cy);
    ctx.arc(cx, cy, size * 0.3, 0, 2 * Math.PI);
  };

  const drawSquares2 = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy - size, size * 2, size * 2);
    ctx.rect(cx - size * 0.6, cy - size * 0.6, size * 1.2, size * 1.2);
  };

  const drawTriangles2 = (ctx, cx, cy, size) => {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy + size);
    ctx.lineTo(cx - size, cy + size);
    ctx.closePath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.5, cy + size * 0.5);
    ctx.closePath();
  };

  const drawCrescent = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.3, cy - size * 0.6);
    ctx.arc(cx + size * 0.3, cy, size * 0.7, 0, 2 * Math.PI, false);
  };

  const drawDrop = (ctx, cx, cy, size) => {
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size * 0.7, cy - size * 0.3, cx + size * 0.5, cy + size * 0.3);
    ctx.quadraticCurveTo(cx + size * 0.3, cy + size * 0.7, cx, cy + size);
    ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.7, cx - size * 0.5, cy + size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.7, cy - size * 0.3, cx, cy - size);
  };

  const drawEight = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy - size * 0.4, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.5, cy + size * 0.5);
    ctx.arc(cx, cy + size * 0.5, size * 0.5, 0, 2 * Math.PI);
  };

  const drawInfinity = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.5, cy);
    ctx.bezierCurveTo(cx - size * 0.5, cy - size * 0.5, cx - size * 0.1, cy - size * 0.5, cx, cy);
    ctx.bezierCurveTo(cx + size * 0.1, cy + size * 0.5, cx + size * 0.5, cy + size * 0.5, cx + size * 0.5, cy);
    ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.5, cx + size * 0.1, cy - size * 0.5, cx, cy);
    ctx.bezierCurveTo(cx - size * 0.1, cy + size * 0.5, cx - size * 0.5, cy + size * 0.5, cx - size * 0.5, cy);
  };

  const drawZigzag = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx + size, cy - size * 0.5);
  };

  const drawWave = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy);
    ctx.quadraticCurveTo(cx - size * 0.75, cy - size * 0.5, cx - size * 0.5, cy);
    ctx.quadraticCurveTo(cx - size * 0.25, cy + size * 0.5, cx, cy);
    ctx.quadraticCurveTo(cx + size * 0.25, cy - size * 0.5, cx + size * 0.5, cy);
    ctx.quadraticCurveTo(cx + size * 0.75, cy + size * 0.5, cx + size, cy);
  };

  const drawSine = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy);
    for (let i = 0; i <= 100; i++) {
      const x = cx - size + (i / 50) * size;
      const y = cy + Math.sin((i / 100) * Math.PI * 4) * size * 0.5;
      ctx.lineTo(x, y);
    }
  };

  const drawSpiralSquare = (ctx, cx, cy, size) => {
    let currentSize = size;
    let x = cx + size;
    let y = cy + size;
    ctx.moveTo(x, y);
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(x - currentSize * 2, y);
      y -= currentSize * 2;
      currentSize *= 0.7;
      ctx.lineTo(x - currentSize * 2, y);
      x -= currentSize * 2;
      currentSize *= 0.7;
      ctx.lineTo(x, y + currentSize * 2);
      y += currentSize * 2;
      currentSize *= 0.7;
      ctx.lineTo(x + currentSize * 2, y);
      x += currentSize * 2;
      currentSize *= 0.7;
    }
  };

  const drawSpiralRound = (ctx, cx, cy, size) => {
    let angle = 0;
    let radius = 0;
    ctx.moveTo(cx, cy);
    for (let i = 0; i < 300; i++) {
      angle += 0.1;
      radius += size / 150;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.lineTo(x, y);
    }
  };

  const drawCrossX = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy + size);
    ctx.moveTo(cx + size, cy - size);
    ctx.lineTo(cx - size, cy + size);
  };

  const drawLightning = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.3, cy - size);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.3, cy + size);
    ctx.lineTo(cx, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.1, cy + size * 0.2);
    ctx.closePath();
  };

  const drawCloud = (ctx, cx, cy, size) => {
    ctx.arc(cx - size * 0.5, cy, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.1, cy - size * 0.4);
    ctx.arc(cx, cy - size * 0.3, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.9, cy);
    ctx.arc(cx + size * 0.5, cy, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.6, cy + size * 0.3);
    ctx.arc(cx + size * 0.2, cy + size * 0.3, size * 0.4, 0, 2 * Math.PI);
  };

  const drawArch = (ctx, cx, cy, size) => {
    ctx.arc(cx, cy, size, 0, Math.PI, true);
    ctx.lineTo(cx - size, cy + size * 0.3);
    ctx.lineTo(cx + size, cy + size * 0.3);
    ctx.lineTo(cx + size, cy);
  };

  const drawLetterL = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.5, cy - size);
    ctx.lineTo(cx - size * 0.5, cy + size);
    ctx.lineTo(cx + size * 0.5, cy + size);
  };

  const drawLetterT = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy - size);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
  };

  const drawLetterH = (ctx, cx, cy, size) => {
    ctx.moveTo(cx - size * 0.5, cy - size);
    ctx.lineTo(cx - size * 0.5, cy + size);
    ctx.moveTo(cx + size * 0.5, cy - size);
    ctx.lineTo(cx + size * 0.5, cy + size);
    ctx.moveTo(cx - size * 0.5, cy);
    ctx.lineTo(cx + size * 0.5, cy);
  };

  const drawMaze1 = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy - size, size * 2, size * 2);
    ctx.moveTo(cx - size, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.3);
    ctx.moveTo(cx + size * 0.5, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.5);
    ctx.moveTo(cx - size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx + size, cy + size * 0.5);
  };

  const drawMaze2 = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy - size, size * 2, size * 2);
    ctx.moveTo(cx - size, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.5);
    ctx.moveTo(cx + size * 0.3, cy - size);
    ctx.lineTo(cx + size * 0.3, cy);
    ctx.moveTo(cx - size * 0.3, cy);
    ctx.lineTo(cx + size * 0.7, cy);
    ctx.moveTo(cx + size * 0.7, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.7, cy + size);
    ctx.moveTo(cx - size * 0.7, cy + size * 0.5);
    ctx.lineTo(cx + size, cy + size * 0.5);
  };

  const drawMaze3 = (ctx, cx, cy, size) => {
    ctx.rect(cx - size, cy - size, size * 2, size * 2);
    ctx.moveTo(cx - size, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.6);
    ctx.moveTo(cx + size * 0.2, cy - size);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.2);
    ctx.moveTo(cx - size * 0.5, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.6, cy - size * 0.2);
    ctx.moveTo(cx + size * 0.6, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.6, cy + size * 0.3);
    ctx.moveTo(cx - size * 0.7, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.3);
    ctx.moveTo(cx + size * 0.2, cy);
    ctx.lineTo(cx + size * 0.2, cy + size);
    ctx.moveTo(cx - size * 0.3, cy + size * 0.7);
    ctx.lineTo(cx + size, cy + size * 0.7);
  };

  const drawGrid = (ctx, cx, cy, size) => {
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(cx + i * size * 0.6, cy - size);
      ctx.lineTo(cx + i * size * 0.6, cy + size);
    }
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(cx - size, cy + i * size * 0.6);
      ctx.lineTo(cx + size, cy + i * size * 0.6);
    }
  };

  const drawDog = (ctx, cx, cy, size) => {
    // Тело
    ctx.ellipse(cx, cy, size * 0.5, size * 0.35, 0, 0, 2 * Math.PI);
    // Голова
    ctx.moveTo(cx - size * 0.3, cy - size * 0.55);
    ctx.arc(cx - size * 0.5, cy - size * 0.5, size * 0.3, 0, 2 * Math.PI);
    // Уши
    ctx.moveTo(cx - size * 0.65, cy - size * 0.7);
    ctx.lineTo(cx - size * 0.75, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.6, cy - size * 0.5);
    ctx.moveTo(cx - size * 0.35, cy - size * 0.7);
    ctx.lineTo(cx - size * 0.25, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.4, cy - size * 0.5);
    // Морда
    ctx.moveTo(cx - size * 0.68, cy - size * 0.45);
    ctx.arc(cx - size * 0.72, cy - size * 0.45, size * 0.08, 0, 2 * Math.PI);
    // Ноги
    ctx.moveTo(cx - size * 0.3, cy + size * 0.35);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.6);
    ctx.moveTo(cx, cy + size * 0.35);
    ctx.lineTo(cx, cy + size * 0.6);
    ctx.moveTo(cx + size * 0.25, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.25, cy + size * 0.6);
    // Хвост
    ctx.moveTo(cx + size * 0.5, cy);
    ctx.quadraticCurveTo(cx + size * 0.7, cy - size * 0.2, cx + size * 0.6, cy - size * 0.4);
  };

  const drawHorse = (ctx, cx, cy, size) => {
    // Тело
    ctx.ellipse(cx, cy + size * 0.1, size * 0.6, size * 0.4, 0, 0, 2 * Math.PI);
    // Шея
    ctx.moveTo(cx - size * 0.5, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.7, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.5, cy - size * 0.7);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.3);
    // Голова
    ctx.moveTo(cx - size * 0.5, cy - size * 0.7);
    ctx.quadraticCurveTo(cx - size * 0.8, cy - size * 0.8, cx - size * 0.85, cy - size * 0.6);
    ctx.quadraticCurveTo(cx - size * 0.82, cy - size * 0.5, cx - size * 0.7, cy - size * 0.6);
    // Грива
    ctx.moveTo(cx - size * 0.65, cy - size * 0.7);
    ctx.lineTo(cx - size * 0.6, cy - size * 0.8);
    ctx.moveTo(cx - size * 0.6, cy - size * 0.65);
    ctx.lineTo(cx - size * 0.55, cy - size * 0.75);
    // Ноги
    ctx.moveTo(cx - size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.8);
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.lineTo(cx, cy + size * 0.8);
    ctx.moveTo(cx + size * 0.3, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.8);
    ctx.moveTo(cx + size * 0.5, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.8);
    // Хвост
    ctx.moveTo(cx + size * 0.6, cy);
    ctx.quadraticCurveTo(cx + size * 0.8, cy + size * 0.2, cx + size * 0.7, cy + size * 0.5);
  };

  const drawBear = (ctx, cx, cy, size) => {
    // Тело
    ctx.arc(cx, cy + size * 0.2, size * 0.5, 0, 2 * Math.PI);
    // Голова
    ctx.moveTo(cx + size * 0.4, cy - size * 0.5);
    ctx.arc(cx, cy - size * 0.5, size * 0.4, 0, 2 * Math.PI);
    // Уши
    ctx.moveTo(cx - size * 0.25, cy - size * 0.85);
    ctx.arc(cx - size * 0.3, cy - size * 0.8, size * 0.15, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.45, cy - size * 0.85);
    ctx.arc(cx + size * 0.3, cy - size * 0.8, size * 0.15, 0, 2 * Math.PI);
    // Морда
    ctx.moveTo(cx + size * 0.25, cy - size * 0.35);
    ctx.arc(cx, cy - size * 0.35, size * 0.25, 0, 2 * Math.PI);
    // Нос
    ctx.moveTo(cx + size * 0.08, cy - size * 0.4);
    ctx.arc(cx, cy - size * 0.4, size * 0.08, 0, 2 * Math.PI);
    // Глаза
    ctx.moveTo(cx - size * 0.12, cy - size * 0.55);
    ctx.arc(cx - size * 0.15, cy - size * 0.55, size * 0.06, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.18, cy - size * 0.55);
    ctx.arc(cx + size * 0.15, cy - size * 0.55, size * 0.06, 0, 2 * Math.PI);
    // Лапы
    ctx.moveTo(cx - size * 0.35, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.35, cy + size * 0.9);
    ctx.moveTo(cx + size * 0.35, cy + size * 0.7);
    ctx.lineTo(cx + size * 0.35, cy + size * 0.9);
  };

  const drawChicken = (ctx, cx, cy, size) => {
    // Тело
    ctx.arc(cx, cy + size * 0.1, size * 0.45, 0, 2 * Math.PI);
    // Голова
    ctx.moveTo(cx - size * 0.15, cy - size * 0.5);
    ctx.arc(cx - size * 0.3, cy - size * 0.5, size * 0.25, 0, 2 * Math.PI);
    // Клюв
    ctx.moveTo(cx - size * 0.55, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.7, cy - size * 0.45);
    ctx.lineTo(cx - size * 0.55, cy - size * 0.55);
    // Глаз
    ctx.moveTo(cx - size * 0.25, cy - size * 0.52);
    ctx.arc(cx - size * 0.28, cy - size * 0.52, size * 0.05, 0, 2 * Math.PI);
    // Гребешок
    ctx.moveTo(cx - size * 0.4, cy - size * 0.75);
    ctx.lineTo(cx - size * 0.35, cy - size * 0.8);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.75);
    ctx.lineTo(cx - size * 0.25, cy - size * 0.78);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.75);
    // Крыло
    ctx.moveTo(cx - size * 0.1, cy);
    ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.25, cx - size * 0.15, cy + size * 0.4);
    // Ноги
    ctx.moveTo(cx - size * 0.15, cy + size * 0.55);
    ctx.lineTo(cx - size * 0.15, cy + size * 0.75);
    ctx.moveTo(cx + size * 0.1, cy + size * 0.55);
    ctx.lineTo(cx + size * 0.1, cy + size * 0.75);
  };

  const drawBoat = (ctx, cx, cy, size) => {
    // Корпус лодки
    ctx.moveTo(cx - size * 0.8, cy + size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.7, cy + size * 0.5, cx, cy + size * 0.6);
    ctx.quadraticCurveTo(cx + size * 0.7, cy + size * 0.5, cx + size * 0.8, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.6, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.6, cy + size * 0.1);
    ctx.closePath();
    // Мачта
    ctx.moveTo(cx, cy + size * 0.1);
    ctx.lineTo(cx, cy - size * 0.7);
    // Парус
    ctx.moveTo(cx, cy - size * 0.7);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.3);
    ctx.lineTo(cx, cy + size * 0.1);
    ctx.closePath();
    // Волны
    ctx.moveTo(cx - size, cy + size * 0.7);
    ctx.quadraticCurveTo(cx - size * 0.75, cy + size * 0.65, cx - size * 0.5, cy + size * 0.7);
    ctx.quadraticCurveTo(cx - size * 0.25, cy + size * 0.75, cx, cy + size * 0.7);
    ctx.quadraticCurveTo(cx + size * 0.25, cy + size * 0.65, cx + size * 0.5, cy + size * 0.7);
    ctx.quadraticCurveTo(cx + size * 0.75, cy + size * 0.75, cx + size, cy + size * 0.7);
  };

  const drawCow = (ctx, cx, cy, size) => {
    // Тело
    ctx.ellipse(cx, cy, size * 0.6, size * 0.4, 0, 0, 2 * Math.PI);
    // Голова
    ctx.moveTo(cx - size * 0.4, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.7, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.85, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.85, cy - size * 0.1);
    ctx.lineTo(cx - size * 0.7, cy);
    ctx.lineTo(cx - size * 0.5, cy - size * 0.1);
    ctx.closePath();
    // Рога
    ctx.moveTo(cx - size * 0.75, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.8, cy - size * 0.75);
    ctx.moveTo(cx - size * 0.65, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.6, cy - size * 0.75);
    // Морда
    ctx.moveTo(cx - size * 0.75, cy - size * 0.15);
    ctx.arc(cx - size * 0.85, cy - size * 0.15, size * 0.12, 0, 2 * Math.PI);
    // Пятна
    ctx.moveTo(cx - size * 0.15, cy - size * 0.2);
    ctx.arc(cx - size * 0.2, cy - size * 0.2, size * 0.15, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.35, cy + size * 0.1);
    ctx.arc(cx + size * 0.3, cy + size * 0.1, size * 0.12, 0, 2 * Math.PI);
    // Ноги
    ctx.moveTo(cx - size * 0.35, cy + size * 0.4);
    ctx.lineTo(cx - size * 0.35, cy + size * 0.7);
    ctx.moveTo(cx - size * 0.1, cy + size * 0.4);
    ctx.lineTo(cx - size * 0.1, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.15, cy + size * 0.4);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.4, cy + size * 0.4);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.7);
    // Хвост
    ctx.moveTo(cx + size * 0.6, cy);
    ctx.quadraticCurveTo(cx + size * 0.7, cy + size * 0.2, cx + size * 0.65, cy + size * 0.35);
  };

  const drawKangaroo = (ctx, cx, cy, size) => {
    // Тело
    ctx.ellipse(cx, cy, size * 0.4, size * 0.5, 0, 0, 2 * Math.PI);
    // Голова
    ctx.moveTo(cx - size * 0.25, cy - size * 0.7);
    ctx.arc(cx - size * 0.35, cy - size * 0.7, size * 0.25, 0, 2 * Math.PI);
    // Уши
    ctx.moveTo(cx - size * 0.45, cy - size * 0.95);
    ctx.lineTo(cx - size * 0.5, cy - size * 1.1);
    ctx.lineTo(cx - size * 0.4, cy - size * 0.95);
    ctx.moveTo(cx - size * 0.25, cy - size * 0.95);
    ctx.lineTo(cx - size * 0.2, cy - size * 1.1);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.95);
    // Морда
    ctx.moveTo(cx - size * 0.5, cy - size * 0.65);
    ctx.arc(cx - size * 0.55, cy - size * 0.65, size * 0.08, 0, 2 * Math.PI);
    // Передние лапки
    ctx.moveTo(cx - size * 0.2, cy - size * 0.1);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.35, cy + size * 0.15);
    // Задние мощные ноги
    ctx.moveTo(cx + size * 0.1, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.8);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.85);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.75);
    ctx.moveTo(cx - size * 0.1, cy + size * 0.5);
    ctx.lineTo(cx, cy + size * 0.8);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.85);
    // Хвост
    ctx.moveTo(cx + size * 0.35, cy + size * 0.35);
    ctx.quadraticCurveTo(cx + size * 0.6, cy + size * 0.5, cx + size * 0.7, cy + size * 0.75);
  };

  const drawPeppa = (ctx, cx, cy, size) => {
    // Простая голова - круг
    ctx.arc(cx, cy - size * 0.5, size * 0.35, 0, 2 * Math.PI);
    // Пятачок овал
    ctx.moveTo(cx + size * 0.12, cy - size * 0.48);
    ctx.ellipse(cx, cy - size * 0.48, size * 0.12, size * 0.08, 0, 0, 2 * Math.PI);
    // Две ноздри - точки
    ctx.moveTo(cx - size * 0.05, cy - size * 0.48);
    ctx.arc(cx - size * 0.05, cy - size * 0.48, size * 0.02, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.07, cy - size * 0.48);
    ctx.arc(cx + size * 0.05, cy - size * 0.48, size * 0.02, 0, 2 * Math.PI);
    // Глаза - точки
    ctx.moveTo(cx - size * 0.12, cy - size * 0.6);
    ctx.arc(cx - size * 0.12, cy - size * 0.6, size * 0.04, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.14, cy - size * 0.6);
    ctx.arc(cx + size * 0.12, cy - size * 0.6, size * 0.04, 0, 2 * Math.PI);
    // Одно ушко торчит вверх
    ctx.moveTo(cx - size * 0.25, cy - size * 0.8);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.95);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.85);
    // Улыбка
    ctx.moveTo(cx - size * 0.15, cy - size * 0.38);
    ctx.quadraticCurveTo(cx, cy - size * 0.32, cx + size * 0.15, cy - size * 0.38);
    // Простое тело - прямоугольник
    ctx.rect(cx - size * 0.25, cy - size * 0.2, size * 0.5, size * 0.6);
    // Ручки - простые линии
    ctx.moveTo(cx - size * 0.25, cy - size * 0.05);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.1);
    ctx.moveTo(cx + size * 0.25, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.1);
    // Ножки с сапожками
    ctx.moveTo(cx - size * 0.12, cy + size * 0.4);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.65);
    ctx.lineTo(cx - size * 0.18, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.06, cy + size * 0.7);
    ctx.moveTo(cx + size * 0.12, cy + size * 0.4);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.65);
    ctx.lineTo(cx + size * 0.06, cy + size * 0.7);
    ctx.lineTo(cx + size * 0.18, cy + size * 0.7);
  };

  const drawRabbit = (ctx, cx, cy, size) => {
    // Большое круглое тело
    ctx.arc(cx, cy, size * 0.5, 0, 2 * Math.PI);
    // Круглая голова
    ctx.moveTo(cx + size * 0.3, cy - size * 0.6);
    ctx.arc(cx, cy - size * 0.6, size * 0.3, 0, 2 * Math.PI);
    // Два длинных уха - простые овалы
    ctx.moveTo(cx - size * 0.1, cy - size * 0.85);
    ctx.ellipse(cx - size * 0.15, cy - size * 1.0, size * 0.1, size * 0.25, -0.1, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.25, cy - size * 0.85);
    ctx.ellipse(cx + size * 0.15, cy - size * 1.0, size * 0.1, size * 0.25, 0.1, 0, 2 * Math.PI);
    // Мордочка - маленький круг
    ctx.moveTo(cx + size * 0.06, cy - size * 0.55);
    ctx.arc(cx, cy - size * 0.55, size * 0.06, 0, 2 * Math.PI);
    // Глазки - точки
    ctx.moveTo(cx - size * 0.08, cy - size * 0.68);
    ctx.arc(cx - size * 0.08, cy - size * 0.68, size * 0.03, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.11, cy - size * 0.68);
    ctx.arc(cx + size * 0.08, cy - size * 0.68, size * 0.03, 0, 2 * Math.PI);
    // Передние лапки - овалы
    ctx.moveTo(cx - size * 0.2, cy + size * 0.3);
    ctx.ellipse(cx - size * 0.25, cy + size * 0.4, size * 0.12, size * 0.18, 0, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.35, cy + size * 0.3);
    ctx.ellipse(cx + size * 0.25, cy + size * 0.4, size * 0.12, size * 0.18, 0, 0, 2 * Math.PI);
    // Задние большие лапы
    ctx.moveTo(cx + size * 0.52, cy + size * 0.6);
    ctx.ellipse(cx + size * 0.42, cy + size * 0.65, size * 0.18, size * 0.12, 0, 0, 2 * Math.PI);
    // Хвостик - маленький пушистый круг
    ctx.moveTo(cx + size * 0.55, cy + size * 0.05);
    ctx.arc(cx + size * 0.52, cy + size * 0.05, size * 0.08, 0, 2 * Math.PI);
  };

  const drawTeddy = (ctx, cx, cy, size) => {
    // Большое круглое тело
    ctx.arc(cx, cy, size * 0.45, 0, 2 * Math.PI);
    // Круглая голова
    ctx.moveTo(cx + size * 0.35, cy - size * 0.5);
    ctx.arc(cx, cy - size * 0.5, size * 0.35, 0, 2 * Math.PI);
    // Круглые ушки
    ctx.moveTo(cx - size * 0.2, cy - size * 0.8);
    ctx.arc(cx - size * 0.25, cy - size * 0.75, size * 0.12, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.37, cy - size * 0.8);
    ctx.arc(cx + size * 0.25, cy - size * 0.75, size * 0.12, 0, 2 * Math.PI);
    // Мордочка - овал
    ctx.moveTo(cx + size * 0.2, cy - size * 0.4);
    ctx.ellipse(cx, cy - size * 0.38, size * 0.2, size * 0.15, 0, 0, 2 * Math.PI);
    // Носик - черная точка
    ctx.moveTo(cx + size * 0.06, cy - size * 0.42);
    ctx.arc(cx, cy - size * 0.42, size * 0.06, 0, 2 * Math.PI);
    // Глазки - точки
    ctx.moveTo(cx - size * 0.1, cy - size * 0.55);
    ctx.arc(cx - size * 0.1, cy - size * 0.55, size * 0.04, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.14, cy - size * 0.55);
    ctx.arc(cx + size * 0.1, cy - size * 0.55, size * 0.04, 0, 2 * Math.PI);
    // Горшочек меда (необязательно, можно без него)
    ctx.moveTo(cx + size * 0.6, cy);
    ctx.lineTo(cx + size * 0.55, cy - size * 0.25);
    ctx.quadraticCurveTo(cx + size * 0.65, cy - size * 0.35, cx + size * 0.75, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.7, cy);
    ctx.closePath();
    // Лапки
    ctx.moveTo(cx - size * 0.3, cy + size * 0.45);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.65);
    ctx.moveTo(cx + size * 0.3, cy + size * 0.45);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.65);
  };

  const drawElephant = (ctx, cx, cy, size) => {
    // Тело
    ctx.ellipse(cx, cy, size * 0.6, size * 0.5, 0, 0, 2 * Math.PI);
    // Голова
    ctx.moveTo(cx - size * 0.4, cy - size * 0.6);
    ctx.arc(cx - size * 0.5, cy - size * 0.5, size * 0.35, 0, 2 * Math.PI);
    // Хобот длинный
    ctx.moveTo(cx - size * 0.8, cy - size * 0.5);
    ctx.quadraticCurveTo(cx - size * 1.0, cy - size * 0.3, cx - size * 1.05, cy);
    ctx.quadraticCurveTo(cx - size * 1.0, cy + size * 0.2, cx - size * 0.95, cy + size * 0.35);
    // Ухо большое
    ctx.moveTo(cx - size * 0.55, cy - size * 0.75);
    ctx.quadraticCurveTo(cx - size * 0.75, cy - size * 0.65, cx - size * 0.7, cy - size * 0.4);
    ctx.quadraticCurveTo(cx - size * 0.6, cy - size * 0.45, cx - size * 0.5, cy - size * 0.6);
    // Глаз
    ctx.moveTo(cx - size * 0.42, cy - size * 0.55);
    ctx.arc(cx - size * 0.45, cy - size * 0.55, size * 0.05, 0, 2 * Math.PI);
    // Ноги
    ctx.moveTo(cx - size * 0.35, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.35, cy + size * 0.8);
    ctx.moveTo(cx - size * 0.1, cy + size * 0.5);
    ctx.lineTo(cx - size * 0.1, cy + size * 0.8);
    ctx.moveTo(cx + size * 0.15, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.8);
    ctx.moveTo(cx + size * 0.4, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.8);
    // Хвост
    ctx.moveTo(cx + size * 0.6, cy);
    ctx.lineTo(cx + size * 0.75, cy + size * 0.3);
  };

  const drawButterfly = (ctx, cx, cy, size) => {
    // Тело
    ctx.moveTo(cx, cy - size * 0.6);
    ctx.lineTo(cx, cy + size * 0.6);
    // Левое верхнее крыло
    ctx.moveTo(cx, cy - size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.5, cy - size * 0.7, cx - size * 0.3, cy - size * 0.1);
    ctx.quadraticCurveTo(cx - size * 0.1, cy - size * 0.2, cx, cy - size * 0.3);
    // Правое верхнее крыло
    ctx.moveTo(cx, cy - size * 0.3);
    ctx.quadraticCurveTo(cx + size * 0.5, cy - size * 0.7, cx + size * 0.3, cy - size * 0.1);
    ctx.quadraticCurveTo(cx + size * 0.1, cy - size * 0.2, cx, cy - size * 0.3);
    // Левое нижнее крыло
    ctx.moveTo(cx, cy + size * 0.1);
    ctx.quadraticCurveTo(cx - size * 0.6, cy + size * 0.5, cx - size * 0.35, cy + size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.1, cy + size * 0.2, cx, cy + size * 0.1);
    // Правое нижнее крыло
    ctx.moveTo(cx, cy + size * 0.1);
    ctx.quadraticCurveTo(cx + size * 0.6, cy + size * 0.5, cx + size * 0.35, cy + size * 0.3);
    ctx.quadraticCurveTo(cx + size * 0.1, cy + size * 0.2, cx, cy + size * 0.1);
    // Усики
    ctx.moveTo(cx, cy - size * 0.6);
    ctx.lineTo(cx - size * 0.1, cy - size * 0.75);
    ctx.moveTo(cx, cy - size * 0.6);
    ctx.lineTo(cx + size * 0.1, cy - size * 0.75);
  };

  const drawSnail = (ctx, cx, cy, size) => {
    // Раковина - спираль
    ctx.arc(cx + size * 0.2, cy - size * 0.2, size * 0.4, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.35, cy - size * 0.2);
    ctx.arc(cx + size * 0.2, cy - size * 0.2, size * 0.25, 0, 2 * Math.PI);
    // Тело
    ctx.moveTo(cx - size * 0.5, cy + size * 0.3);
    ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.1, cx, cy + size * 0.15);
    ctx.lineTo(cx + size * 0.2, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.35);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.4);
    ctx.closePath();
    // Рожки
    ctx.moveTo(cx - size * 0.4, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.45, cy - size * 0.05);
    ctx.moveTo(cx - size * 0.3, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.05);
  };

  const drawApple = (ctx, cx, cy, size) => {
    // Яблоко
    ctx.moveTo(cx, cy - size * 0.7);
    ctx.quadraticCurveTo(cx - size * 0.8, cy - size * 0.5, cx - size * 0.7, cy + size * 0.2);
    ctx.quadraticCurveTo(cx - size * 0.4, cy + size * 0.7, cx, cy + size * 0.75);
    ctx.quadraticCurveTo(cx + size * 0.4, cy + size * 0.7, cx + size * 0.7, cy + size * 0.2);
    ctx.quadraticCurveTo(cx + size * 0.8, cy - size * 0.5, cx, cy - size * 0.7);
    // Черенок
    ctx.moveTo(cx, cy - size * 0.7);
    ctx.lineTo(cx + size * 0.05, cy - size * 0.85);
    // Листик
    ctx.moveTo(cx + size * 0.05, cy - size * 0.85);
    ctx.quadraticCurveTo(cx + size * 0.2, cy - size * 0.85, cx + size * 0.15, cy - size * 0.75);
  };

  const drawMushroom = (ctx, cx, cy, size) => {
    // Шляпка
    ctx.moveTo(cx - size * 0.6, cy - size * 0.2);
    ctx.quadraticCurveTo(cx - size * 0.7, cy - size * 0.7, cx, cy - size * 0.8);
    ctx.quadraticCurveTo(cx + size * 0.7, cy - size * 0.7, cx + size * 0.6, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.2);
    ctx.closePath();
    // Ножка
    ctx.rect(cx - size * 0.2, cy - size * 0.2, size * 0.4, size * 0.8);
    // Пятнышки на шляпке
    ctx.moveTo(cx - size * 0.25, cy - size * 0.5);
    ctx.arc(cx - size * 0.3, cy - size * 0.5, size * 0.08, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.2, cy - size * 0.55);
    ctx.arc(cx + size * 0.15, cy - size * 0.55, size * 0.07, 0, 2 * Math.PI);
    ctx.moveTo(cx + size * 0.05, cy - size * 0.65);
    ctx.arc(cx, cy - size * 0.65, size * 0.06, 0, 2 * Math.PI);
  };

  const drawCup = (ctx, cx, cy, size) => {
    // Чашка
    ctx.moveTo(cx - size * 0.5, cy - size * 0.3);
    ctx.lineTo(cx - size * 0.6, cy + size * 0.5);
    ctx.quadraticCurveTo(cx, cy + size * 0.6, cx + size * 0.6, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.3);
    ctx.closePath();
    // Ручка
    ctx.moveTo(cx + size * 0.5, cy);
    ctx.quadraticCurveTo(cx + size * 0.85, cy + size * 0.1, cx + size * 0.65, cy + size * 0.3);
    // Блюдце
    ctx.moveTo(cx - size * 0.7, cy + size * 0.6);
    ctx.lineTo(cx + size * 0.7, cy + size * 0.6);
    ctx.lineTo(cx + size * 0.6, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.6, cy + size * 0.7);
    ctx.closePath();
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
