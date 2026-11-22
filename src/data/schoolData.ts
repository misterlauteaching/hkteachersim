import {
  ClassCode,
  HomeworkAssignment,
  StaffProfile,
  StudentProfile,
  TimetableSlot,
} from '../types/game';

export const ALL_18_CLASSES: ClassCode[] = [
  '1A', '1B', '1C',
  '2A', '2B', '2C',
  '3A', '3B', '3C',
  '4A', '4B', '4C',
  '5A', '5B', '5C',
  '6A', '6B', '6C',
];

const JUNIOR_CLASSES: ClassCode[] = ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C'];
const MID_CLASSES: ClassCode[] = ['2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C'];

const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '周', '葉', '梁', '何', '羅', '鄧'];
const MALE_GIVEN = ['子軒', '浩然', '俊傑', '宇軒', '卓霖', '柏豪', '天朗', '梓峰', '彥廷', '晉銘', '昊天', '家樂', '文迪', '啟聰', '銘希', '諾言', '冠宇', '承恩', '偉傑', '景行', '兆倫', '耀祖'];
const FEMALE_GIVEN = ['詠詩', '嘉欣', '思琪', '凱晴', '心怡', '樂瑤', '曉晴', '芷晴', '雅雯', '雪兒', '沛珊', '千雪', '穎彤', '紫瑩', '寶儀', '美玲', '靖雯', '可欣', '詩雅', '嘉敏', '慧敏', '欣宜'];

// Randomizes the 2 classes assigned to the new teacher with a junior-form preference
export function pickRandomizedAssignedClasses(): { pastorClass: ClassCode; teachClass: ClassCode } {
  const pastorPool = Math.random() < 0.72 ? JUNIOR_CLASSES : MID_CLASSES;
  const pastorClass = pastorPool[Math.floor(Math.random() * pastorPool.length)];

  const teachPool = JUNIOR_CLASSES.filter((c) => c !== pastorClass);
  const teachClass = teachPool[Math.floor(Math.random() * teachPool.length)];

  return { pastorClass, teachClass };
}

export function getFloorForClass(cls: ClassCode): 'CORRIDOR_1F' | 'CORRIDOR_2F' | 'CORRIDOR_3F' {
  const form = cls.charAt(0);
  if (form === '1' || form === '2') return 'CORRIDOR_1F';
  if (form === '3' || form === '4') return 'CORRIDOR_2F';
  return 'CORRIDOR_3F';
}

export function generateInitialStudents(pastorClass: ClassCode, teachClass: ClassCode): StudentProfile[] {
  const students: StudentProfile[] = [];
  const usedNames = new Set<string>();

  const makeUniqueName = (gender: 'MALE' | 'FEMALE', seed: number) => {
    const pool = gender === 'MALE' ? MALE_GIVEN : FEMALE_GIVEN;
    for (let attempt = 0; attempt < 60; attempt++) {
      const s = SURNAMES[(seed + attempt * 3) % SURNAMES.length];
      const g = pool[(seed + attempt * 5) % pool.length];
      const full = `${s}${g}`;
      if (!usedNames.has(full)) {
        usedNames.add(full);
        return full;
      }
    }
    return `同學${seed}`;
  };

  // 15 seated desks (3 rows x 5 cols) per class = 30 visible seated students across both classes
  [pastorClass, teachClass].forEach((cls, cIdx) => {
    for (let i = 0; i < 15; i++) {
      const gender: 'MALE' | 'FEMALE' = (i + cIdx) % 2 === 0 ? 'MALE' : 'FEMALE';
      const nameZh = makeUniqueName(gender, i + cIdx * 31 + Math.floor(Math.random() * 17));
      students.push({
        id: `stu_${cls}_${i + 1}`,
        nameZh,
        gender,
        className: cls,
        seatRow: Math.floor(i / 5),
        seatCol: i % 5,
        rapport: i % 5 === 0 ? -12 : i % 4 === 0 ? 15 : 0,
        lastInteractedDay: 0,
        missingHomeworkIds: [],
        detentionScheduled: false,
        rememberedEvents: [],
      });
    }
  });

  return students;
}

export function generateInitialStaff(): StaffProfile[] {
  return [
    {
      id: 'staff_panel_head',
      nameZh: '張科主任 (Mr. Cheung)',
      roleZh: '英文科科主任 (English Panel Head)',
      gender: 'MALE',
      variant: 1,
      channel: 'MANAGEMENT',
      trust: 0,
      lastInteractedDay: 0,
      rememberedEvents: [],
    },
    {
      id: 'staff_vp',
      nameZh: '周副校長 (VP Chow)',
      roleZh: '副校長（教務及查簿）',
      gender: 'MALE',
      variant: 2,
      channel: 'MANAGEMENT',
      trust: 0,
      lastInteractedDay: 0,
      rememberedEvents: [],
    },
    {
      id: 'staff_mentor',
      nameZh: '陳老師 (Miss Chan)',
      roleZh: '隔離位資深英文科老師',
      gender: 'FEMALE',
      variant: 1,
      channel: 'FELLOW_TEACHERS',
      trust: 22,
      lastInteractedDay: 0,
      rememberedEvents: ['開學前帶你行熟校舍'],
    },
    {
      id: 'staff_senior_f',
      nameZh: '李老師 (Ms. Lee)',
      roleZh: '資深班主任兼訓導組老師',
      gender: 'FEMALE',
      variant: 2,
      channel: 'FELLOW_TEACHERS',
      trust: 8,
      lastInteractedDay: 0,
      rememberedEvents: [],
    },
  ];
}

