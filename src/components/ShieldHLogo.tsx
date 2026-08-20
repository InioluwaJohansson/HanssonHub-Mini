import React from 'react';

interface ShieldHLogoProps {
  size?: number;
  className?: string;
  withBackground?: boolean;
}

export default function ShieldHLogo({ 
  size = 32, 
  className = '',
  withBackground = false 
}: ShieldHLogoProps) {
  const content = (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield with Crisp White Border */}
      <path 
        d="M 256 82 L 396 122 C 396 270 256 392 256 430 C 256 392 116 270 116 122 Z" 
        fill="#000000" 
        stroke="#ffffff" 
        strokeWidth="24" 
        strokeLinejoin="round" 
        strokeLinecap="round"
      />

      {/* Letter H in Pure White */}
      <path 
        d="M 188 178 V 334 M 324 178 V 334 M 188 256 H 324" 
        stroke="#ffffff" 
        strokeWidth="38" 
        strokeLinecap="square"
      />
    </svg>
  );

  if (withBackground) {
    return (
      <div 
        className="bg-black rounded-xl p-1.5 flex items-center justify-center border border-zinc-800 shadow-sm"
        style={{ width: size + 12, height: size + 12 }}
      >
        {content}
      </div>
    );
  }

  return content;
}
