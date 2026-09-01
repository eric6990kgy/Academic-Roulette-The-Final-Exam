
export type PlayerType = 'student' | 'professor';

export enum ItemType {
  CHEAT_SHEET = 'CHEAT_SHEET',    // Magnifying Glass (See next)
  ENERGY_DRINK = 'ENERGY_DRINK',  // Cigarettes (Heal)
  SICK_LEAVE = 'SICK_LEAVE',      // Beer (Eject shell)
  RED_PEN = 'RED_PEN',            // Hand Saw (Double Dmg)
  GROUP_PROJECT = 'GROUP_PROJECT' // Handcuffs (Skip turn)
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  items: Partial<Record<ItemType, number>>;
  name: string;
}

export interface LogMessage {
  id: string;
  text: string;
  type: 'info' | 'damage' | 'heal' | 'item' | 'turn' | 'win' | 'loss';
  timestamp: string;
}

export interface GameState {
  round: number;
  turn: PlayerType;
  student: PlayerStats;
  professor: PlayerStats;
  bullets: ('live' | 'blank')[]; // live = tricky question (hurt), blank = easy question (safe)
  knownNextBullet: boolean;
  doubleDamage: boolean; // Saw active
  opponentSkipped: boolean; // Handcuffs active
  gameOver: boolean;
  winner: PlayerType | null;
  logs: LogMessage[];
  gameStarted: boolean;
  gameVariant: 'classic' | 'event';
}

export const INITIAL_HP: Record<number, number> = {
  1: 2,
  2: 3,
  3: 5
};