export function getDayTimetable(
  dayOfWeek: 1 | 2 | 3 | 4 | 5,
  pastorClass: ClassCode,
  teachClass: ClassCode
): TimetableSlot[] {
  const baseStart: TimetableSlot[] = [
    {
      id: 'ct_time',
      startMin: 480,
      endMin: 500,
      labelZh: `早會及班主任課 (${pastorClass})`,
      targetRoom: `CLASS_${pastorClass}` as any,
      className: pastorClass,
      isTeaching: false,
    },
  ];

  const patterns: Record<1 | 2 | 3 | 4 | 5, TimetableSlot[]> = {
    1: [
      { id: 'p1_2', startMin: 500, endMin: 600, labelZh: `第1–2節 連堂：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isDoubleLesson: true, isTeaching: true },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息 (教員室 / 走廊追功課)', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3', startMin: 620, endMin: 670, labelZh: '第3節：空堂 (批改/備課)', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p4', startMin: 670, endMin: 720, labelZh: `第4節：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isTeaching: true },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段 (G/F 飯堂 / 教員室)', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5_6', startMin: 770, endMin: 870, labelZh: `第5–6節 連堂：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isDoubleLesson: true, isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段 (15:30後可離校或加班)', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    2: [
      { id: 'p1', startMin: 500, endMin: 550, labelZh: `第1節：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isTeaching: true },
      { id: 'p2', startMin: 550, endMin: 600, labelZh: '第2節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3_4', startMin: 620, endMin: 720, labelZh: `第3–4節 連堂：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isDoubleLesson: true, isTeaching: true },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5', startMin: 770, endMin: 820, labelZh: '第5節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p6', startMin: 820, endMin: 870, labelZh: `第6節：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    3: [
      { id: 'p1_2', startMin: 500, endMin: 600, labelZh: `第1–2節 連堂：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isDoubleLesson: true, isTeaching: true },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3', startMin: 620, endMin: 670, labelZh: `第3節：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isTeaching: true },
      { id: 'p4', startMin: 670, endMin: 720, labelZh: '第4節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5', startMin: 770, endMin: 820, labelZh: '第5節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p6', startMin: 820, endMin: 870, labelZh: `第6節：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    4: [
      { id: 'p1', startMin: 500, endMin: 550, labelZh: '第1節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p2', startMin: 550, endMin: 600, labelZh: `第2節：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isTeaching: true },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3', startMin: 620, endMin: 670, labelZh: `第3節：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isTeaching: true },
      { id: 'p4', startMin: 670, endMin: 720, labelZh: '第4節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5_6', startMin: 770, endMin: 870, labelZh: `第5–6節 連堂：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isDoubleLesson: true, isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    5: [
      { id: 'p1', startMin: 500, endMin: 550, labelZh: `第1節：${pastorClass} 英文`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isTeaching: true },
      { id: 'p2', startMin: 550, endMin: 600, labelZh: '第2節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3_4', startMin: 620, endMin: 720, labelZh: `第3–4節 連堂：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isDoubleLesson: true, isTeaching: true },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5', startMin: 770, endMin: 820, labelZh: `第5節：${teachClass} 英文`, targetRoom: `CLASS_${teachClass}` as any, className: teachClass, isTeaching: true },
      { id: 'p6', startMin: 820, endMin: 870, labelZh: `第6節：${pastorClass} 週會/班務`, targetRoom: `CLASS_${pastorClass}` as any, className: pastorClass, isTeaching: false },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
  };

  return [...baseStart, ...patterns[dayOfWeek]];
}

export function createInitialHomework(
  pastorClass: ClassCode,
  teachClass: ClassCode,
  students: StudentProfile[]
): HomeworkAssignment[] {
  const pastorStus = students.filter((s) => s.className === pastorClass);
  const teachStus = students.filter((s) => s.className === teachClass);

  return [
    {
      id: `hw_${pastorClass}_w1`,
      className: pastorClass,
      title: `${pastorClass} Writing 1 (Guided Composition)`,
      type: 'COMPOSITION',
      dueWeek: 1,
      dueDay: 1,
      deliveredToDesk: false,
      totalStudents: pastorStus.length,
      submittedCount: pastorStus.length - 3,
      markedCount: 0,
      missingStudentIds: [pastorStus[0]?.id, pastorStus[4]?.id, pastorStus[9]?.id].filter(Boolean),
      followUpLogged: false,
    },
    {
      id: `hw_${teachClass}_d1`,
      className: teachClass,
      title: `${teachClass} Dictation 1 (Unit 1 Vocab)`,
      type: 'DICTATION',
      dueWeek: 1,
      dueDay: 1,
      deliveredToDesk: false,
      totalStudents: teachStus.length,
      submittedCount: teachStus.length - 2,
      markedCount: 0,
      missingStudentIds: [teachStus[1]?.id, teachStus[6]?.id].filter(Boolean),
      followUpLogged: false,
    },
  ];
}
