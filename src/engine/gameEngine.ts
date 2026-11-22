import {
  createInitialHomework,
  generateInitialStaff,
  generateInitialStudents,
  getDayTimetable,
  pickRandomizedAssignedClasses,
} from '../data/schoolData';
import {
  ClassCode,
  ClassroomIncident,
  GameState,
  PlayerGender,
  RoomId,
} from '../types/game';
import { enqueueLeftover } from './fermentation';

export function createNewGameState(playerGender: PlayerGender = 'MALE'): GameState {
  const { pastorClass, teachClass } = pickRandomizedAssignedClasses();
  const students = generateInitialStudents(pastorClass, teachClass);
  const homeworkLedger = createInitialHomework(pastorClass, teachClass, students);

  for (const hw of homeworkLedger) {
    for (const stuId of hw.missingStudentIds) {
      const stu = students.find((s) => s.id === stuId);
      if (stu) stu.missingHomeworkIds.push(hw.id);
    }
  }

  return {
    mode: 'WEEK_PLANNING',
    playerGender,
    pastorClass,
    teachClass,
    week: 1,
    dayOfWeek: 1,
    clockMinutes: 480,
    clockPaused: true,
    curfewTriggered: false,
    snacksRemainingToday: 2,
    coffeeCountToday: 0,

    currentRoom: 'STAFFROOM',
    inLesson: false,
    activeLessonClass: null,
    lessonProgress: 0,
    lessonIsDouble: false,
    activeIncidents: [],

    traits: {
      subjectKnowledge: 6,
      social: 5,
      luck: 5,
      physique: 5,
      patience: 6,
      resilience: 5,
      ceilings: {
        subjectKnowledge: 10,
        social: 9,
        physique: 8,
        patience: 10,
        resilience: 9,
      },
    },
    meters: {
      energy: 17,
      stress: 14,
      standing: 52,
      reputation: 55,
      parentTrust: 52,
      satisfaction: 55,
    },
    escalation: { stage: 0 },
    leftovers: [],
    students,
    staff: generateInitialStaff(),
    homeworkLedger,
    postIts: [
      {
        id: 'pi_welcome',
        textZh: `開學分班：本學年你任教 ${pastorClass}（兼班主任）及 ${teachClass} 英文科。08:20 早會後記得檢查桌面收齊功課！`,
        tone: 'INFO',
      },
    ],
    gossipFeed: [
      `陳老師（隔離位）：「今年 ${pastorClass} 有幾個同學成日遲交作文，小息記得捉住佢哋。」`,
    ],
    weeklyLog: [],
    activeScene: null,
    daySchedule: getDayTimetable(1, pastorClass, teachClass),
    weeklyReviewLines: [],
  };
}

export function getClockSpeedMultiplier(state: GameState): number {
  if (state.inLesson) return 40;
  if (state.clockMinutes >= 930) return 72;
  return 60;
}

export function advanceClockTick(state: GameState, realDeltaSeconds: number): GameState {
  if (
    state.mode !== 'SCHOOL_DAY' ||
    state.clockPaused ||
    state.curfewTriggered ||
    state.activeScene !== null
  ) {
    return state;
  }

  const speed = getClockSpeedMultiplier(state);
  const inGameDelta = (realDeltaSeconds * speed) / 60;
  let nextMin = state.clockMinutes + inGameDelta;
  let next: GameState = { ...state };

  if (state.clockMinutes < 500 && nextMin >= 500) {
    next.homeworkLedger = next.homeworkLedger.map((hw) =>
      hw.dueDay === next.dayOfWeek && !hw.deliveredToDesk ? { ...hw, deliveredToDesk: true } : hw
    );
    next.postIts = [
      {
        id: `pi_hw_${Date.now()}`,
        textZh: '班長已將今日英文功課放喺你中央辦公桌，行埋去按互動制查閱！',
        tone: 'INFO',
      },
      ...next.postIts.slice(0, 4),
    ];
  }

  if (next.inLesson && next.activeLessonClass) {
    const teachRate =
      (next.lessonIsDouble ? 1.1 : 2.1) *
      (1 + (next.traits.subjectKnowledge - 5) * 0.08);
    next.lessonProgress = Math.min(100, next.lessonProgress + teachRate * realDeltaSeconds);
  }

  if (nextMin >= 1140) {
    nextMin = 1140;
    next.curfewTriggered = true;
    next.inLesson = false;
    next.activeLessonClass = null;
    next.postIts = [
      {
        id: 'pi_curfew',
        textZh: '【19:00 校工鎖門】今日唔可以再做嘢喇，請前往 G/F 校門離校。',
        tone: 'URGENT',
      },
      ...next.postIts.slice(0, 4),
    ];
  }

  next.clockMinutes = nextMin;
  return next;
}

