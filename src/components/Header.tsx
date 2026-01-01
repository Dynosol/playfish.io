import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import pencilIcon from '@/assets/pencil.png';
import questionIcon from '@/assets/questionmark.png';
import gearIcon from '@/assets/gear.png';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '../contexts/AuthContext';
import { useUserDocument } from '../contexts/UserDocumentContext';
import { colors } from '../utils/colors';
import { updateUsername } from '../firebase/userService';
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
  const { userDoc } = useUserDocument();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInSettings, setIsEditingInSettings] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [optimisticUsername, setOptimisticUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Display username: optimistic value takes priority, then userDoc
  const displayUsername = optimisticUsername || userDoc?.username || 'StarUnicorn';

  // Sync local state with userDoc from context
  useEffect(() => {
    if (userDoc?.username) {
      setNewUsername(userDoc.username);
      // Clear optimistic value once Firebase confirms the update
      if (optimisticUsername && userDoc.username === optimisticUsername) {
        setOptimisticUsername(null);
      }
    }
  }, [userDoc?.username, optimisticUsername]);

  const handleSaveUsername = async () => {
      if (!user || !newUsername.trim()) return;
      const trimmedName = newUsername.trim();

      // Exit editing mode immediately
      setIsEditing(false);
      setIsEditingInSettings(false);
      setOptimisticUsername(trimmedName);

      // Then save to Firebase in background
      setLoading(true);
      try {
          await updateUsername(user.uid, trimmedName);
      } catch (error) {
          console.error("Failed to update username", error);
          // Revert optimistic update on error
          setOptimisticUsername(null);
      } finally {
          setLoading(false);
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
                  <>
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
                            style={{ color: getUserColorHex(userDoc?.color || 'slate') }}
                            maxLength={MAX_USERNAME_LENGTH + 5}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newUsername.trim().length <= MAX_USERNAME_LENGTH) handleSaveUsername();
                              if (e.key === 'Escape') {
                                setNewUsername(userDoc?.username || '');
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleSaveUsername}
                      disabled={loading || newUsername.trim().length === 0 || newUsername.trim().length > MAX_USERNAME_LENGTH}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="underline decoration-1 underline-offset-2"
                      style={{ color: getUserColorHex(userDoc?.color || 'slate') }}
                    >
                      {displayUsername}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setNewUsername(userDoc?.username || '');
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
          <Card className="rounded-lg">
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <img src={gearIcon} alt="Settings" className="h-4 w-4" />
                Settings
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {/* Change Name - matches header style */}
              <div className="flex items-center gap-2 font-medium text-base">
                <span className="text-gray-600">Name:</span>
                {isEditingInSettings ? (
                  <>
                    <TooltipProvider>
                      <Tooltip open={newUsername.trim().length > MAX_USERNAME_LENGTH}>
                        <TooltipTrigger asChild>
                          <input
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className={cn(
                              "border-b bg-transparent outline-none text-base font-medium flex-1",
                              newUsername.trim().length > MAX_USERNAME_LENGTH ? "border-red-500" : "border-gray-400"
                            )}
                            style={{ color: getUserColorHex(userDoc?.color || 'slate') }}
                            maxLength={MAX_USERNAME_LENGTH + 5}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newUsername.trim().length <= MAX_USERNAME_LENGTH) handleSaveUsername();
                              if (e.key === 'Escape') {
                                setNewUsername(userDoc?.username || '');
                                setIsEditingInSettings(false);
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleSaveUsername}
                      disabled={loading || newUsername.trim().length === 0 || newUsername.trim().length > MAX_USERNAME_LENGTH}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="underline decoration-1 underline-offset-2"
                      style={{ color: getUserColorHex(userDoc?.color || 'slate') }}
                    >
                      {displayUsername}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setNewUsername(userDoc?.username || '');
                        setIsEditingInSettings(true);
                      }}
                    >
                      <img src={pencilIcon} alt="Edit" className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <Link
                to="/feedback"
                onClick={() => setShowSettings(false)}
                className="block w-full text-center py-2 rounded text-white text-sm font-medium"
                style={{ backgroundColor: colors.purple }}
              >
                Submit Feedback
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default Header;
