import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Eye } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Red', value: '#FF0000' },
  { name: 'Blue', value: '#0000FF' },
  { name: 'Cyan', value: '#00FFFF' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Magenta', value: '#FF00FF' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Orange', value: '#FF8800' },
  { name: 'Purple', value: '#8800FF' }
];

const SetupPage = () => {
  const navigate = useNavigate();
  
  // Загружаем сохранённые настройки цветов или используем значения по умолчанию
  const getSavedColors = () => {
    const saved = localStorage.getItem('savedColorSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { 
        color1: parsed.color1, 
        color2: parsed.color2,
        backgroundColor: parsed.backgroundColor || 'white'
      };
    }
    return { color1: '#FF0000', color2: '#00FFFF', backgroundColor: 'white' };
  };
  
  const savedColors = getSavedColors();
  const [color1, setColor1] = useState(savedColors.color1);
  const [color2, setColor2] = useState(savedColors.color2);
  const [difficulty, setDifficulty] = useState('easy');
  
  // Загружаем сохранённую длительность или используем 10 минут по умолчанию
  const getSavedDuration = () => {
    const saved = localStorage.getItem('savedDuration');
    return saved ? parseInt(saved) : 10;
  };
  const [duration, setDuration] = useState(getSavedDuration());

  const handleStart = () => {
    const savedSettings = getSavedColors();
    localStorage.setItem('gameSettings', JSON.stringify({ 
      color1, 
      color2, 
      difficulty,
      backgroundColor: savedSettings.backgroundColor,
      duration: duration
    }));
    // Сохраняем длительность для будущих сессий
    localStorage.setItem('savedDuration', duration.toString());
    navigate('/calibration');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl">
              <Eye className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Kontur-2 Vision Training
          </CardTitle>
          <CardDescription className="text-lg">
            Configure your anaglyph color settings for strabismus treatment
          </CardDescription>
          {localStorage.getItem('savedColorSettings') && (
            <div className="mt-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ Используются ранее сохранённые настройки цветов
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Color 1 (Left Eye)</Label>
              <div className="flex gap-3 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setColor1(color.value)}
                    className={`w-16 h-16 rounded-xl border-4 transition-all duration-200 hover:scale-110 ${
                      color1 === color.value ? 'border-black scale-105 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="w-16 h-16 rounded-xl border-4 border-gray-300 cursor-pointer hover:scale-110 transition-all"
                  title="Custom color"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Color 2 (Right Eye)</Label>
              <div className="flex gap-3 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setColor2(color.value)}
                    className={`w-16 h-16 rounded-xl border-4 transition-all duration-200 hover:scale-110 ${
                      color2 === color.value ? 'border-black scale-105 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="w-16 h-16 rounded-xl border-4 border-gray-300 cursor-pointer hover:scale-110 transition-all"
                  title="Custom color"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Difficulty Level</Label>
              <div className="grid grid-cols-3 gap-4">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-4 px-6 rounded-xl font-semibold capitalize transition-all duration-200 ${
                      difficulty === level
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Длительность тренировки</Label>
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`py-4 px-4 rounded-xl font-semibold transition-all duration-200 ${
                      duration === mins
                        ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg scale-105'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {mins} мин
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500 text-center">
                Игра автоматически завершится через {duration} минут
              </p>
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-lg">Preview</h3>
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="text-center space-y-2">
                <div className="w-24 h-24 rounded-full mx-auto shadow-lg" style={{ backgroundColor: color1 }} />
                <p className="text-sm font-medium">Left Eye</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-24 h-24 rounded-full mx-auto shadow-lg" style={{ backgroundColor: color2 }} />
                <p className="text-sm font-medium">Right Eye</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleStart}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              Start Training Session
            </Button>
            
            {localStorage.getItem('savedColorSettings') && (
              <Button
                onClick={() => {
                  localStorage.removeItem('savedColorSettings');
                  setColor1('#FF0000');
                  setColor2('#00FFFF');
                }}
                variant="outline"
                className="w-full py-3 text-sm"
              >
                Сбросить сохранённые настройки цветов
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPage;