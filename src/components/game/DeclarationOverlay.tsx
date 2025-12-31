import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import CardImage from '../CardImage';
import type { Card } from '@/firebase/gameService';
import { getAllCardsInHalfSuit, getCardKey, getTeamPlayers } from '@/firebase/gameService';
import type { Game } from '@/firebase/gameService';
import { colors } from '@/utils/colors';

interface DeclarationOverlayProps {
  game: Game;
  user: { uid: string } | null;
  declarationHalfSuit: Card['halfSuit'] | null;
  declarationTeam: 0 | 1 | null;
  declarationAssignments: { [cardKey: string]: string };
  isDeclaring: boolean;
  declareError: string;
  onSelectHalfSuit: (halfSuit: Card['halfSuit']) => void;
  onSelectTeam: (team: 0 | 1) => void;
  onAssignCard: (cardKey: string, playerId: string) => void;
  onFinishDeclaration: () => void;
  onAbortDeclaration: () => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

const DeclarationOverlay: React.FC<DeclarationOverlayProps> = ({
  game,
  user,
  declarationHalfSuit,
  declarationTeam,
  declarationAssignments,
  isDeclaring,
  declareError,
  onSelectHalfSuit,
  onSelectTeam,
  onAssignCard,
  onFinishDeclaration,
  onAbortDeclaration,
  getUsername,
  getUserColor,
}) => {
  const suits = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
  const suitIcons: Record<string, string> = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="w-96 max-h-[70vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-semibold">DECLARATION</h2>
          {!declarationHalfSuit && (
            <button
              onClick={onAbortDeclaration}
              disabled={isDeclaring}
              className="text-xs font-medium disabled:opacity-50 transition-opacity hover:opacity-70"
              style={{ color: colors.red }}
            >
              (Abort: you can only abort on step 1!)
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Step 1: Select Halfsuit */}
          {!declarationHalfSuit && (
            <div>
              <h4 className="font-semibold mb-3 text-sm text-gray-700">Step 1: Select Halfsuit</h4>
              <div className="grid grid-cols-2 gap-2">
                {suits.map(suit => {
                  const suitIcon = suitIcons[suit];
                  const isRed = suit === 'hearts' || suit === 'diamonds';
                  return (
                    <React.Fragment key={suit}>
                      {(['low', 'high'] as const).map(level => {
                        const halfSuit = `${level}-${suit}` as Card['halfSuit'];
                        const isCompleted = game.completedHalfsuits.includes(halfSuit);
                        return (
                          <Button
                            key={halfSuit}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "rounded justify-start gap-2 h-9",
                              isCompleted && "opacity-50 line-through cursor-not-allowed"
                            )}
                            disabled={isCompleted}
                            onClick={() => onSelectHalfSuit(halfSuit)}
                          >
                            <span
                              className="text-lg leading-none"
                              style={{ color: isCompleted ? '#9ca3af' : (isRed ? '#ef4444' : '#000000') }}
                            >
                              {suitIcon}
                            </span>
                            <span className="capitalize text-xs">{level} {suit}</span>
                          </Button>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Select Team */}
          {declarationHalfSuit && declarationTeam === null && (
            <div>
              <h4 className="font-semibold mb-2 text-sm text-gray-700">Step 2: Select Team</h4>
              <div className="mb-3 text-xs text-gray-500">
                Declaring: <span className="font-medium">{declarationHalfSuit}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onSelectTeam(0)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded hover:opacity-80"
                  style={{ color: colors.red, borderColor: colors.red }}
                >
                  Red Team
                </Button>
                <Button
                  onClick={() => onSelectTeam(1)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded hover:opacity-80"
                  style={{ color: colors.blue, borderColor: colors.blue }}
                >
                  Blue Team
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Assign Cards */}
          {declarationHalfSuit && declarationTeam !== null && (
            <div>
              <h4 className="font-semibold mb-2 text-sm text-gray-700">Step 3: Assign Cards</h4>
              <div className="mb-3 text-xs text-gray-500">
                Declaring <span className="font-medium">{declarationHalfSuit}</span> for{' '}
                <span className="font-medium" style={{ color: declarationTeam === 0 ? colors.red : colors.blue }}>
                  {declarationTeam === 0 ? 'Red' : 'Blue'} Team
                </span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {getAllCardsInHalfSuit(declarationHalfSuit).map(card => {
                  const cardKey = getCardKey(card);
                  const assignedPlayerId = declarationAssignments[cardKey];
                  const teamPlayers = getTeamPlayers(game, declarationTeam);

                  return (
                    <div key={cardKey} className="flex items-center gap-2">
                      <CardImage card={card} width={32} height={45} />
                      <Select
                        value={assignedPlayerId || ''}
                        onValueChange={(value) => onAssignCard(cardKey, value)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Select player..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teamPlayers.map(playerId => (
                            <SelectItem key={playerId} value={playerId} className="text-xs">
                              <span className="font-medium" style={{ color: getUserColor(playerId) }}>
                                {playerId === user?.uid ? 'You' : getUsername(playerId)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error message */}
          {declareError && (
            <div className="mt-3 text-xs p-2 rounded" style={{ color: colors.red, backgroundColor: `${colors.red}15` }}>
              {declareError}
            </div>
          )}
        </div>

        {/* Footer - only show finish button on step 3 */}
        {declarationHalfSuit && declarationTeam !== null && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <Button
              onClick={onFinishDeclaration}
              disabled={isDeclaring || !getAllCardsInHalfSuit(declarationHalfSuit).every(card => {
                const cardKey = getCardKey(card);
                return declarationAssignments[cardKey] !== undefined;
              })}
              className="w-full rounded"
              size="sm"
            >
              {isDeclaring ? 'Finishing...' : 'Finish Declaration'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeclarationOverlay;
