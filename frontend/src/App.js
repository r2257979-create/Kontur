import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import SetupPage from './pages/SetupPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;