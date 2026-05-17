import React from 'react';

interface SkierTriggerProps {
  onTrigger: () => void;
}

const SkierTrigger: React.FC<SkierTriggerProps> = ({ onTrigger }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full h-24 overflow-hidden pointer-events-none z-20">
      {/* Decorative snow line */}
      <div className="absolute bottom-0 w-full h-px bg-gray-800 opacity-50" />
      
      {/* Patrolling Skier Container */}
      <div className="absolute bottom-2 w-full animate-patrol pointer-events-auto">
        <button
          onClick={onTrigger}
          className="transform transition-transform active:scale-90 p-4 focus:outline-none"
          aria-label="Start Secret Mission"
        >
          <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] grayscale brightness-200">
            ⛷️
          </div>
        </button>
      </div>
    </div>
  );
};

export default SkierTrigger;