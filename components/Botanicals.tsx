import React from 'react';

interface BotProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const BotLeaf: React.FC<BotProps> = ({ size = 24, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M4 20 C 8 16, 12 10, 18 4 M 18 4 C 18 8, 16 14, 12 18 C 8 22, 4 20, 4 20 Z"
      stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M6 18 L 16 8" stroke="currentColor" strokeWidth="0.6" />
  </svg>
);

export const BotBranch: React.FC<BotProps> = ({ size = 120, className = '', style }) => (
  <svg width={size} height={size * 0.5} viewBox="0 0 240 120" fill="none" className={className} style={style}>
    <path d="M0 90 C 60 70, 100 60, 160 40" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M80 75 C 90 60, 105 55, 115 48" stroke="currentColor" strokeWidth="0.8" fill="none"/>
    <path d="M115 48 C 122 40, 130 34, 140 30" stroke="currentColor" strokeWidth="0.7" fill="none"/>
    <ellipse cx="110" cy="50" rx="8" ry="3" stroke="currentColor" strokeWidth="0.7" fill="none" transform="rotate(-30 110 50)"/>
    <ellipse cx="132" cy="36" rx="7" ry="2.5" stroke="currentColor" strokeWidth="0.7" fill="none" transform="rotate(-25 132 36)"/>
    <ellipse cx="155" cy="44" rx="6" ry="2.2" stroke="currentColor" strokeWidth="0.7" fill="none" transform="rotate(10 155 44)"/>
    <ellipse cx="175" cy="38" rx="5" ry="2" stroke="currentColor" strokeWidth="0.7" fill="none" transform="rotate(-15 175 38)"/>
  </svg>
);

export const BotRings: React.FC<BotProps> = ({ size = 80, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className} style={style}>
    {[36, 28, 20, 12, 6].map((r, i) => (
      <circle key={i} cx="40" cy="40" r={r} stroke="currentColor" strokeWidth="0.6" fill="none" opacity={0.7 - i * 0.1}/>
    ))}
  </svg>
);

export const BotSprig: React.FC<BotProps> = ({ size = 60, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none" className={className} style={style}>
    <path d="M30 58 C 30 40, 30 20, 30 4" stroke="currentColor" strokeWidth="0.8"/>
    {[12, 20, 28, 36, 44].map((y, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return (
        <path key={i}
          d={`M30 ${y} Q ${30 + side * 8} ${y - 3}, ${30 + side * 14} ${y - 6}`}
          stroke="currentColor" strokeWidth="0.7" fill="none"/>
      );
    })}
    {[12, 20, 28, 36, 44].map((y, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return (
        <ellipse key={'l' + i} cx={30 + side * 14} cy={y - 6} rx={Math.abs(side * 5)} ry={2}
          stroke="currentColor" strokeWidth="0.6" fill="none" transform={`rotate(${side * -30} ${30 + side * 14} ${y - 6})`}/>
      );
    })}
  </svg>
);

interface TreeSilhouetteProps {
  seed?: number;
  className?: string;
  tone?: 'olive' | 'terracotta';
}

export const TreeSilhouette: React.FC<TreeSilhouetteProps> = ({ seed = 0, className = '', tone = 'olive' }) => {
  const colors = tone === 'olive'
    ? { a: 'var(--olive-soft)', b: 'var(--olive)', bg: 'var(--olive-wash)' }
    : { a: 'var(--terracotta-soft)', b: 'var(--terracotta)', bg: 'var(--terracotta-wash)' };
  const variants = [
    <g key="a">
      <ellipse cx="60" cy="48" rx="42" ry="36" fill={colors.a}/>
      <ellipse cx="60" cy="48" rx="28" ry="24" fill={colors.b} opacity="0.4"/>
      <rect x="56" y="72" width="8" height="24" fill={colors.b} opacity="0.8"/>
    </g>,
    <g key="b">
      <ellipse cx="60" cy="42" rx="22" ry="38" fill={colors.a}/>
      <ellipse cx="60" cy="42" rx="12" ry="28" fill={colors.b} opacity="0.4"/>
      <rect x="56" y="74" width="8" height="22" fill={colors.b} opacity="0.8"/>
    </g>,
    <g key="c">
      <circle cx="42" cy="44" r="20" fill={colors.a}/>
      <circle cx="78" cy="44" r="20" fill={colors.a}/>
      <circle cx="60" cy="32" r="18" fill={colors.a}/>
      <circle cx="60" cy="56" r="20" fill={colors.a}/>
      <circle cx="60" cy="44" r="14" fill={colors.b} opacity="0.35"/>
      <rect x="56" y="72" width="8" height="24" fill={colors.b} opacity="0.8"/>
    </g>,
    <g key="d">
      <ellipse cx="60" cy="42" rx="46" ry="24" fill={colors.a}/>
      <ellipse cx="40" cy="50" rx="16" ry="18" fill={colors.a}/>
      <ellipse cx="80" cy="50" rx="16" ry="18" fill={colors.a}/>
      <rect x="56" y="72" width="8" height="24" fill={colors.b} opacity="0.8"/>
    </g>,
  ];
  const v = variants[seed % variants.length];
  return (
    <svg viewBox="0 0 120 100" className={className} style={{ background: colors.bg, display: 'block', width: '100%', height: '100%' }}>
      <line x1="0" y1="96" x2="120" y2="96" stroke={colors.b} strokeWidth="0.6" opacity="0.5"/>
      {v}
    </svg>
  );
};
