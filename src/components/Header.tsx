import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, X, User } from 'lucide-react';
import pencilIcon from '@/assets/pencil.png';
import questionIcon from '@/assets/questionmark.png';
import gearIcon from '@/assets/gear.png';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../utils/colors';
import { subscribeToUser, updateUsername } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';
import { cn } from "@/lib/utils";
import playfishLogo from '@/assets/playfish.png';
import fishIcon from '@/assets/favicon.png';
import { getUserColorHex } from '../utils/userColors';

// Must match cloud function MAX_USERNAME_LENGTH
const MAX_USERNAME_LENGTH = 20;

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
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between relative">
          {/* Left: Logo */}
          <div
            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleHomeClick}
          >
            <img src={fishIcon} alt="Fish" className="h-6 w-6 sm:h-8 sm:w-8" />
            <img src={playfishLogo} alt="playfish.io" className="h-8 sm:h-10 hidden sm:block" />
          </div>

          {/* Center: Dynamic Content */}
          <div className="flex absolute left-1/2 -translate-x-1/2 items-center justify-center">
            {/* Mobile: Show logo centered */}
            <img
              src={playfishLogo}
              alt="playfish.io"
              className="h-8 sm:hidden cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleHomeClick}
            />
            {/* Desktop: Show dynamic content */}
            {type === 'game' ? (
              <span className="hidden sm:block font-medium text-base sm:text-lg">Game Room: {roomName}</span>
            ) : (
              <div className="hidden sm:flex items-center gap-2 font-medium text-lg">
                <span>Welcome,{' '}</span>
                {isEditing ? (
                  <TooltipProvider>
                    <Tooltip open={newUsername.trim().length > MAX_USERNAME_LENGTH}>
                      <TooltipTrigger asChild>
                        <input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className={cn(
                            "border-b bg-transparent outline-none text-lg font-medium w-32",
                            newUsername.trim().length > MAX_USERNAME_LENGTH ? "border-red-500" : "border-gray-400"
                          )}
                          style={{ color: getUserColorHex(userData?.color || 'slate') }}
                          maxLength={MAX_USERNAME_LENGTH + 5}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newUsername.trim().length <= MAX_USERNAME_LENGTH) handleSaveUsername();
                            if (e.key === 'Escape') {
                              setNewUsername(userData?.username || '');
                              setIsEditing(false);
                            }
                          }}
                          onBlur={() => {
                            if (newUsername.trim().length <= MAX_USERNAME_LENGTH) {
                              handleSaveUsername();
                            } else {
                              setNewUsername(userData?.username || '');
                              setIsEditing(false);
                            }
                          }}
                          disabled={loading}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-red-500 text-white">
                        <p>Choose a shorter name!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
        <div className="fixed top-16 sm:top-20 right-3 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2">
          <Card className="border border-gray-300 rounded-lg shadow-xl bg-white">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <img src={gearIcon} alt="Settings" className="h-5 w-5" />
                Settings
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleSaveSettingsUsername} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-username" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </Label>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip open={settingsUsername.trim().length > MAX_USERNAME_LENGTH}>
                        <TooltipTrigger asChild>
                          <Input
                            id="settings-username"
                            value={settingsUsername}
                            onChange={(e) => setSettingsUsername(e.target.value)}
                            placeholder="Enter username"
                            maxLength={MAX_USERNAME_LENGTH + 5}
                            className={cn(
                              "h-9 border-gray-300 rounded-lg focus:border-gray-400",
                              settingsUsername.trim().length > MAX_USERNAME_LENGTH && "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-red-500 text-white">
                          <p>Choose a shorter name! (max {MAX_USERNAME_LENGTH} chars)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      type="submit"
                      size="sm"
                      className="rounded-lg"
                      disabled={settingsLoading || settingsUsername.trim().length > MAX_USERNAME_LENGTH || settingsUsername.trim().length === 0}
                    >
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
              <div className="border-t border-gray-200 pt-4">
                <Link
                  to="/feedback"
                  onClick={() => setShowSettings(false)}
                  className="block w-full text-center py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: colors.purple }}
                >
                  Submit Feedback
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Header;
