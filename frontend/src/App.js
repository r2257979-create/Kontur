import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import SetupPage from './pages/SetupPage';
import CalibrationPage from './pages/CalibrationPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/calibration" element={<CalibrationPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;