import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import StartPage from './pages/StartPage';
import JoinGamePage from './pages/JoinGamePage';
import CreateGamePage from './pages/CreateGamePage';
import SettingsPage from './pages/SettingsPage';
import LobbyPage from './pages/LobbyPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/join" element={<JoinGamePage />} />
          <Route path="/create" element={<CreateGamePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/lobby/:gameId" element={<LobbyPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
