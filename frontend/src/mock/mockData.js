export const figures = {
  easy: [
    { type: 'circle', difficulty: 'easy', shape: 'circle', name: 'Круг' },
    { type: 'square', difficulty: 'easy', shape: 'square', name: 'Квадрат' },
    { type: 'triangle', difficulty: 'easy', shape: 'triangle', name: 'Треугольник' },
    { type: 'house', difficulty: 'easy', shape: 'house', name: 'Домик' },
    { type: 'sun', difficulty: 'easy', shape: 'sun', name: 'Солнце' },
    { type: 'flower', difficulty: 'easy', shape: 'flower', name: 'Цветок' },
    { type: 'ball', difficulty: 'easy', shape: 'ball', name: 'Мяч' },
    { type: 'apple', difficulty: 'easy', shape: 'apple', name: 'Яблоко' },
    { type: 'pear', difficulty: 'easy', shape: 'pear', name: 'Груша' },
    { type: 'star', difficulty: 'easy', shape: 'star', name: 'Звезда' }
  ],
  medium: [
    { type: 'cat', difficulty: 'medium', shape: 'cat', name: 'Кошка' },
    { type: 'fish', difficulty: 'medium', shape: 'fish', name: 'Рыбка' },
    { type: 'butterfly', difficulty: 'medium', shape: 'butterfly', name: 'Бабочка' },
    { type: 'car', difficulty: 'medium', shape: 'car', name: 'Машинка' },
    { type: 'tree', difficulty: 'medium', shape: 'tree', name: 'Дерево' },
    { type: 'cup', difficulty: 'medium', shape: 'cup', name: 'Чашка' },
    { type: 'teddy', difficulty: 'medium', shape: 'teddy', name: 'Мишка' },
    { type: 'ladybug', difficulty: 'medium', shape: 'ladybug', name: 'Божья коровка' },
    { type: 'mushroom', difficulty: 'medium', shape: 'mushroom', name: 'Гриб' },
    { type: 'chick', difficulty: 'medium', shape: 'chick', name: 'Цыплёнок' },
    { type: 'turtle', difficulty: 'medium', shape: 'turtle', name: 'Черепаха' },
    { type: 'hedgehog', difficulty: 'medium', shape: 'hedgehog', name: 'Ёж' }
  ],
  hard: [
    { type: 'dog', difficulty: 'hard', shape: 'dog', name: 'Собака' },
    { type: 'bird', difficulty: 'hard', shape: 'bird', name: 'Птица' },
    { type: 'rabbit', difficulty: 'hard', shape: 'rabbit', name: 'Кролик' },
    { type: 'horse', difficulty: 'hard', shape: 'horse', name: 'Лошадь' },
    { type: 'whale', difficulty: 'hard', shape: 'whale', name: 'Кит' },
    { type: 'hippo', difficulty: 'hard', shape: 'hippo', name: 'Бегемот' },
    { type: 'dolphin', difficulty: 'hard', shape: 'dolphin', name: 'Дельфин' },
    { type: 'sheep', difficulty: 'hard', shape: 'sheep', name: 'Овца' },
    { type: 'snail', difficulty: 'hard', shape: 'snail', name: 'Улитка' },
    { type: 'elephant', difficulty: 'hard', shape: 'elephant', name: 'Слон' },
    { type: 'train', difficulty: 'hard', shape: 'train', name: 'Паровозик' },
    { type: 'ship', difficulty: 'hard', shape: 'ship', name: 'Корабль' }
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