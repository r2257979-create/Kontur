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
  const [tracedPath, setTracedPath] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [timer, setTimer] = useState(0);
  const [sessionStats, setSessionStats] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (!savedSettings) {
      navigate('/');
      return;
    }
    setSettings(JSON.parse(savedSettings));
  }, [navigate]);

  useEffect(() => {
    if (!showResult && !showInstructions) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [showResult, showInstructions]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' && showResult) {
        e.preventDefault();
        nextFigure();
      } else if (e.key === 'Escape') {
        endSession();
      } else if (e.key === ' ' && showInstructions) {
        e.preventDefault();
        setShowInstructions(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResult, showInstructions]);

  useEffect(() => {
    if (settings && !showResult && !showInstructions) {
      drawScene();
    }
  }, [settings, currentFigureIndex, showResult, showInstructions, mousePos, tracedPath, isTracing]);

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

    // Draw the figure in Color 1
    ctx.strokeStyle = settings.color1;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawShape(ctx, figure);

    // Draw traced path in Color 2
    if (tracedPath.length > 1) {
      ctx.strokeStyle = settings.color2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tracedPath[0].x, tracedPath[0].y);
      for (let i = 1; i < tracedPath.length; i++) {
        ctx.lineTo(tracedPath[i].x, tracedPath[i].y);
      }
      ctx.stroke();
    }

    // Draw the tracing circle at mouse position (Color 2) - only when mouse is over canvas
    if (mousePos.x > 0 && mousePos.y > 0 && mousePos.x < canvas.width && mousePos.y < canvas.height) {
      ctx.fillStyle = settings.color2;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add a small white center for visibility
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawShape = (ctx, figure) => {
    const centerX = 400;
    const centerY = 300;
    const size = 150;

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

  const handleMouseDown = (e) => {
    if (showResult || showInstructions) return;
    setIsTracing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTracedPath([{ x, y }]);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    if (isTracing && !showResult && !showInstructions) {
      setTracedPath((prev) => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (!isTracing) return;
    setIsTracing(false);
    setShowResult(true);
    clearInterval(timerRef.current);

    const stats = {
      figure: getFigures()[currentFigureIndex],
      time: timer,
      completed: true
    };
    setSessionStats((prev) => [...prev, stats]);

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
    const ctx = canvas.getContext('2d');

    // Используем выбранный фон с прозрачностью для результата
    const bgColor = settings.backgroundColor === 'black' ? '#000000' : '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = settings.color1;
    ctx.lineWidth = 4;
    const figure = getFigures()[currentFigureIndex];
    drawShape(ctx, figure);

    if (tracedPath.length > 1) {
      ctx.strokeStyle = settings.color2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tracedPath[0].x, tracedPath[0].y);
      for (let i = 1; i < tracedPath.length; i++) {
        ctx.lineTo(tracedPath[i].x, tracedPath[i].y);
      }
      ctx.stroke();
    }
  };

  const nextFigure = () => {
    const figures = getFigures();
    if (currentFigureIndex < figures.length - 1) {
      setCurrentFigureIndex((prev) => prev + 1);
      setShowResult(false);
      setTracedPath([]);
      setTimer(0);
    } else {
      endSession();
    }
  };

  const endSession = () => {
    localStorage.setItem('sessionStats', JSON.stringify(sessionStats));
    navigate('/results');
  };

  const getFigures = () => {
    if (!settings) return [];
    return figures[settings.difficulty] || [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <span className="font-mono text-lg">{formatTime(timer)}</span>
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

        {showResult && (
          <div 
            className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
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
            `}</style>
            <div className="flex items-center gap-6">
              <div className="bg-green-500 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 text-white">
                <h2 className="text-2xl font-bold mb-2">Figure Completed!</h2>
                <p className="text-lg">Time: {formatTime(timer)}</p>
                <p className="text-slate-300 mt-1">Remove your glasses to see how accurately you traced</p>
              </div>
              <Button
                onClick={nextFigure}
                className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex-shrink-0"
              >
                {currentFigureIndex < getFigures().length - 1 ? 'Next (SPACE)' : 'Results (SPACE)'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;
