export enum GameState {
  LANDING = 'LANDING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: 'TREE' | 'ROCK' | 'GATE';
  width: number;
  height: number;
  passed?: boolean;
  missed?: boolean;
  color?: string;
}

export interface Player {
  x: number; // 0 to 100 percentage of screen width
  y: number; // fixed vertical position
  width: number;
  height: number;
}