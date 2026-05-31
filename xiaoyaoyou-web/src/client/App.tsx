import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './contexts/WebSocketContext';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import HeroSelectPage from './pages/HeroSelectPage';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="/hero-select/:roomId" element={<HeroSelectPage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
          <Route path="/game-over/:roomId" element={<GameOverPage />} />
        </Routes>
      </WebSocketProvider>
    </BrowserRouter>
  );
};

export default App;
