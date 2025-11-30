export const figures = {
  easy: [
    { type: 'circle', difficulty: 'easy', shape: 'circle', name: 'Круг' },
    { type: 'square', difficulty: 'easy', shape: 'square', name: 'Квадрат' },
    { type: 'triangle', difficulty: 'easy', shape: 'triangle', name: 'Треугольник' },
    { type: 'house', difficulty: 'easy', shape: 'house', name: 'Домик' },
    { type: 'sun', difficulty: 'easy', shape: 'sun', name: 'Солнце' },
    { type: 'flower', difficulty: 'easy', shape: 'flower', name: 'Цветок' },
    { type: 'ball', difficulty: 'easy', shape: 'ball', name: 'Мяч' }
  ],
  medium: [
    { type: 'cat', difficulty: 'medium', shape: 'cat', name: 'Кошка' },
    { type: 'fish', difficulty: 'medium', shape: 'fish', name: 'Рыбка' },
    { type: 'butterfly', difficulty: 'medium', shape: 'butterfly', name: 'Бабочка' },
    { type: 'car', difficulty: 'medium', shape: 'car', name: 'Машинка' },
    { type: 'tree', difficulty: 'medium', shape: 'tree', name: 'Дерево' },
    { type: 'cup', difficulty: 'medium', shape: 'cup', name: 'Чашка' },
    { type: 'teddy', difficulty: 'medium', shape: 'teddy', name: 'Мишка' },
    { type: 'maze_simple', difficulty: 'medium', shape: 'maze_simple', name: 'Простой лабиринт' }
  ],
  hard: [
    { type: 'dog', difficulty: 'hard', shape: 'dog', name: 'Собака' },
    { type: 'bird', difficulty: 'hard', shape: 'bird', name: 'Птица' },
    { type: 'spider', difficulty: 'hard', shape: 'spider', name: 'Паук' },
    { type: 'airplane', difficulty: 'hard', shape: 'airplane', name: 'Самолёт' },
    { type: 'mushroom', difficulty: 'hard', shape: 'mushroom', name: 'Гриб' },
    { type: 'rabbit', difficulty: 'hard', shape: 'rabbit', name: 'Кролик' },
    { type: 'snail', difficulty: 'hard', shape: 'snail', name: 'Улитка' },
    { type: 'maze_complex', difficulty: 'hard', shape: 'maze_complex', name: 'Сложный лабиринт' }
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