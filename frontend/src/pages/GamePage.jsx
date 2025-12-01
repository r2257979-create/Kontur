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
    
    // Перемешиваем фигуры при первой загрузке
    const originalFigures = figures[parsed.difficulty] || [];
    const shuffled = shuffleArray([...originalFigures]);
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

  // Таймер для всей сессии - запускается один раз
  useEffect(() => {
    if (settings && !showInstructions && !sessionTimerRef.current) {
      console.log('Запуск таймера сессии на', settings.duration, 'минут');
      
      sessionTimerRef.current = setInterval(() => {
        setSessionTimer((prev) => {
          const newTime = prev + 1;
          const maxTime = (settings.duration || 10) * 60; // В секундах
          
          console.log('Таймер:', newTime, 'из', maxTime);
          
          if (newTime >= maxTime) {
            // Время вышло - завершаем сессию
            console.log('Время вышло! Завершаем сессию');
            clearInterval(sessionTimerRef.current);
            sessionTimerRef.current = null;
            endSession();
            return maxTime;
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      // НЕ очищаем таймер при каждом re-render, только при размонтировании
      if (!showInstructions) {
        return;
      }
      if (sessionTimerRef.current) {
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
    setShowResult(true);
    clearInterval(timerRef.current);

    const stats = {
      figure: getFigures()[currentFigureIndex],
      time: timer,
      completed: true
    };
    setSessionStats((prev) => [...prev, stats]);

    // Рисуем обе линии одним цветом
    drawResultOverlay();
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
    
    // Рисуем оригинальную фигуру
    const figure = getFigures()[currentFigureIndex];
    drawShape(ctx, figure);
    
    // Рисуем ВСЕ пути обводки игрока
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
  };

  const nextFigure = () => {
    const figures = getFigures();
    if (currentFigureIndex < figures.length - 1) {
      setCurrentFigureIndex((prev) => prev + 1);
      setShowResult(false);
      setTracedPath([]);
      setTimer(0);
      setWaitingForCompletion(false);
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

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
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

        {waitingForCompletion && !showResult && (
            <div 
              className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl shadow-2xl p-6 max-w-2xl w-full"
              style={{
                animation: 'slideUp 0.4s ease-out, pulse 2s infinite'
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
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.9; transform: scale(1.02); }
                }
              `}</style>
              <div className="text-center text-white space-y-4">
                <h2 className="text-3xl font-bold">Обводка завершена?</h2>
                <p className="text-xl">
                  Нажмите <span className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold mx-2">ПРОБЕЛ</span> чтобы увидеть результат
                </p>
              </div>
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
