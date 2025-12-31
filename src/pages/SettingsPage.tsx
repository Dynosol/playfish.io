import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser, updateUsername } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';
import { colors } from '../utils/colors';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setUserDoc(userData);
      if (userData && !editingUsername) {
        setNewUsername(userData.username);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, editingUsername]);

  const handleEditUsername = () => {
    setEditingUsername(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingUsername(false);
    setNewUsername(userDoc?.username || '');
    setError(null);
  };

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (newUsername.trim() === userDoc?.username) {
      setEditingUsername(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateUsername(user.uid, newUsername.trim());
      setEditingUsername(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <Link to="/">Back to Home</Link>
      
      <div>
        <h2>User Info</h2>
        {userDoc && (
          <div>
            <div>
              <label>Username:</label>
              {editingUsername ? (
                <div>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={saving}
                    maxLength={50}
                  />
                  <button onClick={handleSaveUsername} disabled={saving || !newUsername.trim()}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEdit} disabled={saving}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <span>{userDoc.username}</span>
                  <button onClick={handleEditUsername}>Edit</button>
                </div>
              )}
              {error && <div>{error}</div>}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Feedback</h2>
        <p style={{ marginBottom: '1rem', color: colors.grayMedium }}>
          Have suggestions or found a bug? Let us know!
        </p>
        <Link
          to="/feedback"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: colors.purple,
            color: 'white',
            borderRadius: '0.375rem',
            textDecoration: 'none'
          }}
        >
          Submit Feedback
        </Link>
      </div>
    </div>
  );
};

export default SettingsPage;
