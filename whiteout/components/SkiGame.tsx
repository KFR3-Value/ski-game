import React, { useEffect, useRef } from 'react';
import { Obstacle } from '../types';

interface SkiGameProps {
  onGameOver: () => void;
  onGameWin: () => void;
}

const GAME_DURATION_MS = 30000;
const PLAYER_SIZE = 30; // px
const BASE_SPEED = 6; // pixels per frame

const SkiGame: React.FC<SkiGameProps> = ({ onGameOver, onGameWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const scoreRef = useRef<number>(0);

  // Game State Refs
  const playerXRef = useRef<number>(50); // percentage 0-100
  const targetPercentRef = useRef<number>(50);
  const playerXVelocityRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);
  const nextGateDistanceRef = useRef<number>(200);
  const gateSineAngleRef = useRef<number>(0);
  const gatesPassedRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const isRunningRef = useRef<boolean>(true);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const tilt = event.gamma || 0;
    const clampedTilt = Math.max(-45, Math.min(45, tilt));
    targetPercentRef.current = ((clampedTilt + 45) / 90) * 100;
  };

  const handleTouch = (e: TouchEvent) => {
    const touchX = e.touches[0].clientX;
    targetPercentRef.current = (touchX / window.innerWidth) * 100;
  };

  const handleMouseMove = (e: MouseEvent) => {
    targetPercentRef.current = (e.clientX / window.innerWidth) * 100;
  };

  const update = (canvas: HTMLCanvasElement) => {
    if (!isRunningRef.current) return;

    // Time Check
    const elapsed = Date.now() - startTimeRef.current;
    scoreRef.current = Math.floor((GAME_DURATION_MS - elapsed) / 1000);

    if (elapsed >= GAME_DURATION_MS) {
      isRunningRef.current = false;
      onGameWin();
      return;
    }

    // Physics: Smooth turning with inertia (like Swiss Ski Challenge)
    const currentX = playerXRef.current;
    const diff = targetPercentRef.current - currentX;
    playerXVelocityRef.current += diff * 0.015; // Acceleration/carving force
    playerXVelocityRef.current *= 0.88; // Friction
    playerXRef.current += playerXVelocityRef.current;
    playerXRef.current = Math.max(5, Math.min(95, playerXRef.current));

    // Speed dynamics: turning hard slows you down
    const currentSpeed = BASE_SPEED - Math.abs(playerXVelocityRef.current) * 0.15;
    const effectiveSpeed = Math.max(2.5, currentSpeed);

    distanceRef.current += effectiveSpeed;

    // Course Generation: Spawn Gates & Scenery
    if (distanceRef.current > nextGateDistanceRef.current) {
      const isRed = gatesPassedRef.current % 2 === 0;
      gateSineAngleRef.current += (Math.random() * 0.6 + 0.3); // Curve adjustment
      const maxWander = canvas.width * 0.3;
      let gateX = (canvas.width / 2) + Math.sin(gateSineAngleRef.current) * maxWander;

      // Clamp gate to screen bounds safely
      gateX = Math.max(canvas.width * 0.2, Math.min(canvas.width * 0.8, gateX));

      obstaclesRef.current.push({
        id: Date.now() + Math.random(),
        x: gateX,
        y: canvas.height + 100,
        type: 'GATE',
        width: 170, // Width between the two poles (gate gap)
        height: 20,
        color: isRed ? '#ef4444' : '#3b82f6',
        passed: false,
        missed: false,
      });

      // Spawn random trees on the far edges to give downhill context
      if (Math.random() > 0.3) {
        obstaclesRef.current.push({
          id: Date.now() + Math.random(),
          x: Math.random() > 0.5 ? canvas.width * (Math.random() * 0.15) : canvas.width * (0.85 + Math.random() * 0.15),
          y: canvas.height + 100 + Math.random() * 100,
          type: 'TREE',
          width: 40,
          height: 40,
        });
      }

      nextGateDistanceRef.current += 300; // Distance between gates
    }

    // Move Everything Up
    obstaclesRef.current.forEach(obs => {
      obs.y -= effectiveSpeed;
    });

    // Cleanup passed items
    obstaclesRef.current = obstaclesRef.current.filter(obs => obs.y > -100);

    // Collision & Logic
    const playerPxX = (playerXRef.current / 100) * canvas.width;
    const playerPxY = canvas.height * 0.2; // Player is fixed at 20% down from top

    const pHitW = PLAYER_SIZE * 0.6;
    const pHitH = PLAYER_SIZE * 0.6;
    const pLeft = playerPxX - pHitW / 2;
    const pRight = playerPxX + pHitW / 2;
    const pTop = playerPxY - pHitH / 2;
    const pBottom = playerPxY + pHitH / 2;

    for (const obs of obstaclesRef.current) {
      if (obs.type === 'GATE') {
        // Did player cross the gate line?
        if (!obs.passed && !obs.missed && playerPxY > obs.y + obs.height / 2) {
          const gateLeft = obs.x - obs.width / 2;
          const gateRight = obs.x + obs.width / 2;

          if (playerPxX >= gateLeft && playerPxX <= gateRight) {
            // Passed cleanly through the gate
            obs.passed = true;
            gatesPassedRef.current += 1;
          } else {
            // Missed the gate!
            obs.missed = true;
            isRunningRef.current = false;
            onGameOver();
            return;
          }
        }

        // Did player hit the poles physically?
        const lpLeft = obs.x - obs.width / 2 - 10;
        const lpRight = obs.x - obs.width / 2 + 10;
        const rpLeft = obs.x + obs.width / 2 - 10;
        const rpRight = obs.x + obs.width / 2 + 10;

        const isHittingLp = (pLeft < lpRight && pRight > lpLeft && pTop < obs.y + obs.height / 2 && pBottom > obs.y - obs.height / 2);
        const isHittingRp = (pLeft < rpRight && pRight > rpLeft && pTop < obs.y + obs.height / 2 && pBottom > obs.y - obs.height / 2);

        if (isHittingLp || isHittingRp) {
          isRunningRef.current = false;
          onGameOver();
          return;
        }
      } else {
        // General Tree/Rock Collision
        const oLeft = obs.x - obs.width / 2;
        const oRight = obs.x + obs.width / 2;
        const oTop = obs.y - obs.height / 2;
        const oBottom = obs.y + obs.height / 2;

        if (pLeft < oRight && pRight > oLeft && pTop < oBottom && pBottom > oTop) {
          isRunningRef.current = false;
          onGameOver();
          return;
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Snow / Night Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a14');
    gradient.addColorStop(1, '#11111f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Speed Lines (blizzard effect)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const offset = (Date.now() / 20) % 50;
    for (let y = -offset; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const playerPxX = (playerXRef.current / 100) * canvas.width;
    const playerPxY = canvas.height * 0.2;

    // Draw Player
    ctx.save();
    ctx.translate(playerPxX, playerPxY);

    // Carving rotation
    const tiltAngle = playerXVelocityRef.current * 0.15;
    ctx.rotate(tiltAngle);

    // Skier Back
    ctx.fillStyle = '#f8fafc'; // Upper body / jacket
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -6, 7, 0, Math.PI * 2);
    ctx.fill();

    // Skis
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(-9, 22);
    ctx.moveTo(9, -15);
    ctx.lineTo(9, 22);
    ctx.stroke();

    // Ski Poles
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-6, 20);
    ctx.moveTo(16, 0);
    ctx.lineTo(6, 20);
    ctx.stroke();

    ctx.restore();

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      if (obs.type === 'GATE') {
        const halfW = obs.width / 2;
        const flagColor = obs.color || '#ef4444';

        // Base poles
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-halfW, -20);
        ctx.lineTo(-halfW, 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(halfW, -20);
        ctx.lineTo(halfW, 20);
        ctx.stroke();

        // Flags
        ctx.fillStyle = flagColor;
        ctx.beginPath();
        ctx.moveTo(-halfW, -15);
        ctx.lineTo(-halfW + 20, -10);
        ctx.lineTo(-halfW, -5);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(halfW, -15);
        ctx.lineTo(halfW + 20, -10);
        ctx.lineTo(halfW, -5);
        ctx.fill();

        if (obs.passed) {
          // Glowing line between poles if passed cleanly
          ctx.strokeStyle = flagColor + '40';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-halfW, 0);
          ctx.lineTo(halfW, 0);
          ctx.stroke();
        } else if (obs.missed) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.fillRect(-halfW, -15, obs.width, 30);
        }

      } else if (obs.type === 'TREE') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -obs.height / 2);
        ctx.lineTo(obs.width / 2, obs.height / 2);
        ctx.lineTo(-obs.width / 2, obs.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // Display Info
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#22d3ee';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${scoreRef.current}s`, canvas.width - 20, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`GATES: ${gatesPassedRef.current}`, canvas.width - 20, 65);
  };

  const loop = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    update(canvas);
    draw(ctx, canvas);

    if (isRunningRef.current) {
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('touchmove', handleTouch);
    window.addEventListener('mousemove', handleMouseMove);

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-night">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-4 left-4 text-xs text-gray-500 font-mono pointer-events-none z-10 bg-night/50 px-2 py-1 rounded">
        TILT/TOUCH TO CARVE &bull; DON'T MISS GATES
      </div>
    </div>
  );
};

export default SkiGame;