export function spawnClassroomIncidents(
  state: GameState,
  className: ClassCode
): ClassroomIncident[] {
  const classStudents = state.students.filter((s) => s.className === className);
  const picked = [...classStudents].sort(() => Math.random() - 0.5).slice(0, 3);

  const templates = [
    { posture: '趴喺枱面無拎書出嚟', prompt: '見到佢雙眼無神趴喺度，英文書都未打開。' },
    { posture: '側身同隔離位細聲講笑', prompt: '你轉身寫黑板時，佢正同隔離位偷笑傾偈。' },
    { posture: '舉起手但一臉困惑', prompt: '佢指住工作紙上嘅文法題，唔太明白點樣用過去完成式。' },
  ];

  return picked.map((stu, i) => {
    const tpl = templates[i % templates.length];
    const hasMissingHw = stu.missingHomeworkIds.length > 0;
    const options: ClassroomIncident['options'] = [
      { id: 'opt_gentle', labelZh: '行埋去低聲提點並示範一題', effort: '中高', traitUsed: 'patience' },
      { id: 'opt_firm', labelZh: '嚴肅點名警告，要求即時跟上進度', effort: '低中', traitUsed: 'social' },
    ];
    if (hasMissingHw) {
      options.push({
        id: 'opt_detention',
        labelZh: '【欠交跟進】下令今日 16:00 留堂補做功課',
        effort: '中',
        traitUsed: 'social',
        assignDetention: true,
      });
    }

    return {
      id: `inc_${stu.id}_${Date.now()}_${i}`,
      studentId: stu.id,
      studentNameZh: stu.nameZh,
      studentGender: stu.gender,
      seatRow: stu.seatRow,
      seatCol: stu.seatCol,
      postureHintZh: tpl.posture,
      promptZh: `${className} ${stu.nameZh}：${tpl.prompt}${
        hasMissingHw ? '（系統提示：此學生尚有欠交英文功課）' : ''
      }`,
      options,
      resolved: false,
    };
  });
}

export function enterRoom(state: GameState, targetRoom: RoomId): GameState {
  if (state.curfewTriggered && targetRoom !== 'GROUND_FLOOR') {
    return {
      ...state,
      activeScene: {
        titleZh: '校工鎖門提醒 (19:00)',
        speakerZh: '校工陳伯',
        bodyZh: '「老師，已經七點鐘啦，我哋要鎖課室同教員室門喇，快啲落 G/F 校門返屋企休息啦！」',
        choices: [{ id: 'ok', labelZh: '明白，前往 G/F 校門', actionType: 'INFO_ONLY' }],
      },
    };
  }

  let next: GameState = {
    ...state,
    currentRoom: targetRoom,
    clockMinutes: Math.min(1140, state.clockMinutes + 2),
  };

  if (targetRoom.startsWith('CLASS_')) {
    const cls = targetRoom.replace('CLASS_', '') as ClassCode;
    const currentSlot = state.daySchedule.find(
      (s) =>
        s.className === cls &&
        s.isTeaching &&
        state.clockMinutes >= s.startMin - 5 &&
        state.clockMinutes < s.endMin
    );
    if (currentSlot && !state.inLesson) {
      next.inLesson = true;
      next.activeLessonClass = cls;
      next.lessonProgress = 0;
      next.lessonIsDouble = Boolean(currentSlot.isDoubleLesson);
      next.activeIncidents = spawnClassroomIncidents(next, cls);
    }
  } else if (state.inLesson) {
    const unresolvedCount = state.activeIncidents.filter((i) => !i.resolved).length;
    if (unresolvedCount > 0) {
      next = enqueueLeftover(
        next,
        'STUDENT_ISSUES',
        `課堂未及處理的 ${unresolvedCount} 宗學生狀況`
      );
    }
    next.inLesson = false;
    next.activeLessonClass = null;
    next.activeIncidents = [];
  }

  return next;
}

