import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, User } from 'lucide-react';
import pencilIcon from '@/assets/pencil.png';
import questionIcon from '@/assets/questionmark.png';
import gearIcon from '@/assets/gear.png';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser, updateUsername } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';
import { cn } from "@/lib/utils";
import fishIcon from '@/assets/favicon.png';
import { getUserColorHex } from '../utils/userColors';

interface HeaderProps {
  type: 'home' | 'game';
  roomName?: string;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ type, roomName, className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUsername, setSettingsUsername] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUser(user.uid, (data) => {
        setUserData(data);
        if (data?.username) {
          setNewUsername(data.username);
          setSettingsUsername(data.username);
        }
    });
    return unsubscribe;
  }, [user]);

  const handleSaveUsername = async () => {
      if (!user || !newUsername.trim()) return;
      setLoading(true);
      try {
          await updateUsername(user.uid, newUsername);
          setIsEditing(false);
      } catch (error) {
          console.error("Failed to update username", error);
      } finally {
          setLoading(false);
      }
  };

  const handleSaveSettingsUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !settingsUsername.trim()) return;
    setSettingsLoading(true);
    setSettingsSuccess(false);
    try {
        await updateUsername(user.uid, settingsUsername);
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (error) {
        console.error("Failed to update username in settings", error);
    } finally {
        setSettingsLoading(false);
    }
  };

  const handleHomeClick = () => {
      navigate('/');
  };

  return (
    <>
      <header className={cn("w-full z-50 sticky top-0 bg-background border-b", className)}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
          {/* Left: Logo */}
          <div
            className="flex items-center gap-0.5 text-xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleHomeClick}
          >
            <img src={fishIcon} alt="Fish" className="h-7 w-7" />
            <span>playfish.io</span>
          </div>

          {/* Center: Dynamic Content */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            {type === 'game' ? (
              <span className="font-medium text-lg">Game Room: {roomName}</span>
            ) : (
              <div className="flex items-center gap-2 font-medium text-lg">
                <span>Welcome,{' '}</span>
                {isEditing ? (
                  <input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="border-b border-gray-400 bg-transparent outline-none text-lg font-medium w-32"
                    style={{ color: getUserColorHex(userData?.color || 'slate') }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUsername();
                      if (e.key === 'Escape') {
                        setNewUsername(userData?.username || '');
                        setIsEditing(false);
                      }
                    }}
                    onBlur={handleSaveUsername}
                    disabled={loading}
                  />
                ) : (
                  <>
                    <span
                      className="underline decoration-1 underline-offset-2"
                      style={{ color: getUserColorHex(userData?.color || 'slate') }}
                    >
                      {userData?.username || 'StarUnicorn'}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setNewUsername(userData?.username || '');
                        setIsEditing(true);
                      }}
                    >
                      <img src={pencilIcon} alt="Edit" className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Icons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-accent/50 [&_svg]:size-5"
              onClick={() => navigate('/rules')}
            >
              <img src={questionIcon} alt="Help" className="h-5 w-5" />
              <span className="sr-only">Help</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full hover:bg-accent/50 [&_svg]:size-5",
                showSettings && "bg-accent/50"
              )}
              onClick={() => setShowSettings(!showSettings)}
            >
              <img src={gearIcon} alt="Settings" className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Popup */}
      {showSettings && (
        <div className="fixed top-20 right-4 z-50 w-80 animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <img src={gearIcon} alt="Settings" className="h-5 w-5" />
                Settings
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSaveSettingsUsername} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-username" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="settings-username"
                      value={settingsUsername}
                      onChange={(e) => setSettingsUsername(e.target.value)}
                      placeholder="Enter username"
                      className="h-9"
                    />
                    <Button type="submit" size="sm" disabled={settingsLoading}>
                      {settingsLoading ? '...' : 'Save'}
                    </Button>
                  </div>
                  {settingsSuccess && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                      <Check className="h-3 w-3" /> Saved successfully
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Header;
