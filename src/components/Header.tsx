import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CircleHelp, Pencil, Check, X, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser, updateUsername } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';
import { cn } from "@/lib/utils";

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

  // Logic for inline header editing
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

  // Logic for popup settings editing
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
      <header className={cn("w-full z-50", className)}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
          {/* Left: Logo */}
          <div 
            className="flex items-center gap-2 font-bold text-xl cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={handleHomeClick}
          >
            <span>playfish.io</span>
          </div>

          {/* Center: Dynamic Content */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            {type === 'game' ? (
              <span className="font-medium text-lg">Game Room: {roomName}</span>
            ) : (
              <div className="flex items-center gap-2 font-medium text-lg">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="h-8 w-40 text-base"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveUsername();
                        if (e.key === 'Escape') setIsEditing(false);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/30" onClick={handleSaveUsername} disabled={loading}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>Welcome, {userData?.username || 'StarUnicorn'}</span>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                      onClick={() => {
                        setNewUsername(userData?.username || '');
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
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
            >
              <CircleHelp />
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
              <Settings />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Popup */}
      {showSettings && (
        <div className="fixed top-20 right-4 z-50 w-80 animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2">
          <Card className="shadow-xl border-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Settings className="h-5 w-5" />
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
              
              {/* Can add more settings here in the future (Theme, Sound, etc.) */}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Header;
