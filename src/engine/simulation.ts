// Two-Tier Automation (Macro Day-Sim & Micro Work-Sim)
// Hard 70% hidden success cap + downward skew toward mediocre-bad / bad outcomes

import { GameState, PolicyStance } from '../types/game';
import { enqueueLeftover } from './fermentation';

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

export function rollSimulatedSuccess(
  state: GameState,
  relevantTraitValue: number
): 'CLEAN' | 'MEDIOCRE_BAD' | 'BAD_LEFTOVER' | 'CRITICAL_SLIP' {
  // Hidden formula capped strictly at 70%
  const rawRate =
    42 + state.traits.luck * 2.0 + relevantTraitValue * 2.5 - 10;
  const cappedRate = clamp(15, 70, rawRate);

  const roll = Math.random() * 100;
  // Skewed outcome distribution even when under the 70% cap
  if (roll < cappedRate * 0.38) {
    return 'CLEAN'; // ~25% max at cap
  }
  if (roll < cappedRate) {
    return 'MEDIOCRE_BAD'; // ~40% sloppy pass
  }
  if (roll < cappedRate + (100 - cappedRate) * 0.72) {
    return 'BAD_LEFTOVER'; // ~25% kicks item into leftover queue
  }
  return 'CRITICAL_SLIP'; // ~10% immediate gossip + stress
}

// Micro-Automation: Skip marking stack or skip obedient class lesson
export function simulateWorkMicro(
  state: GameState,
  workKind: 'MARKING' | 'OBEDIENT_CLASS',
  assignmentId?: string
): GameState {
  const traitVal =
    workKind === 'MARKING'
      ? state.traits.subjectKnowledge
      : state.traits.patience;

  const outcome = rollSimulatedSuccess(state, traitVal);
  let next: GameState = {
    ...state,
    clockMinutes: Math.min(1140, state.clockMinutes + 35),
    meters: {
      ...state.meters,
      energy: Math.max(3, state.meters.energy - 2),
    },
  };

  if (workKind === 'MARKING' && assignmentId) {
    next = {
      ...next,
      homeworkLedger: next.homeworkLedger.map((hw) =>
        hw.id === assignmentId ? { ...hw, markedCount: hw.submittedCount } : hw
      ),
    };
  }

  switch (outcome) {
    case 'CLEAN':
      next.weeklyLog = [...next.weeklyLog, '快速處理完成，暫時無發現明顯甩漏。'];
      break;
    case 'MEDIOCRE_BAD':
      next.meters.reputation = Math.max(0, next.meters.reputation - 3);
      next.postIts = [
        {
          id: `pi_sim_${Date.now()}`,
          textZh: '便利貼：科主任留意到快速批改/課堂紀錄有少許疏漏。',
          tone: 'WARN',
        },
        ...next.postIts.slice(0, 4),
      ];
      next.weeklyLog = [...next.weeklyLog, '快速處理勉強過關，但留下少許手尾。'];
      break;
    case 'BAD_LEFTOVER':
      next = enqueueLeftover(
        next,
        workKind === 'MARKING' ? 'CURRICULUM' : 'STUDENT_ISSUES'
      );
      next.weeklyLog = [...next.weeklyLog, '自動處理未如理想，部分工作跌入積壓盤。'];
      break;
    case 'CRITICAL_SLIP':
      next.meters.stress = Math.min(50, next.meters.stress + 4);
      next.meters.reputation = Math.max(0, next.meters.reputation - 5);
      next.gossipFeed = [
        '教員室耳語：「佢今次好似趕收工求其交差……」',
        ...next.gossipFeed.slice(0, 7),
      ];
      next.weeklyLog = [...next.weeklyLog, '快速處理出錯，引來同事側目及額外壓力。'];
      break;
  }

  return next;
}

// Macro-Automation: Football Manager-style routine day skip with policy stance
export function simulateRoutineDayMacro(
  state: GameState,
  stance: PolicyStance
): { nextState: GameState; haltedEarly: boolean; haltReasonZh?: string } {
  let next: GameState = { ...state };
  const traitVal =
    stance === 'ADMIN_FIRST'
      ? state.traits.patience
      : stance === 'STUDENTS_FIRST'
      ? state.traits.social
      : state.traits.resilience;

  const outcome = rollSimulatedSuccess(next, traitVal);

  // Apply baseline stance tradeoffs
  if (stance === 'ADMIN_FIRST') {
    next.meters.reputation = Math.min(100, next.meters.reputation + 2);
    next.meters.standing = Math.max(0, next.meters.standing - 3);
    next.meters.stress = Math.min(50, next.meters.stress + 3);
    next.meters.energy = Math.max(3, next.meters.energy - 4);
  } else if (stance === 'STUDENTS_FIRST') {
    next.meters.standing = Math.min(100, next.meters.standing + 2);
    next.meters.stress = Math.min(50, next.meters.stress + 3);
    next.meters.energy = Math.max(3, next.meters.energy - 4);
    next = enqueueLeftover(next, 'CURRICULUM');
  } else if (stance === 'SELF_PRESERVE') {
    next.meters.energy = Math.min(20, next.meters.energy + 2);
    next.meters.stress = Math.max(0, next.meters.stress - 2);
    next.meters.reputation = Math.max(0, next.meters.reputation - 4);
    next.gossipFeed = [
      '教員室耳語：「準時三點半就唔見人，好瀟灑喎。」',
      ...next.gossipFeed.slice(0, 7),
    ];
  } else {
    next.meters.stress = Math.min(50, next.meters.stress + 2);
    next.meters.energy = Math.max(3, next.meters.energy - 3);
  }

  // Apply skewed simulation roll consequence
  if (outcome === 'MEDIOCRE_BAD') {
    next.meters.stress = Math.min(50, next.meters.stress + 2);
    next = enqueueLeftover(next, 'ADMIN');
  } else if (outcome === 'BAD_LEFTOVER') {
    next = enqueueLeftover(next, 'PARENT_COMMS');
  } else if (outcome === 'CRITICAL_SLIP') {
    next.meters.stress = Math.min(50, next.meters.stress + 5);
    next = enqueueLeftover(next, 'STUDENT_ISSUES');
  }

  // Advance calendar day
  if (next.dayOfWeek < 5) {
    next.dayOfWeek = (next.dayOfWeek + 1) as 1 | 2 | 3 | 4 | 5;
  } else {
    next.mode = 'REVIEW';
    next.weeklyReviewLines = [
      '今個星期靠自動排程撐過咗幾日，表面平靜但暗湧處處。',
      '隱約感覺科主任對你嘅簿冊進度仲有保留。',
      '有幾個學生喺走廊望住你欲言又止（你唔太確定原因）。',
    ];
  }

  next.clockMinutes = 480;
  next.curfewTriggered = false;

  // Emergency Halt conditions (Football Manager pull-back)
  if (next.meters.stress >= 45) {
    return {
      nextState: next,
      haltedEarly: true,
      haltReasonZh: '【緊急中斷】壓力已逼近臨界點，必須親自返校處理！',
    };
  }
  if (next.escalation.stage >= 1 && outcome === 'CRITICAL_SLIP') {
    return {
      nextState: next,
      haltedEarly: true,
      haltReasonZh: '【緊急中斷】積壓事項爆煲，校務處與科主任要求即時跟進！',
    };
  }

  return { nextState: next, haltedEarly: false };
}
