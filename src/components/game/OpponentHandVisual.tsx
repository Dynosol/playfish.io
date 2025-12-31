import React from 'react';
import cardBack from '@/assets/cards/card_back.svg';

interface OpponentHandVisualProps {
  count: number;
}

const OpponentHandVisual: React.FC<OpponentHandVisualProps> = ({ count }) => {
  if (count === 0) return <div className="h-12" />; // Placeholder height

  const topRow = Math.ceil(count / 2);
  const bottomRow = Math.floor(count / 2);
  const cardHeight = 32;
  const cardWidth = 22;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center -space-y-4 mt-1">
        {/* Top Row */}
        <div className="flex">
          {Array.from({ length: topRow }).map((_, i) => (
            <img
              key={`top-${i}`}
              src={cardBack}
              alt="card back"
              className="border-white border bg-red-500 block"
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                marginLeft: i === 0 ? 0 : '-14px',
                zIndex: i
              }}
            />
          ))}
        </div>
        {/* Bottom Row */}
        {bottomRow > 0 && (
          <div className="flex">
            {Array.from({ length: bottomRow }).map((_, i) => (
              <img
                key={`bottom-${i}`}
                src={cardBack}
                alt="card back"
                className="border-white border bg-red-500 block"
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  marginLeft: i === 0 ? 0 : '-14px',
                  zIndex: 10 + i
                }}
              />
            ))}
          </div>
        )}
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{count} left</span>
    </div>
  );
};

export default OpponentHandVisual;
