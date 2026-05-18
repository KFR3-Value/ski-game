import React, { useState, useEffect } from 'react';

const TARGET_DATE = new Date('2026-06-04T00:00:00').getTime();

const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = TARGET_DATE - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 font-mono z-10 relative">
      <div className="text-xs tracking-[0.3em] text-gray-500 uppercase">Mission Countdown</div>
      <div className="grid grid-cols-4 gap-4 text-center">
        <TimeUnit value={timeLeft.days} label="TAGE" />
        <TimeUnit value={timeLeft.hours} label="STD" />
        <TimeUnit value={timeLeft.minutes} label="MIN" />
        <TimeUnit value={timeLeft.seconds} label="SEK" />
      </div>
      <div className="text-neon text-sm tracking-widest animate-pulse-slow mt-8">
        STATUS: VORBEREITUNG LÄUFT
      </div>
    </div>
  );
};

const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="text-3xl md:text-5xl font-bold text-white mb-1">
      {String(value).padStart(2, '0')}
    </div>
    <div className="text-[10px] md:text-xs text-gray-600">{label}</div>
  </div>
);

export default Countdown;