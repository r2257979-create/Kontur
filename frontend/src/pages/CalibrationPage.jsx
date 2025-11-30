import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Eye, Settings } from 'lucide-react';

const CalibrationPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  
  // RGB компоненты для каждого цвета
  const [color1RGB, setColor1RGB] = useState({ r: 255, g: 0, b: 0 });
  const [color2RGB, setColor2RGB] = useState({ r: 0, g: 255, b: 255 });
  const [backgroundColor, setBackgroundColor] = useState('white');

  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (!savedSettings) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(savedSettings);
    setSettings(parsed);
    
    // Преобразуем hex в RGB
    setColor1RGB(hexToRgb(parsed.color1));
    setColor2RGB(hexToRgb(parsed.color2));
    
    // Загружаем фон если есть
    if (parsed.backgroundColor) {
      setBackgroundColor(parsed.backgroundColor);
    }
  }, [navigate]);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 0, b: 0 };
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  };

  const handleColor1Change = (component, value) => {
    setColor1RGB(prev => ({ ...prev, [component]: value[0] }));
  };

  const handleColor2Change = (component, value) => {
    setColor2RGB(prev => ({ ...prev, [component]: value[0] }));
  };

  const handleContinue = () => {
    const finalColor1 = rgbToHex(color1RGB.r, color1RGB.g, color1RGB.b);
    const finalColor2 = rgbToHex(color2RGB.r, color2RGB.g, color2RGB.b);
    
    const updatedSettings = {
      ...settings,
      color1: finalColor1,
      color2: finalColor2
    };
    
    // Сохраняем настройки для текущей игры
    localStorage.setItem('gameSettings', JSON.stringify(updatedSettings));
    
    // Сохраняем цвета как постоянные настройки для будущих запусков
    localStorage.setItem('savedColorSettings', JSON.stringify({
      color1: finalColor1,
      color2: finalColor2
    }));
    
    navigate('/game');
  };

  const color1Hex = rgbToHex(color1RGB.r, color1RGB.g, color1RGB.b);
  const color2Hex = rgbToHex(color2RGB.r, color2RGB.g, color2RGB.b);

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-2xl">
              <Settings className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Калибровка цветов
          </h1>
          <p className="text-lg text-slate-600">
            Наденьте анаглифные очки и настройте цвета так, чтобы каждый глаз видел только свой элемент
          </p>
        </div>

        {/* Тестовый экран */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Тестовый экран</CardTitle>
            <CardDescription>
              Через очки: левый глаз должен видеть только КРУГ, правый - только ТОЧКУ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-xl p-8 flex items-center justify-center min-h-[400px] relative">
              {/* Круг (Цвет 1 - для левого глаза) */}
              <svg width="300" height="300" className="absolute">
                <circle 
                  cx="150" 
                  cy="150" 
                  r="120" 
                  fill="none" 
                  stroke={color1Hex}
                  strokeWidth="4"
                />
              </svg>
              
              {/* Точка/кружок (Цвет 2 - для правого глаза) */}
              <div 
                className="w-6 h-6 rounded-full absolute"
                style={{ 
                  backgroundColor: color2Hex,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
              
              {/* Дополнительная тестовая фигура - квадрат */}
              <svg width="200" height="200" className="absolute" style={{ left: '60%', top: '20%' }}>
                <rect 
                  x="0" 
                  y="0" 
                  width="150" 
                  height="150" 
                  fill="none" 
                  stroke={color1Hex}
                  strokeWidth="3"
                />
              </svg>
              
              {/* Дополнительный кружок */}
              <div 
                className="w-5 h-5 rounded-full absolute"
                style={{ 
                  backgroundColor: color2Hex,
                  top: '30%',
                  left: '70%'
                }}
              />
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Инструкция:</strong> Наденьте очки. Если вы видите оба цвета одним глазом, 
                отрегулируйте ползунки ниже, пока каждый глаз не будет видеть только свой элемент.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Настройка Цвета 1 (Левый глаз) */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full border-4 border-gray-300"
                style={{ backgroundColor: color1Hex }}
              />
              <div>
                <CardTitle>Цвет 1 - Фигура (Левый глаз)</CardTitle>
                <CardDescription>Настройте, чтобы левый глаз видел только фигуру</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-red-600 font-semibold">Красный (R)</Label>
                <span className="text-lg font-mono font-bold">{color1RGB.r}</span>
              </div>
              <Slider
                value={[color1RGB.r]}
                onValueChange={(val) => handleColor1Change('r', val)}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-green-600 font-semibold">Зелёный (G)</Label>
                <span className="text-lg font-mono font-bold">{color1RGB.g}</span>
              </div>
              <Slider
                value={[color1RGB.g]}
                onValueChange={(val) => handleColor1Change('g', val)}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-blue-600 font-semibold">Синий (B)</Label>
                <span className="text-lg font-mono font-bold">{color1RGB.b}</span>
              </div>
              <Slider
                value={[color1RGB.b]}
                onValueChange={(val) => handleColor1Change('b', val)}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            <div className="p-4 bg-slate-100 rounded-lg text-center">
              <p className="text-sm text-slate-600 mb-2">Текущий цвет (HEX)</p>
              <p className="text-2xl font-mono font-bold" style={{ color: color1Hex }}>
                {color1Hex}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Настройка Цвета 2 (Правый глаз) */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full border-4 border-gray-300"
                style={{ backgroundColor: color2Hex }}
              />
              <div>
                <CardTitle>Цвет 2 - Кружок обводки (Правый глаз)</CardTitle>
                <CardDescription>Настройте, чтобы правый глаз видел только кружок</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-red-600 font-semibold">Красный (R)</Label>
                <span className="text-lg font-mono font-bold">{color2RGB.r}</span>
              </div>
              <Slider
                value={[color2RGB.r]}
                onValueChange={(val) => handleColor2Change('r', val)}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-green-600 font-semibold">Зелёный (G)</Label>
                <span className="text-lg font-mono font-bold">{color2RGB.g}</span>
              </div>
              <Slider
                value={[color2RGB.g]}
                onValueChange={(val) => handleColor2Change('g', val)}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-blue-600 font-semibold">Синий (B)</Label>
                <span className="text-lg font-mono font-bold">{color2RGB.b}</span>
              </div>
              <Slider
                value={[color2RGB.b]}
                onValueChange={(val) => handleColor2Change('b', val)}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            <div className="p-4 bg-slate-100 rounded-lg text-center">
              <p className="text-sm text-slate-600 mb-2">Текущий цвет (HEX)</p>
              <p className="text-2xl font-mono font-bold" style={{ color: color2Hex }}>
                {color2Hex}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Кнопки */}
        <div className="flex gap-4 justify-center pb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="px-8 py-6 text-lg"
          >
            Назад к настройкам
          </Button>
          <Button
            onClick={handleContinue}
            className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Eye className="w-5 h-5 mr-2" />
            Начать тренировку
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalibrationPage;
