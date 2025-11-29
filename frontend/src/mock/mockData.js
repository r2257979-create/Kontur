export const figures = {
  easy: [
    { type: 'circle', difficulty: 'easy', shape: 'circle' },
    { type: 'square', difficulty: 'easy', shape: 'square' },
    { type: 'triangle', difficulty: 'easy', shape: 'triangle' },
    { type: 'number', difficulty: 'easy', shape: '1' },
    { type: 'number', difficulty: 'easy', shape: '2' }
  ],
  medium: [
    { type: 'star', difficulty: 'medium', shape: 'star' },
    { type: 'heart', difficulty: 'medium', shape: 'heart' },
    { type: 'letter', difficulty: 'medium', shape: 'A' },
    { type: 'letter', difficulty: 'medium', shape: 'B' },
    { type: 'number', difficulty: 'medium', shape: '5' },
    { type: 'number', difficulty: 'medium', shape: '8' }
  ],
  hard: [
    { type: 'star', difficulty: 'hard', shape: 'star' },
    { type: 'heart', difficulty: 'hard', shape: 'heart' },
    { type: 'letter', difficulty: 'hard', shape: 'S' },
    { type: 'letter', difficulty: 'hard', shape: 'R' },
    { type: 'number', difficulty: 'hard', shape: '3' },
    { type: 'number', difficulty: 'hard', shape: '6' },
    { type: 'letter', difficulty: 'hard', shape: 'M' },
    { type: 'number', difficulty: 'hard', shape: '9' }
  ]
};

export const mockSessionStats = {
  sessionId: '12345',
  date: new Date().toISOString(),
  settings: {
    color1: '#FF0000',
    color2: '#00FFFF',
    difficulty: 'easy'
  },
  figures: [
    { figure: 'circle', time: 45, accuracy: 85, completed: true },
    { figure: 'square', time: 38, accuracy: 92, completed: true },
    { figure: 'triangle', time: 52, accuracy: 78, completed: true }
  ],
  totalTime: 135,
  averageAccuracy: 85
};