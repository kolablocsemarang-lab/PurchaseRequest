import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'primary' | 'stacked' | 'symbol-only' | 'full';
  color?: 'chile-rojo' | 'terracota' | 'sunset' | 'cream' | 'white' | 'dark';
}

/**
 * Kola Bloc Official Logogram Symbol
 * The iconic Kota Lama heritage architectural archway portal.
 */
export const KolaBlocSymbol: React.FC<{
  className?: string;
  size?: number | string;
  fill?: string;
}> = ({ className = 'w-7 h-7', size, fill = 'currentColor' }) => {
  return (
    <svg
      viewBox="0 0 100 95"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Outer arch with inner archway portal cutout (fillRule evenodd) */}
      <path
        d="M 12 90 L 12 42 C 12 18.8 30.8 0 54 0 C 77.2 0 96 18.8 96 42 L 96 90 L 69 90 L 69 54 C 69 45.7 62.3 39 54 39 C 45.7 39 39 45.7 39 54 L 39 90 Z"
        fill={fill}
      />
    </svg>
  );
};

/**
 * Kola Bloc Signature Wordmark
 * K O L [A-arch]   B L O C
 */
export const KolaBlocLogo: React.FC<LogoProps> = ({
  className = '',
  size = 28,
  variant = 'primary',
  color = 'chile-rojo',
}) => {
  const colorMap = {
    'chile-rojo': '#D06224',
    terracota: '#AF431D',
    sunset: '#E9C892',
    cream: '#F7E7DE',
    white: '#FFFFFF',
    dark: '#220D05',
  };

  const primaryFill = colorMap[color];

  if (variant === 'symbol-only') {
    return <KolaBlocSymbol size={size} fill={primaryFill} className={className} />;
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-start font-black tracking-tight leading-none ${className}`}>
        <div className="flex items-center text-xl tracking-wider font-extrabold" style={{ color: primaryFill }}>
          <span>K</span>
          <span>O</span>
          <span>L</span>
          <span className="inline-block mx-0.5" style={{ width: '0.85em', height: '0.85em' }}>
            <KolaBlocSymbol className="w-full h-full" fill={primaryFill} />
          </span>
        </div>
        <div className="text-xl tracking-widest font-extrabold mt-0.5" style={{ color: primaryFill }}>
          <span>BLOC</span>
        </div>
      </div>
    );
  }

  // Primary horizontal logo
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="flex items-center font-black tracking-tight text-lg" style={{ color: primaryFill }}>
        <span className="font-extrabold tracking-wider">KOL</span>
        <span className="inline-block mx-0.5 -mt-0.5" style={{ width: '0.9em', height: '0.9em' }}>
          <KolaBlocSymbol className="w-full h-full" fill={primaryFill} />
        </span>
        <span className="font-extrabold tracking-wider ml-1.5">BLOC</span>
      </div>
    </div>
  );
};

/**
 * Kola Bloc Wordmark component
 */
export const KolaBlocWordmark: React.FC<{
  className?: string;
  fill?: string;
  size?: number | string;
}> = ({ className = '', fill = '#D06224' }) => {
  return (
    <div className={`inline-flex items-center font-black tracking-tight leading-none ${className}`} style={{ color: fill }}>
      <span className="font-extrabold tracking-wider">KOL</span>
      <span className="inline-block mx-0.5 -mt-0.5" style={{ width: '0.9em', height: '0.9em' }}>
        <KolaBlocSymbol className="w-full h-full" fill={fill} />
      </span>
      <span className="font-extrabold tracking-wider ml-1">BLOC</span>
    </div>
  );
};

/**
 * Kola Bloc Concentric Heritage Arches Pattern
 * Derived from the brand guideline decorative elements (Page 1, 3, 15, 20, 28, 52, 53, 54, 72)
 */
export const KolaBlocArchPattern: React.FC<{
  className?: string;
  strokeColor?: string;
  opacity?: number;
}> = ({ className = '', strokeColor = '#E9C892', opacity = 0.25 }) => {
  return (
    <svg
      viewBox="0 0 300 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      {/* Concentric heritage arch curves */}
      <path
        d="M 300 400 L 300 150 C 300 67.2 232.8 0 150 0 C 67.2 0 0 67.2 0 150 L 0 400"
        stroke={strokeColor}
        strokeWidth="2.5"
      />
      <path
        d="M 270 400 L 270 165 C 270 98.7 216.3 45 150 45 C 83.7 45 30 98.7 30 165 L 30 400"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <path
        d="M 240 400 L 240 180 C 240 130.3 199.7 90 150 90 C 100.3 90 60 130.3 60 180 L 60 400"
        stroke={strokeColor}
        strokeWidth="1.8"
      />
      <path
        d="M 210 400 L 210 195 C 210 161.9 183.1 135 150 135 C 116.9 135 90 161.9 90 195 L 90 400"
        stroke={strokeColor}
        strokeWidth="1.5"
      />
      <path
        d="M 180 400 L 180 210 C 180 193.4 166.6 180 150 180 C 133.4 180 120 193.4 120 210 L 120 400"
        stroke={strokeColor}
        strokeWidth="1.5"
      />
    </svg>
  );
};
