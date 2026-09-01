import { GameState, ItemType, PlayerType, INITIAL_HP } from '../types';

export const generateBullets = (count?: number) => {
  const total = count || Math.floor(Math.random() * 6) + 2; // 2 to 8 bullets
  const liveCount = Math.max(1, Math.floor(total / 2));
  const blankCount = total - liveCount;
  
  const bullets = [
    ...Array(liveCount).fill('live'),
    ...Array(blankCount).fill('blank')
  ] as ('live' | 'blank')[];
  
  // Shuffle
  for (let i = bullets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bullets[i], bullets[j]] = [bullets[j], bullets[i]];
  }
  
  return { bullets, liveCount, blankCount };
};

export const distributeItems = (round: number): ItemType[] => {
  const count = round === 1 ? 0 : round === 2 ? 2 : 4;
  return getRandomItems(count);
};

export const getRandomItems = (count: number): ItemType[] => {
  const pool = Object.values(ItemType);
  const items: ItemType[] = [];
  for (let i = 0; i < count; i++) {
    items.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return items;
};

export const createLog = (text: string, type: any = 'info') => ({
  id: Math.random().toString(36).substr(2, 9),
  text,
  type,
  timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
});

export const getNextTurn = (current: PlayerType, hitSelfWithBlank: boolean, opponentSkipped: boolean): PlayerType => {
  if (hitSelfWithBlank) return current; // Shoot self with blank = go again
  if (opponentSkipped) return current; // Opponent shackled = go again
  return current === 'student' ? 'professor' : 'student';
};