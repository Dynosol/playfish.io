import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1>Settings</h1>
      <Link to="/">Back to Home</Link>
      
      <div>
        <h2>User Info</h2>
        <p>User ID: {user?.uid}</p>
        <p>Anonymous User</p>
      </div>
      
      <div>
        <h2>Game Settings</h2>
        <p>Settings will be added here</p>
      </div>
    </div>
  );
};

export default SettingsPage;
