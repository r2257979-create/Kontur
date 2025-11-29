import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { figures } from '../mock/mockData';
import { Timer, Eye, Square } from 'lucide-react';

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
      drawFigure();
    }
  }, [settings, currentFigureIndex, showResult, showInstructions]);

  const drawFigure = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const figure = getFigures()[currentFigureIndex];
    if (!figure) return;

    ctx.strokeStyle = settings.color1;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    drawShape(ctx, figure);
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
        ctx.font = `${size * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(figure.shape, centerX, centerY);
        return;
      case 'number':
        ctx.font = `${size * 2}px Arial`;
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
    if (!isTracing || showResult || showInstructions) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTracedPath((prev) => [...prev, { x, y }]);

    ctx.fillStyle = settings.color2;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();

    if (tracedPath.length > 0) {
      ctx.strokeStyle = settings.color2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tracedPath[tracedPath.length - 1].x, tracedPath[tracedPath.length - 1].y);
      ctx.lineTo(x, y);
      ctx.stroke();
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

  const drawResultOverlay = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = settings.color1;
    ctx.lineWidth = 3;
    const figure = getFigures()[currentFigureIndex];
    drawShape(ctx, figure);

    if (tracedPath.length > 1) {
      ctx.strokeStyle = settings.color2;
      ctx.lineWidth = 2;
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

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsTracing(false)}
            className="bg-white rounded-2xl shadow-2xl cursor-crosshair"
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
                    <span>Trace the figure you see with your mouse</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">3️⃣</span>
                    <span>After tracing, remove glasses to see accuracy</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">4️⃣</span>
                    <span>Press SPACE for next figure, ESC to end</span>
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

          {showResult && (
            <div className="absolute inset-0 bg-black bg-opacity-70 rounded-2xl flex items-center justify-center">
              <div className="text-center text-white space-y-6 p-8">
                <div className="bg-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold">Figure Completed!</h2>
                <p className="text-xl">Time: {formatTime(timer)}</p>
                <p className="text-lg text-slate-300">Remove your glasses to see how accurately you traced</p>
                <Button
                  onClick={nextFigure}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {currentFigureIndex < getFigures().length - 1 ? 'Next Figure (SPACE)' : 'View Results (SPACE)'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;