import React from 'react';
import { Link } from 'react-router-dom';

const StartPage: React.FC = () => {
  return (
    <div>
      <h1>Fish Game</h1>
      <nav>
        <ul>
          <li><Link to="/join">Join Game</Link></li>
          <li><Link to="/create">Create Game</Link></li>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default StartPage;
