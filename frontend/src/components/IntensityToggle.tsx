import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function IntensityToggle() {
  const { mode, cycleMode } = useTheme();

  const getModeConfig = (currentMode: string) => {
    switch (currentMode) {
      case 'stealth':
        return {
          label: 'Stealth',
          description: 'Maximum focus',
          scale: 1,
          opacity: 1,
          ring: 'ring-2 ring-white/60',
          glow: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
        };
      case 'comfort':
        return {
          label: 'Comfort', 
          description: 'Balanced view',
          scale: 0.7,
          opacity: 0.8,
          ring: 'ring-2 ring-grey-300/60',
          glow: 'drop-shadow-[0_0_6px_rgba(200,200,200,0.6)]'
        };
      case 'ambient':
        return {
          label: 'Ambient',
          description: 'Extended use', 
          scale: 0.4,
          opacity: 0.6,
          ring: 'ring-1 ring-grey-400/40',
          glow: 'drop-shadow-[0_0_4px_rgba(160,160,160,0.4)]'
        };
      default:
        return getModeConfig('stealth');
    }
  };

  const config = getModeConfig(mode);

  return (
    <div className="relative group">
      {/* Minimal Circle Button */}
      <button
        onClick={cycleMode}
        className="relative w-8 h-8 rounded-full bg-black border border-grey-700 hover:border-grey-600 transition-all duration-300 group"
      >
        {/* Outer Ring */}
        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${config.ring}`} />
        
        {/* Inner Intensity Core */}
        <div className="absolute inset-1.5 rounded-full overflow-hidden">
          <div 
            className={`w-full h-full bg-gradient-to-br from-white to-grey-200 transition-all duration-500 ${config.glow}`}
            style={{
              transform: `scale(${config.scale})`,
              opacity: config.opacity
            }}
          />
        </div>
        
        {/* Subtle Pulse on Hover */}
        <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </button>

      {/* Minimal Tooltip */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/90 border border-grey-700 rounded text-xs font-mono text-grey-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap backdrop-blur-sm">
        {config.description}
      </div>
    </div>
  );
}
