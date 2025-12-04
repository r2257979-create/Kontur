import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [figures, setFigures] = useState([]);
  const [showDrawing, setShowDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [newFigureName, setNewFigureName] = useState('');

  useEffect(() => {
    // Загружаем фигуры из mockData
    import('../mock/mockData').then(module => {
      setFigures(module.figures);
    });
  }, []);

  const generatePassword = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const getStoredPassword = () => {
    let password = localStorage.getItem('adminPassword');
    if (!password) {
      password = generatePassword();
      localStorage.setItem('adminPassword', password);
    }
    return password;
  };

  const handleSendPassword = async () => {
    const newPassword = generatePassword();
    localStorage.setItem('adminPassword', newPassword);
    
    try {
      const response = await fetch('/api/send-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        setMessage('Пароль отправлен на указанный электронный адрес');
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError('Ошибка отправки пароля');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    }
  };

  const handleLogin = () => {
    const storedPassword = getStoredPassword();
    if (passwordInput === storedPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Неверный пароль');
    }
  };

  const handleDeleteFigure = (index) => {
    const updatedFigures = figures.filter((_, i) => i !== index);
    setFigures(updatedFigures);
    // Сохраняем в localStorage
    localStorage.setItem('customFigures', JSON.stringify(updatedFigures));
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Рисуем на canvas
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentPath.length > 0) {
      const lastPoint = currentPath[currentPath.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (currentPath.length > 0) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath([]);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setPaths([]);
    setCurrentPath([]);
  };

  const undoLastPath = () => {
    if (paths.length > 0) {
      const newPaths = paths.slice(0, -1);
      setPaths(newPaths);
      
      // Перерисовываем canvas
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      newPaths.forEach(path => {
        ctx.beginPath();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (path.length > 0) {
          ctx.moveTo(path[0].x, path[0].y);
          path.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
      });
    }
  };

  const saveFigure = () => {
    if (paths.length === 0) {
      setError('Нарисуйте фигуру перед сохранением');
      return;
    }
    
    if (!newFigureName.trim()) {
      setError('Введите название фигуры');
      return;
    }

    const newFigure = {
      type: 'custom_' + Date.now(),
      shape: 'custom',
      name: newFigureName,
      paths: paths,
    };

    const updatedFigures = [...figures, newFigure];
    setFigures(updatedFigures);
    localStorage.setItem('customFigures', JSON.stringify(updatedFigures));
    
    setShowDrawing(false);
    clearCanvas();
    setNewFigureName('');
    setMessage('Фигура успешно добавлена');
    setTimeout(() => setMessage(''), 3000);
  };

  const renderFigureThumbnail = (figure) => {
    // Создаем миниатюру фигуры
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Рисуем упрощенную версию фигуры
    // Здесь можно вызвать соответствующую функцию рисования с маленьким size
    
    return canvas.toDataURL();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Настройки администратора</h2>
          
          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Введите пароль</label>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="6-значный пароль"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            
            <Button onClick={handleLogin} className="w-full">
              Войти
            </Button>
            
            <Button 
              onClick={handleSendPassword} 
              variant="outline" 
              className="w-full"
            >
              Выслать пароль на email
            </Button>
            
            <Button 
              onClick={() => navigate('/')} 
              variant="ghost" 
              className="w-full"
            >
              Назад
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showDrawing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
        <Card className="max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-bold mb-4">Нарисуйте новую фигуру</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Название фигуры</label>
            <Input
              value={newFigureName}
              onChange={(e) => setNewFigureName(e.target.value)}
              placeholder="Введите название"
            />
          </div>
          
          <div className="mb-4 border-2 border-gray-300 rounded">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="cursor-crosshair bg-white"
            />
          </div>
          
          <div className="flex gap-3">
            <Button onClick={saveFigure} className="flex-1">
              Сохранить фигуру
            </Button>
            <Button onClick={undoLastPath} variant="outline">
              Отменить последнюю линию
            </Button>
            <Button onClick={clearCanvas} variant="outline">
              Очистить всё
            </Button>
            <Button onClick={() => setShowDrawing(false)} variant="ghost">
              Отмена
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <Card className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Управление фигурами</h2>
          <div className="space-x-3">
            <Button onClick={() => setShowDrawing(true)}>
              Добавить фигуру
            </Button>
            <Button onClick={() => navigate('/')} variant="outline">
              Назад
            </Button>
          </div>
        </div>
        
        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            {message}
          </div>
        )}
        
        <div className="grid grid-cols-6 gap-3">
          {figures.map((figure, index) => (
            <Card key={index} className="p-3 hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-white border rounded mb-2 flex items-center justify-center relative">
                <div className="text-xs text-gray-600 text-center">{figure.name}</div>
                <button
                  onClick={() => handleDeleteFigure(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-center truncate">{figure.name}</div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminPanel;