export function performDeskRecovery(
  state: GameState,
  kind: 'NAP_10' | 'NAP_20' | 'NAP_30' | 'COFFEE' | 'SNACK' | 'CHAT'
): GameState {
  if (state.curfewTriggered) return state;

  let next: GameState = { ...state };

  if (kind.startsWith('NAP_')) {
    const mins = kind === 'NAP_10' ? 10 : kind === 'NAP_20' ? 20 : 30;
    const gain = mins === 10 ? 3 : mins === 20 ? 5 : 7;
    next.clockMinutes = Math.min(1140, next.clockMinutes + mins);
    next.meters.energy = Math.min(20, next.meters.energy + gain);
    next.meters.stress = Math.max(0, next.meters.stress - 2);
    if (state.clockMinutes >= 500 && state.clockMinutes < 930 && Math.random() < 0.35) {
      next.meters.reputation = Math.max(0, next.meters.reputation - 2);
      next.gossipFeed = [
        '教員室耳語：「啱啱經過見到新嚟嗰位老師趴喺枱面瞓覺……」',
        ...next.gossipFeed.slice(0, 7),
      ];
    }
  } else if (kind === 'COFFEE') {
    next.clockMinutes = Math.min(1140, next.clockMinutes + 5);
    next.coffeeCountToday += 1;
    next.meters.energy = Math.min(20, next.meters.energy + 3);
    next.meters.stress = Math.min(50, next.meters.stress + (next.coffeeCountToday > 1 ? 2 : 1));
  } else if (kind === 'SNACK') {
    if (next.snacksRemainingToday <= 0) return next;
    next.snacksRemainingToday -= 1;
    next.clockMinutes = Math.min(1140, next.clockMinutes + 5);
    next.meters.energy = Math.min(20, next.meters.energy + 2);
    next.meters.satisfaction = Math.min(100, next.meters.satisfaction + 2);
  } else if (kind === 'CHAT') {
    next.clockMinutes = Math.min(1140, next.clockMinutes + 12);
    next.meters.stress = Math.max(0, next.meters.stress - 4);
    const hints = [
      '陳老師細聲話你知：「周副校今年六月查簿特別嚴，記住每份欠交都要寫低跟進紀錄。」',
      '張科主任經過提醒：「下星期三前要交齊英文科教學進度表。」',
      '陳老師遞粒糖畀你：「頭一年教書係咁㗎喇，唔好樣樣嘢都攬上身。」',
    ];
    next.gossipFeed = [hints[Math.floor(Math.random() * hints.length)], ...next.gossipFeed.slice(0, 7)];
  }

  return next;
}

export function leaveSchoolForToday(state: GameState): GameState {
  if (state.clockMinutes < 930) return state;

  const isFriday = state.dayOfWeek === 5;
  const nextDay = (isFriday ? 1 : state.dayOfWeek + 1) as 1 | 2 | 3 | 4 | 5;
  const nextWeek = isFriday ? state.week + 1 : state.week;

  return {
    ...state,
    mode: isFriday ? 'REVIEW' : 'SCHOOL_DAY',
    week: nextWeek,
    dayOfWeek: nextDay,
    clockMinutes: 480,
    curfewTriggered: false,
    snacksRemainingToday: 2,
    coffeeCountToday: 0,
    currentRoom: 'STAFFROOM',
    inLesson: false,
    activeLessonClass: null,
    activeIncidents: [],
    daySchedule: getDayTimetable(nextDay, state.pastorClass, state.teachClass),
    meters: {
      ...state.meters,
      energy: Math.min(20, state.meters.energy + 8),
      stress: Math.max(0, state.meters.stress - 5),
    },
    weeklyReviewLines: isFriday
      ? [
          `第 ${state.week} 週結束：你成功撐過一週嘅 ${state.pastorClass} 與 ${state.teachClass} 英文教學。`,
          state.leftovers.length > 0
            ? `提示：桌面仍有 ${state.leftovers.length} 項積壓工作未清，下週一要優先處理。`
            : '提示：本週桌面積壓盤清空，下週開局節奏會較輕鬆。',
          '隱約覺得班上有個別學生仲未完全適應你嘅收功課規矩（你唔太確定）。',
        ]
      : [],
  };
}
