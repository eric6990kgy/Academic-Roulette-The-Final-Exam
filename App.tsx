import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert,
  Zap,
  GraduationCap
} from 'lucide-react';
import { 
  GameState, 
  PlayerType, 
  ItemType, 
  INITIAL_HP,
  LogMessage
} from './types';
import { 
  generateBullets, 
  distributeItems, 
  getRandomItems,
  createLog, 
} from './utils/gameLogic';
import { ITEM_DETAILS, AVATARS, LEVEL_INFO, FLAVOR_TEXT } from './constants';
import { playSound } from './utils/audio';
import Button from './components/Button';
import GameLog from './components/GameLog';
import ItemCard from './components/ItemCard';
import Navbar from './components/Navbar';

// Main App Component
const App: React.FC = () => {
  // --- Audio State ---
  const [muted, setMuted] = useState(false);

  // --- App Flow State ---
  const [view, setView] = useState<'menu' | 'game'>('menu');
  const [username, setUsername] = useState('作弊仔');
  
  // --- Animation State ---
  const [animation, setAnimation] = useState<{
    type: 'idle' | 'attack' | 'damage' | 'dodge' | 'jump';
    actor: PlayerType | null;
    target: PlayerType | null;
  }>({ type: 'idle', actor: null, target: null });

  // --- Dialogue State ---
  const [dialogue, setDialogue] = useState<{
    text: string;
    speaker: PlayerType;
    variant: 'hit' | 'safe' | 'win' | 'loss' | 'info'; // New variant for context
    visible: boolean;
  } | null>(null);

  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    round: 1,
    turn: 'student',
    student: { hp: INITIAL_HP[1], maxHp: INITIAL_HP[1], items: {}, name: username },
    professor: { hp: INITIAL_HP[1], maxHp: INITIAL_HP[1], items: {}, name: '大刀教授' },
    bullets: [],
    knownNextBullet: false,
    doubleDamage: false,
    opponentSkipped: false,
    gameOver: false,
    winner: null,
    logs: [],
    gameStarted: false,
    gameVariant: 'classic'
  });

  const [bulletCounts, setBulletCounts] = useState({ live: 0, blank: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to play sound if not muted
  const playSfx = (type: any) => {
    if (!muted) playSound(type);
  };

  // --- Effects ---
  
  // BGM Control
  useEffect(() => {
    if (muted) {
      playSound('bgm_stop');
      return;
    }

    if (view === 'menu') {
      playSound('bgm_menu');
    } else if (view === 'game') {
       if (gameState.gameOver) {
         playSound('bgm_stop');
       } else {
         playSound('bgm_game');
       }
    }
  }, [muted, view, gameState.gameOver]);

  // Initialize Round
  const startRound = (roundNum: number, currentLogs: LogMessage[] = []) => {
    // Clear dialogue when starting new round
    setDialogue(null);

    // HP progression
    const maxHp = INITIAL_HP[roundNum] || 5;
    const levelInfo = LEVEL_INFO[roundNum] || { subject: `Level ${roundNum}`, title: "未知領域" };
    
    // Distribute items (ONLY FOR ROUND 2 & 3)
    const newItems = roundNum > 1 ? distributeItems(roundNum) : [];
    
    const studentItems = { ...gameState.student.items };
    const professorItems = { ...gameState.professor.items };

    if (roundNum > 1) {
      newItems.forEach(item => {
        studentItems[item] = (studentItems[item] || 0) + 1;
        professorItems[item] = (professorItems[item] || 0) + 1;
      });
    }

    // Generate Bullets
    const { bullets, liveCount, blankCount } = generateBullets();
    
    const itemMsg = roundNum > 1 ? `(發放道具支援)` : `(本關卡禁止使用道具)`;
    const roundLog = createLog(`🔔 鐘聲響起！科目：【${levelInfo.subject}】`, 'info');
    const descLog = createLog(`📜 ${levelInfo.title}。${itemMsg}`, 'info');
    
    if (roundNum > 1) playSfx('reload');

    setGameState(prev => ({
      ...prev,
      round: roundNum,
      turn: 'student', 
      student: { 
        ...prev.student, 
        hp: maxHp, 
        maxHp: maxHp,
        items: roundNum === 1 ? {} : studentItems 
      },
      professor: { 
        ...prev.professor, 
        hp: maxHp, 
        maxHp: maxHp,
        items: roundNum === 1 ? {} : professorItems
      },
      bullets,
      knownNextBullet: false,
      doubleDamage: false,
      opponentSkipped: false,
      gameOver: false,
      winner: null,
      logs: [...currentLogs, roundLog, descLog],
      gameStarted: true
    }));
    
    setBulletCounts({ live: liveCount, blank: blankCount });
  };

  // Start New Game
  const initGame = (variant: 'classic' | 'event') => {
    playSfx('reload');
    setView('game');
    setGameState(prev => ({
      ...prev,
      gameVariant: variant,
      logs: [],
      student: { ...prev.student, name: username },
      gameStarted: true,
      gameOver: false,
      winner: null
    }));
    // Small timeout to allow render
    setTimeout(() => startRound(1), 100);
  };

  const goHome = () => {
    if (gameState.gameStarted && !gameState.gameOver) {
      if (!window.confirm("考試還在進行中，確定要翹課離開嗎？進度將會遺失。")) return;
    }
    
    // Force reset state
    setGameState(prev => ({ ...prev, gameStarted: false, gameOver: false }));
    setView('menu');
  };

  // Bot Logic Fix
  useEffect(() => {
    if (gameState.turn === 'professor' && !gameState.gameOver && !isProcessing && gameState.gameStarted) {
      // Delay AI action to make it feel natural
      const timer = setTimeout(() => {
        executeBotTurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [
    gameState.turn, 
    gameState.gameOver, 
    isProcessing, 
    gameState.gameStarted,
    gameState.professor.items, 
    gameState.professor.hp
  ]);

  // --- Actions ---

  const addLog = (text: string, type: LogMessage['type'] = 'info') => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, createLog(text, type)]
    }));
  };

  // Helper to pick random flavor text
  const getFlavorText = (
    round: number, 
    type: 'student_attack' | 'student_fail' | 'prof_attack' | 'prof_fail' | 'student_safe' | 'prof_safe' | 'game_over' | 'level_pass' | 'game_win'
  ) => {
    const r = FLAVOR_TEXT[round] ? round : 1;
    const texts = FLAVOR_TEXT[r][type];
    if (!texts || texts.length === 0) return "......";
    return texts[Math.floor(Math.random() * texts.length)];
  };

  // Show Dialogue Overlay
  const triggerDialogue = (text: string, speaker: PlayerType, variant: 'hit' | 'safe' | 'win' | 'loss' | 'info', duration = 3500) => {
    setDialogue({ text, speaker, variant, visible: true });
    // Hide after duration
    setTimeout(() => {
      setDialogue(prev => (prev && prev.text === text) ? { ...prev, visible: false } : prev);
    }, duration);
  };

  const handleShoot = (target: PlayerType) => {
    // Check reload at the START of action
    if (gameState.bullets.length === 0) {
      const { bullets, liveCount, blankCount } = generateBullets();
      
      let reloadMsg = "🔄 題庫耗盡，教授去拿新考卷...";
      const studentItems = { ...gameState.student.items };
      const professorItems = { ...gameState.professor.items };

      // ONLY GIVE ITEMS IF ROUND > 1
      if (gameState.round > 1) {
        const bonusItems = getRandomItems(2);
        bonusItems.forEach(item => {
          studentItems[item] = (studentItems[item] || 0) + 1;
          professorItems[item] = (professorItems[item] || 0) + 1;
        });
        reloadMsg += " 雙方趁機偷拿了 2 個道具！(回合重置，由你開始)";
      } else {
        reloadMsg += " 第一關嚴格監視，無法偷拿道具。(回合重置，由你開始)";
      }

      // FORCE TURN to STUDENT on reload
      setGameState(prev => ({ 
        ...prev, 
        bullets,
        turn: 'student', 
        student: { ...prev.student, items: studentItems },
        professor: { ...prev.professor, items: professorItems },
        logs: [...prev.logs, createLog(reloadMsg, "info")]
      }));
      setBulletCounts({ live: liveCount, blank: blankCount });
      playSfx('reload');
      return;
    }

    setIsProcessing(true);
    const shooter = gameState.turn;
    
    // --- ANIMATION START ---
    let animType: 'attack' | 'jump' = 'attack';
    if (target === shooter) {
      animType = 'jump'; // Shoot self = Jump
    }
    
    setAnimation({ type: animType, actor: shooter, target: target });
    // --- ANIMATION END ---

    setTimeout(() => {
      resolveShot(target);
    }, 500); // Wait for attack animation to reach peak
  };

  const resolveShot = (target: PlayerType) => {
    // Copy state to mutate logic locally before setting
    let currentBullets = [...gameState.bullets];
    const bullet = currentBullets.shift()!;
    const isLive = bullet === 'live';
    
    // Damage Calc
    let damage = 1;
    if (gameState.doubleDamage) damage = 2;

    // Update Logs & State
    let logText = "";
    let logType: LogMessage['type'] = 'info';
    let flavorText = "";
    
    // Resolve Shot
    const shooter = gameState.turn;
    const isSelfShot = shooter === target;

    // State updates containers
    let nextStudentHp = gameState.student.hp;
    let nextProfHp = gameState.professor.hp;
    let nextDoubleDamage = false; // Consumed
    let nextKnownNext = false; // Consumed if it was one-time
    let nextTurn = gameState.turn;
    let nextOpponentSkipped = gameState.opponentSkipped;

    if (isLive) {
      // Live Bullet (Real/Hard Question) -> DAMAGE
      playSfx('shoot_live');
      
      // --- ANIMATION HIT ---
      setAnimation({ type: 'damage', actor: null, target: target });
      // -------------------

      if (target === 'student') {
        nextStudentHp -= damage;
        logType = 'damage';
        if (shooter === 'student') {
          // Student shoots self and it's live (Fail)
          // *** CRITICAL CHANGE: Dialogue comes from PROFESSOR mocking the student ***
          flavorText = getFlavorText(gameState.round, 'student_fail');
          logText = `💥 答題失敗！ (學分 -${damage})`; // Log remains neutral or shows effect
          triggerDialogue(flavorText, 'professor', 'hit'); // <-- SPEAKER IS PROFESSOR
        } else {
          // Prof shoots student and it's live (Attack)
          flavorText = getFlavorText(gameState.round, 'prof_attack');
          logText = `💥 ${flavorText} (學分 -${damage})`;
          triggerDialogue(flavorText, 'professor', 'hit'); // 💥 HIT
        }
      } else {
        nextProfHp -= damage;
        logType = 'damage';
        if (shooter === 'student') {
          // Student shoots prof and it's live (Attack)
          flavorText = getFlavorText(gameState.round, 'student_attack');
          logText = `💥 ${flavorText} (教授 HP -${damage})`;
          triggerDialogue(flavorText, 'student', 'hit'); // 💥 HIT
        } else {
          // Prof shoots self and it's live (Fail)
          flavorText = getFlavorText(gameState.round, 'prof_fail');
          logText = `💥 ${flavorText} (教授 HP -${damage})`;
          triggerDialogue(flavorText, 'professor', 'hit'); // 💥 HIT
        }
      }

      if (nextOpponentSkipped) {
        addLog(logText, logType); 
        setTimeout(() => addLog(`⛓️ ${shooter === 'student' ? '教授' : '你'} 還在趕分組報告，沒空出題！(對手回合暫停)`, 'info'), 500);
        nextOpponentSkipped = false; 
        nextTurn = shooter; 
      } else {
         nextTurn = shooter === 'student' ? 'professor' : 'student';
      }

    } else {
      // Blank Bullet (Easy Question) -> SAFE
      playSfx('shoot_blank');
      
      // --- ANIMATION DODGE/SAFE ---
      setAnimation({ type: 'dodge', actor: null, target: target });
      // ---------------------------

      logType = 'info';
      
      if (isSelfShot) {
        // Self shot with blank = Go again
        if (shooter === 'student') {
          flavorText = getFlavorText(gameState.round, 'student_safe');
          logText = `💨 ${flavorText} (獲得再次行動機會)`;
          triggerDialogue(flavorText, 'student', 'safe'); // 🛡️ SAFE
        } else {
          flavorText = getFlavorText(gameState.round, 'prof_safe');
          logText = `💨 ${flavorText} (教授再次行動)`;
          triggerDialogue(flavorText, 'professor', 'safe'); // 🛡️ SAFE
        }
        nextTurn = shooter; 
      } else {
         // Shoot opponent with blank = Miss/No damage
         if (shooter === 'student') {
           logText = `💨 你請教授示範這題... 但這題太簡單了，根本難不倒他。(無傷害)`;
         } else {
           logText = `💨 教授點你回答... 運氣好，這題是送分題！(安全下莊)`;
         }

         if (nextOpponentSkipped) {
            addLog(logText, logType);
             setTimeout(() => addLog(`⛓️ ${shooter === 'student' ? '教授' : '你'} 還在趕分組報告，沒空出題！(對手回合暫停)`, 'info'), 500);
            nextOpponentSkipped = false;
            nextTurn = shooter;
         } else {
            nextTurn = shooter === 'student' ? 'professor' : 'student';
         }
      }
    }

    // Apply State Update
    setGameState(prev => ({
      ...prev,
      bullets: currentBullets,
      student: { ...prev.student, hp: nextStudentHp },
      professor: { ...prev.professor, hp: nextProfHp },
      doubleDamage: nextDoubleDamage,
      knownNextBullet: nextKnownNext,
      opponentSkipped: nextOpponentSkipped,
      turn: nextTurn,
      logs: isLive ? [...prev.logs, createLog(logText, logType)] : [...prev.logs, createLog(logText, logType)]
    }));

    // Reset Animation
    setTimeout(() => {
      setAnimation({ type: 'idle', actor: null, target: null });
    }, 500);

    // Check Win/Loss or Reload
    setTimeout(() => {
      checkGameStatus(nextStudentHp, nextProfHp, currentBullets, nextTurn);
      setIsProcessing(false);
    }, 1200); 
  };

  const checkGameStatus = (sHp: number, pHp: number, bullets: string[], currentTurn: PlayerType) => {
    // 1. GAME OVER (Player Dies)
    if (sHp <= 0) {
      playSfx('loss');
      
      const endText = getFlavorText(gameState.round, 'game_over');
      triggerDialogue(endText, 'professor', 'loss', 6000); // 💀 FAILED

      setGameState(prev => ({ 
        ...prev, 
        gameOver: true, 
        winner: 'professor', 
        logs: [...prev.logs, createLog("💀 學分歸零，你被當掉了！明年重修吧。", "loss")] 
      }));
      return;
    }

    // 2. PROFESSOR DIES (Win Round/Game)
    if (pHp <= 0) {
      playSfx('win');
      
      if (gameState.round < 3) {
         // LEVEL PASS
         const passText = getFlavorText(gameState.round, 'level_pass');
         triggerDialogue(passText, 'professor', 'win', 5000); // 🏆 PASS

         addLog("🎉 教授被你的學識擊敗了！準備進入下個階段的考試...", "win");
         
         // Start next round after 5 seconds
         setTimeout(() => startRound(gameState.round + 1, gameState.logs), 5000);
      } else {
        // GAME WIN (Round 3 cleared)
        const winText = getFlavorText(gameState.round, 'game_win');
        triggerDialogue(winText, 'professor', 'win', 8000); // 🏆 GRADUATE

        setGameState(prev => ({ 
          ...prev, 
          gameOver: true, 
          winner: 'student', 
          logs: [...prev.logs, createLog("🏆 恭喜畢業！你戰勝了所有的期末考，成為了傳奇學霸！", "win")] 
        }));
      }
      return;
    }

    // 3. RELOAD NEEDED (No bullets left)
    if (bullets.length === 0) {
      // Just wait for user to click button which triggers reload logic at start of handleShoot
    }
  };

  const handleUseItem = (item: ItemType, user: PlayerType) => {
    const currentUser = user === 'student' ? gameState.student : gameState.professor;
    if (!currentUser.items[item] || currentUser.items[item]! <= 0) return;

    playSfx('item');

    // Consume item
    const newItems = { ...currentUser.items };
    newItems[item]! -= 1;
    
    setGameState(prev => ({
      ...prev,
      [user]: { ...currentUser, items: newItems }
    }));

    const userName = user === 'student' ? '你' : '教授';

    // Apply Effect
    switch (item) {
      case ItemType.ENERGY_DRINK:
        const max = INITIAL_HP[gameState.round];
        if (currentUser.hp < max) {
          setGameState(prev => ({
            ...prev,
            [user]: { ...prev[user], hp: prev[user].hp + 1 },
            logs: [...prev.logs, createLog(`☕ ${userName} 喝了一大口冰美式，精神來了！(恢復 1 學分)`, "heal")]
          }));
        } else {
          addLog(`☕ ${userName} 喝了冰美式，但精神已經很好了 (滿血)`, "info");
        }
        break;
      
      case ItemType.CHEAT_SHEET:
         if (gameState.bullets.length > 0) {
           const next = gameState.bullets[0];
           const msg = user === 'student' 
             ? `📄 你偷偷瞄了一眼小抄... 下一題是【${next === 'live' ? '必當難題 (實彈)' : '送分題 (空包彈)'}】` 
             : `📄 教授推了推眼鏡，仔細看了一下題目難度...`;
           
           setGameState(prev => ({
             ...prev,
             knownNextBullet: user === 'student', // Only show UI for student
             logs: [...prev.logs, createLog(msg, "item")]
           }));
         }
         break;

      case ItemType.RED_PEN:
        setGameState(prev => ({
          ...prev,
          doubleDamage: true,
          logs: [...prev.logs, createLog(`🖊️ ${userName} 拿出了當人用的紅筆！下一題如果是難題，扣分加倍！`, "item")]
        }));
        break;

      case ItemType.SICK_LEAVE:
        if (gameState.bullets.length > 0) {
          const popped = gameState.bullets[0];
          const remaining = gameState.bullets.slice(1);
          setGameState(prev => ({
            ...prev,
            bullets: remaining,
            logs: [...prev.logs, createLog(`🤒 ${userName} 遞出了假單，這題直接跳過不考。被跳過的是【${popped === 'live' ? '難題' : '送分題'}】`, "item")]
          }));
        }
        break;

      case ItemType.GROUP_PROJECT:
         setGameState(prev => ({
           ...prev,
           opponentSkipped: true,
           logs: [...prev.logs, createLog(`⛓️ ${userName} 啟動強制分組！對方下回合必須趕報告，無法出題。`, "item")]
         }));
         break;
    }
  };

  const executeBotTurn = () => {
    // 1. Check Items
    const items = gameState.professor.items;
    
    // AI Priority 1: Use Cheat Sheet
    if (items[ItemType.CHEAT_SHEET] && items[ItemType.CHEAT_SHEET]! > 0 && Math.random() > 0.3) {
      handleUseItem(ItemType.CHEAT_SHEET, 'professor');
      return; 
    }

    // AI Priority 2: Heal if hurt
    if (items[ItemType.ENERGY_DRINK] && items[ItemType.ENERGY_DRINK]! > 0 && gameState.professor.hp < gameState.professor.maxHp) {
       handleUseItem(ItemType.ENERGY_DRINK, 'professor');
       return;
    }

    // AI Priority 3: Handcuff
    if (items[ItemType.GROUP_PROJECT] && items[ItemType.GROUP_PROJECT]! > 0 && !gameState.opponentSkipped && Math.random() > 0.7) {
      handleUseItem(ItemType.GROUP_PROJECT, 'professor');
      return;
    }

    // AI Priority 4: Saw
    if (items[ItemType.RED_PEN] && items[ItemType.RED_PEN]! > 0 && !gameState.doubleDamage && Math.random() > 0.6) {
       handleUseItem(ItemType.RED_PEN, 'professor');
       return;
    }

    // 2. Shoot (Probability)
    const bullets = gameState.bullets;
    const totalBullets = bullets.length;
    const liveCount = bullets.filter(b => b === 'live').length;
    let target: PlayerType = 'student';
    const probabilityLive = liveCount / totalBullets;

    if (probabilityLive > 0.5) {
      target = Math.random() < 0.9 ? 'student' : 'professor';
    } else if (probabilityLive < 0.5) {
      target = Math.random() < 0.8 ? 'professor' : 'student';
    } else {
      target = Math.random() > 0.4 ? 'student' : 'professor';
    }

    handleShoot(target);
  };

  // --- UI Helpers ---

  const getAvatarClass = (role: PlayerType) => {
    let classes = "transition-all duration-300 transform ";
    
    if (animation.type === 'attack' && animation.actor === role) {
      classes += role === 'student' ? 'animate-attack-up z-30' : 'animate-attack-down z-30';
    } else if (animation.type === 'jump' && animation.actor === role) {
      classes += 'animate-jump z-30';
    } else if (animation.type === 'damage' && animation.target === role) {
      classes += 'animate-damage-effect z-10';
    } else if (animation.type === 'dodge' && animation.target === role) {
      classes += 'animate-dodge-effect';
    } else if (gameState.turn === role && !gameState.gameOver) {
      classes += 'scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] z-20';
    } else {
      classes += 'scale-100 grayscale-[0.3] z-10';
    }
    return classes;
  };

  const HealthBar = ({ current, max, isPlayer }: { current: number, max: number, isPlayer: boolean }) => (
    <div className="flex items-center gap-2">
      <div className={`text-2xl font-black ${isPlayer ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPlayer ? '⚡' : '👹'}
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div 
            key={i}
            className={`
              w-6 h-8 skew-x-12 border border-slate-900 transition-all duration-300 shadow-lg
              ${i < current 
                ? (isPlayer ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]') 
                : 'bg-slate-800/50 opacity-30'}
              ${i === current - 1 ? 'animate-pulse' : ''}
            `}
          />
        ))}
      </div>
    </div>
  );

  // --- Render ---

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/blackboard.png')]">
        
        <Navbar 
          round={gameState.round} 
          onHomeClick={() => {}} 
          muted={muted} 
          onToggleMute={() => setMuted(!muted)}
          gameStarted={false}
        />

        <div className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-slate-700 mt-16 animate-fade-in max-h-[85vh] overflow-y-auto scrollbar-hide">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-emerald-900/50 rounded-full border-4 border-emerald-500 shadow-lg shadow-emerald-500/20">
                <GraduationCap size={64} className="text-emerald-400" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">
              期末大亂鬥
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
              Academic Roulette: The Final Exam
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-black/30 p-4 rounded-xl border border-slate-600/50">
               <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">🔥 故事背景</h3>
               <p className="text-slate-300 text-sm leading-relaxed mb-4">
                 這是一場賭上學位的俄羅斯輪盤。面對傳說中殺人不眨眼的「大刀教授」，你唯一的武器就是手中的原子筆和藏在袖子裡的作弊道具。
                 你必須在三輪地獄考試中存活下來，否則等待你的就是——<span className="text-rose-400 font-bold">二一退學</span>。
               </p>
               
               <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">📜 考場規則</h3>
               <ul className="text-slate-300 text-sm space-y-2 list-none">
                 <li className="flex items-start gap-2">
                   <span className="text-rose-500 font-bold min-w-[4rem]">🔴 難題</span>
                   <span>(實彈)：答錯會扣 1 學分 (HP)。如果是自己答題失敗，會被教授狠狠羞辱。</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="text-sky-400 font-bold min-w-[4rem]">⚪ 送分題</span>
                   <span>(空包彈)：安全無事。</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="text-yellow-400 font-bold min-w-[4rem]">⚡ 機制</span>
                   <span>對<strong className="text-white">自己</strong>回答送分題 (空包彈) 成功，可以獲得<strong className="text-white">額外回合</strong>。</span>
                 </li>
                 <li className="flex items-start gap-2">
                   <span className="text-purple-400 font-bold min-w-[4rem]">🎒 道具</span>
                   <span>第一關沒有道具。第二關開始，每次換新考卷時雙方補充 2 個道具。</span>
                 </li>
               </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">學生姓名</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold"
                placeholder="輸入你的名字..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Button onClick={() => initGame('classic')} fullWidth variant="primary" className="flex flex-col h-auto py-4">
                 <div className="flex items-center gap-2 text-lg">
                    <ShieldAlert size={20} /> 期中考 (普通)
                 </div>
                 <span className="text-xs font-normal opacity-80 mt-1">適合一般學生，標準難度</span>
               </Button>
               <Button onClick={() => initGame('event')} fullWidth variant="danger" className="flex flex-col h-auto py-4">
                 <div className="flex items-center gap-2 text-lg">
                    <Zap size={20} /> 期末地獄 (困難)
                 </div>
                 <span className="text-xs font-normal opacity-80 mt-1">教授火力全開，學分壓力倍增</span>
               </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GAME VIEW - FULL SCREEN LAYOUT
  return (
    <div className="flex flex-col h-screen w-full bg-chalkboard-900 text-slate-100 font-sans bg-[url('https://www.transparenttextures.com/patterns/blackboard.png')] overflow-hidden">
      
      <Navbar 
        round={gameState.round} 
        onHomeClick={goHome} 
        muted={muted} 
        onToggleMute={() => setMuted(!muted)}
        gameStarted={true}
        subjectName={LEVEL_INFO[gameState.round]?.subject}
      />

      {/* Main Container - Adjusted Height to fix clipping */}
      <div className="flex flex-row h-[calc(100vh-64px)] w-full mt-16 min-h-0">

        {/* Game Arena (Left) */}
        <div className="flex-1 flex flex-col h-full min-w-0 relative">
          
          {/* DIALOGUE OVERLAY */}
          {dialogue && dialogue.visible && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className={`
                 relative px-8 py-6 rounded-2xl border-4 shadow-2xl max-w-lg transform animate-pop-in
                 ${dialogue.speaker === 'professor' 
                   ? 'bg-rose-950/90 border-rose-500 text-rose-100' 
                   : 'bg-emerald-950/90 border-emerald-500 text-emerald-100'}
              `}>
                 <div className="absolute -top-4 -left-4 text-4xl">
                   {dialogue.speaker === 'professor' ? '👺' : '🧑‍🎓'}
                 </div>

                 {/* STATUS HEADER - NEW VISUAL CUE */}
                 <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl rounded-tr-lg font-black tracking-wider text-sm border-b border-l
                    ${dialogue.variant === 'hit' ? 'bg-rose-600 border-rose-400 text-white' : 
                      dialogue.variant === 'safe' ? 'bg-sky-600 border-sky-400 text-white' : 
                      dialogue.variant === 'win' ? 'bg-yellow-600 border-yellow-400 text-white' :
                      dialogue.variant === 'loss' ? 'bg-gray-700 border-gray-500 text-white' : 'bg-slate-700 border-slate-500'}
                 `}>
                    {dialogue.variant === 'hit' && '💥 攻擊命中'}
                    {dialogue.variant === 'safe' && '🛡️ 安全迴避'}
                    {dialogue.variant === 'win' && '🏆 順利通關'}
                    {dialogue.variant === 'loss' && '💀 慘遭當掉'}
                 </div>

                 <h3 className="text-xl md:text-2xl font-black text-center leading-snug drop-shadow-md mt-4">
                   "{dialogue.text}"
                 </h3>
                 <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-6 h-6 border-b-4 border-r-4 ${
                    dialogue.speaker === 'professor' ? 'bg-rose-950 border-rose-500' : 'bg-emerald-950 border-emerald-500'
                 }`} />
              </div>
            </div>
          )}

          {/* === TOP ZONE: PROFESSOR (Smaller min-h) === */}
          <div className="h-1/4 min-h-[120px] w-full flex items-center justify-between px-4 md:px-8 bg-black/20 backdrop-blur-sm border-b border-white/5 relative z-10">
              
              {/* Prof Items */}
              <div className="flex-1 flex gap-2 flex-wrap">
                 {Object.entries(gameState.professor.items).map(([key, count]) => {
                     const val = count as number;
                     if (!val || val <= 0) return null;
                     const Details = ITEM_DETAILS[key as ItemType];
                     const Icon = Details.icon;
                     return (
                       <div key={key} className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded flex items-center justify-center text-slate-400 border border-slate-700 shadow-md relative" title={Details.name}>
                         <Icon size={20} />
                         <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-slate-900 font-bold">
                           {val}
                         </span>
                       </div>
                     );
                 })}
              </div>

              {/* Prof Avatar & Status */}
              <div className="flex items-center gap-4">
                   <div className="flex flex-col gap-1 items-center">
                      {gameState.opponentSkipped && gameState.turn === 'student' && <div className="text-2xl animate-bounce filter drop-shadow-lg" title="忙於報告">⛓️</div>}
                      {gameState.doubleDamage && gameState.turn === 'professor' && <span className="text-2xl drop-shadow-md animate-pulse" title="雙倍傷害">🔥</span>}
                   </div>

                   <div className="flex flex-col items-end">
                      <h2 className="text-rose-500 font-black text-xl md:text-3xl tracking-tighter drop-shadow-md">
                        {gameState.professor.name}
                      </h2>
                      <HealthBar current={gameState.professor.hp} max={gameState.professor.maxHp} isPlayer={false} />
                   </div>

                   <div className={getAvatarClass('professor')}>
                      <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-700 rounded-full overflow-hidden border-4 border-rose-900 shadow-2xl relative">
                          <img src={AVATARS.professor} alt="Prof" className="w-full h-full object-cover" />
                      </div>
                   </div>
              </div>
          </div>


          {/* === CENTER ZONE: BATTLEFIELD (Flexible) === */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
              
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />

              {/* The Table */}
              <div className={`
                  relative bg-slate-800 p-6 rounded-2xl border-8 border-slate-700 shadow-2xl flex flex-col items-center gap-4 w-full max-w-xs
                  ${gameState.doubleDamage ? 'shadow-rose-900/60 border-rose-900' : ''}
                  transition-all duration-300 z-20 mx-4
              `}>
                  {/* Bullet Counter */}
                  <div className="absolute -top-4 bg-slate-900 px-4 py-1 rounded-full border border-slate-600 shadow-lg text-sm font-mono flex gap-4">
                    <span className="text-rose-500 font-bold flex items-center gap-2">🔴 {bulletCounts.live}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-300 font-bold flex items-center gap-2">⚪ {bulletCounts.blank}</span>
                  </div>

                  {/* Question Display */}
                  <div className="text-center py-2 w-full">
                    <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Current Question Status</div>
                    <div className="h-20 flex items-center justify-center bg-slate-900/50 rounded-xl border-inner border-slate-900 w-full shadow-inner">
                      <div className="text-6xl animate-pulse filter drop-shadow-lg">
                        {gameState.knownNextBullet ? (
                          gameState.bullets[0] === 'live' ? <span className="text-rose-500">🔴</span> : <span className="text-slate-400">⚪</span>
                        ) : (
                          <span>❓</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {gameState.gameOver ? (
                    <div className="text-center w-full animate-fade-in relative z-50">
                      <div className="text-3xl font-black mb-2 tracking-tighter">
                        {gameState.winner === 'student' ? <span className="text-emerald-400">PASSED</span> : <span className="text-rose-500">FAILED</span>}
                      </div>
                      <Button onClick={goHome} variant="ghost" fullWidth size="md">Return to Menu</Button>
                    </div>
                  ) : (
                    gameState.turn === 'student' ? (
                      <div className="flex gap-3 w-full">
                        <Button 
                          onClick={() => handleShoot('student')} 
                          variant="secondary"
                          disabled={isProcessing}
                          className="flex-1 h-16"
                        >
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-base font-bold">自己答題</span>
                            <span className="text-[10px] opacity-60 font-normal">賭送分題</span>
                          </div>
                        </Button>
                        <Button 
                          onClick={() => handleShoot('professor')} 
                          variant="danger"
                          disabled={isProcessing}
                          className="flex-1 h-16"
                        >
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-base font-bold">點名教授</span>
                            <span className="text-[10px] opacity-60 font-normal">賭難題</span>
                          </div>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-rose-400 font-bold animate-pulse text-center bg-rose-900/20 px-4 py-3 rounded-xl w-full border border-rose-900/50 flex items-center justify-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" />
                        教授正在翻找題目...
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce delay-75" />
                      </div>
                    )
                  )}
              </div>
          </div>


          {/* === BOTTOM ZONE: STUDENT DESK (Smaller min-h) === */}
          <div className="h-1/3 min-h-[160px] w-full flex items-center justify-between px-4 md:px-8 bg-slate-900/80 backdrop-blur-md border-t border-white/10 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              
              {/* Left: Avatar & Stats */}
              <div className="flex items-center gap-4 h-full py-2">
                   <div className={getAvatarClass('student')}>
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-800 rounded-2xl overflow-hidden border-4 border-emerald-500 shadow-2xl relative">
                        <img src={AVATARS.student} alt="Student" className="w-full h-full object-cover" />
                      </div>
                   </div>

                   <div className="flex flex-col justify-center h-full gap-1">
                      <h2 className="text-emerald-400 font-black text-2xl md:text-3xl flex items-center gap-2 tracking-tighter">
                        {gameState.student.name}
                        {gameState.turn === 'student' && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded animate-pulse font-bold tracking-widest">TURN</span>}
                      </h2>
                      <HealthBar current={gameState.student.hp} max={gameState.student.maxHp} isPlayer={true} />
                      
                      {/* Status Icons */}
                       <div className="flex gap-2 mt-1">
                          {gameState.opponentSkipped && gameState.turn === 'professor' && <div className="text-2xl animate-bounce filter drop-shadow-lg" title="忙於報告">⛓️</div>}
                          {gameState.doubleDamage && gameState.turn === 'student' && <span className="text-2xl drop-shadow-md animate-pulse" title="雙倍傷害">🔥</span>}
                       </div>
                   </div>
              </div>

              {/* Right: Items Desk */}
              <div className="flex-1 h-full flex items-center justify-end pl-4">
                 <div className="flex flex-wrap justify-end gap-2 content-center h-full max-w-2xl overflow-y-auto scrollbar-hide">
                    {Object.values(ItemType).map(itemType => {
                       const count = gameState.student.items[itemType] || 0;
                       if (count <= 0) return null;
                       
                       return (
                          <div key={itemType} className="transform hover:-translate-y-1 transition-transform duration-200">
                            <ItemCard
                              type={itemType}
                              count={count}
                              onClick={() => handleUseItem(itemType, 'student')}
                              disabled={gameState.turn !== 'student' || isProcessing || gameState.gameOver}
                            />
                          </div>
                       );
                    })}
                    {Object.keys(gameState.student.items).length === 0 && (
                       <div className="text-slate-600 text-xs font-bold border-2 border-dashed border-slate-700 rounded-xl p-4 flex items-center justify-center uppercase tracking-widest opacity-50">
                          Empty Desk
                       </div>
                    )}
                 </div>
              </div>

          </div>

        </div>

        {/* === RIGHT SIDEBAR: LOG (Fixed width, full height) === */}
        <div className="w-80 h-full border-l border-white/10 bg-slate-950/80 backdrop-blur relative z-40 shadow-2xl flex flex-col hidden lg:flex">
           <GameLog logs={gameState.logs} />
        </div>

      </div>

    </div>
  );
};

export default App;