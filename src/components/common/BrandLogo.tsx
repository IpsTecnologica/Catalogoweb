import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSlogan?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSlogan = false
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Red Hexagonal/Tech Emblem */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-red-600 to-red-700 text-white rounded-lg flex items-center justify-center font-extrabold tracking-wider shadow-sm shrink-0 border border-red-500`}
      >
        IPS
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-extrabold tracking-tight text-slate-900 ${textSizes[size]}`}>
            IPS
          </span>
          <span className={`font-semibold tracking-tight text-red-600 ${textSizes[size]}`}>
            TECNOLÓGICA
          </span>
        </div>
        {showSlogan && (
          <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
            CATALOG STUDIO · HARDWARE CORPORATIVO
          </span>
        )}
      </div>
    </div>
  );
};
