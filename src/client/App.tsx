import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
        <Route path="/game-over/:roomId" element={<GameOverPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
