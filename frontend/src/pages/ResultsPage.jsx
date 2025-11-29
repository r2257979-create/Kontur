import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Trophy, Clock, Target, Eye } from 'lucide-react';

const ResultsPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const savedStats = localStorage.getItem('sessionStats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  const totalTime = stats.reduce((acc, stat) => acc + stat.time, 0);
  const avgTime = stats.length > 0 ? Math.round(totalTime / stats.length) : 0;
  const completedFigures = stats.filter((s) => s.completed).length;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNewSession = () => {
    localStorage.removeItem('sessionStats');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-3xl">
              <Trophy className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
            Session Complete!
          </h1>
          <p className="text-xl text-slate-600">Great job on completing your training session</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Figures Completed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-600">{completedFigures}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Total Time</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-purple-600">{formatTime(totalTime)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Average Time</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600">{formatTime(avgTime)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">
                        {stat.figure.type === 'letter' || stat.figure.type === 'number'
                          ? `${stat.figure.type}: ${stat.figure.shape}`
                          : stat.figure.type}
                      </p>
                      <p className="text-sm text-slate-500">Difficulty: {stat.figure.difficulty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Time</p>
                      <p className="font-mono font-semibold">{formatTime(stat.time)}</p>
                    </div>
                    {stat.completed && (
                      <div className="bg-green-100 px-4 py-2 rounded-lg">
                        <p className="text-green-700 font-semibold text-sm">Completed</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleNewSession}
            className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            <Eye className="w-5 h-5 mr-2" />
            Start New Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;