import React from 'react';
import { colors } from '@/utils/colors';

interface PowerGraphProps {
  className?: string;
}

// Skills and their values (0-1 scale)
const skills = [
  { label: 'Teamwork', value: 0.95 },
  { label: 'Strategy', value: 0.70 },
  { label: 'Memory', value: 0.90 },
  { label: 'Logic', value: 0.55 },
  { label: 'Luck', value: 0.30 },
];

const PowerGraph: React.FC<PowerGraphProps> = ({ className }) => {
  const size = 180;
  const center = size / 2;
  const radius = 45;
  const angleStep = (2 * Math.PI) / skills.length;
  const startAngle = -Math.PI / 2; // Start from top

  // Get point coordinates for a given index and distance from center
  const getPoint = (index: number, distance: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Generate pentagon outline points
  const outlinePoints = skills
    .map((_, i) => {
      const p = getPoint(i, radius);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  // Generate inner value polygon points
  const valuePoints = skills
    .map((skill, i) => {
      const p = getPoint(i, radius * skill.value);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <div className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Pentagon outline */}
        <polygon
          points={outlinePoints}
          fill="none"
          stroke={colors.grayLight}
          strokeWidth="1"
        />

        {/* Axis lines from center to each vertex */}
        {skills.map((_, i) => {
          const p = getPoint(i, radius);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke={colors.grayLight}
              strokeWidth="1"
            />
          );
        })}

        {/* Value polygon (filled) */}
        <polygon
          points={valuePoints}
          fill={colors.lime}
          fillOpacity="0.3"
          stroke={colors.lime}
          strokeWidth="1.5"
        />

        {/* Fish face */}
        <ellipse cx="82" cy="80" rx="2.5" ry="6" fill="black" />
        <ellipse cx="109" cy="75" rx="2.5" ry="6" fill="black" />
        <ellipse cx="98" cy="85" rx="7" ry="4" fill="black" />

        {/* Labels */}
        {skills.map((skill, i) => {
          const labelDistance = radius + 16;
          const p = getPoint(i, labelDistance);
          return (
            <text
              key={skill.label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill={colors.grayMedium}
            >
              {skill.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default PowerGraph;
