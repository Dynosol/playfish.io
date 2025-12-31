import React from 'react';
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Card } from '@/firebase/gameService';

const allSuits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
const allRanks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

interface AskCardDialogProps {
  selectedSuit: Card['suit'];
  selectedRank: Card['rank'];
  onSuitChange: (suit: Card['suit']) => void;
  onRankChange: (rank: Card['rank']) => void;
  onAsk: () => void;
  onCancel: () => void;
  canAsk: boolean;
  isAsking: boolean;
  errorMessage: string;
}

const AskCardDialog: React.FC<AskCardDialogProps> = ({
  selectedSuit,
  selectedRank,
  onSuitChange,
  onRankChange,
  onAsk,
  onCancel,
  canAsk,
  isAsking,
  errorMessage,
}) => {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <UICard className="w-80 pointer-events-auto rounded shadow">
        <CardHeader>
          <CardTitle className="text-sm">Your Turn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Suit</Label>
            <Select value={selectedSuit} onValueChange={(value) => onSuitChange(value as Card['suit'])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allSuits.map(suit => (
                  <SelectItem key={suit} value={suit} className="text-xs">{suit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Rank</Label>
            <Select value={selectedRank} onValueChange={(value) => onRankChange(value as Card['rank'])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allRanks.map(rank => (
                  <SelectItem key={rank} value={rank} className="text-xs">{rank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onAsk}
              disabled={!canAsk || isAsking}
              size="sm"
              className="flex-1 rounded"
            >
              {isAsking ? 'Asking...' : 'Ask'}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="rounded"
            >
              Cancel
            </Button>
          </div>
          {errorMessage && (
            <div className="text-xs text-destructive">{errorMessage}</div>
          )}
        </CardContent>
      </UICard>
    </div>
  );
};

export default AskCardDialog;
