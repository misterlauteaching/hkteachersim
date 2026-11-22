import { getDayTimetable } from '../data/schoolData';
import { GameState, PolicyStance } from '../types/game';
import { enqueueLeftover } from './fermentation';

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

export function rollSimulatedSuccess(
  state: GameState,
  relevantTraitValue: number
): 'CLEAN' | 'MEDIOCRE_BAD' | 'BAD_LEFTOVER' | 'CRITICAL_SLIP' {
  const rawRate = 42 + state.traits.luck * 2.0 + relevantTraitValue * 2.5 - 10;
  const cappedRate = clamp(15, 70, rawRate);
  const roll = Math.random() * 100;
  if (roll < cappedRate * 0.38) return 'CLEAN';
  if (roll < cappedRate) return 'MEDIOCRE_BAD';
  if (roll < cappedRate + (100 - cappedRate) * 0.72) return 'BAD_LEFTOVER';
  return 'CRITICAL_SLIP';
}

export function simulateWorkMicro(
  state: GameState,
  workKind: 'MARKING' | 'OBEDIENT_CLASS',
  assignmentId?: string
): GameState {
  const traitVal = workKind === 'MARKING' ? state.traits.subjectKnowledge : state.traits.patience;
  const outcome = rollSimulatedSuccess(state, traitVal);

  let next: GameState = {
    ...state,
    clockMinutes: Math.min(1140, state.clockMinutes + 35),
    meters: { ...state.meters, energy: Math.max(3, state.meters.energy - 2) },
  };

  if (workKind === 'MARKING' && assignmentId) {
    next.homeworkLedger = next.homeworkLedger.map((hw) =>
      hw.id === assignmentId ? { ...hw, markedCount: hw.submittedCount } : hw
    );
  }

  if (outcome === 'MEDIOCRE_BAD') {
    next.meters.reputation = Math.max(0, next.meters.reputation - 3);
    next.postIts = [
      { id: `pi_sim_${Date.now()}`, textZh: '便利貼：科主任留意到快速批改有少許疏漏。', tone: 'WARN' },
      ...next.postIts.slice(0, 4),
    ];
  } else if (outcome === 'BAD_LEFTOVER') {
    next = enqueueLeftover(next, workKind === 'MARKING' ? 'CURRICULUM' : 'STUDENT_ISSUES');
  } else if (outcome === 'CRITICAL_SLIP') {
    next.meters.stress = Math.min(50, next.meters.stress + 4);
    next.meters.reputation = Math.max(0, next.meters.reputation - 5);
    next.gossipFeed = [
      '教員室耳語：「佢今次好似趕收工求其改完交差……」',
      ...next.gossipFeed.slice(0, 7),
    ];
  }

  return next;
}

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

  if (outcome === 'MEDIOCRE_BAD') {
    next.meters.stress = Math.min(50, next.meters.stress + 2);
    next = enqueueLeftover(next, 'ADMIN');
  } else if (outcome === 'BAD_LEFTOVER') {
    next = enqueueLeftover(next, 'PARENT_COMMS');
  } else if (outcome === 'CRITICAL_SLIP') {
    next.meters.stress = Math.min(50, next.meters.stress + 5);
    next = enqueueLeftover(next, 'STUDENT_ISSUES');
  }

  if (next.dayOfWeek < 5) {
    next.dayOfWeek = (next.dayOfWeek + 1) as 1 | 2 | 3 | 4 | 5;
    next.daySchedule = getDayTimetable(next.dayOfWeek, next.pastorClass, next.teachClass);
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
