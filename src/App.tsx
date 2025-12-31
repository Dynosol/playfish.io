import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import StartPage from './pages/StartPage';
import JoinGamePage from './pages/JoinGamePage';
import CreateGamePage from './pages/CreateGamePage';
import SettingsPage from './pages/SettingsPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import RulesPage from './pages/RulesPage';
import AboutPage from './pages/AboutPage';
import FeedbackPage from './pages/FeedbackPage';
import ActiveGameBanner from './components/ActiveGameBanner';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ActiveGameBanner />
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/join" element={<JoinGamePage />} />
          <Route path="/create" element={<CreateGamePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/lobby/:gameId" element={<LobbyPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
