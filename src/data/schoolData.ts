import {
  HomeworkAssignment,
  StaffProfile,
  StudentProfile,
  TimetableSlot,
} from '../types/game';

export const ALL_18_CLASSES = [
  '1A', '1B', '1C',
  '2A', '2B', '2C',
  '3A', '3B', '3C',
  '4A', '4B', '4C',
  '5A', '5B', '5C',
  '6A', '6B', '6C',
];

const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '周', '葉', '梁', '何', '羅', '鄧'];
const GIVEN_NAMES = [
  '子軒', '詠詩', '浩然', '嘉欣', '俊傑', '思琪', '宇軒', '凱晴', '卓霖', '心怡',
  '柏豪', '樂瑤', '天朗', '曉晴', '梓峰', '芷晴', '彥廷', '雅雯', '晉銘', '雪兒',
  '昊天', '沛珊', '家樂', '千雪', '文迪', '穎彤', '啟聰', '紫瑩', '銘希', '寶儀',
  '諾言', '美玲', '冠宇', '靖雯', '承恩', '可欣', '偉傑', '詩雅', '景行', '嘉敏',
  '兆倫', '慧敏', '耀祖', '欣宜',
];

export function generateInitialStudents(): StudentProfile[] {
  const students: StudentProfile[] = [];
  let idx = 0;

  // 22 students in 4C (Pastoring + Teaching class)
  for (let i = 0; i < 22; i++) {
    const surname = SURNAMES[idx % SURNAMES.length];
    const given = GIVEN_NAMES[idx % GIVEN_NAMES.length];
    students.push({
      id: `stu_4c_${i + 1}`,
      nameZh: `${surname}${given}`,
      className: '4C',
      seatRow: Math.floor(i / 5),
      seatCol: i % 5,
      rapport: (i % 5 === 0) ? -12 : (i % 4 === 0 ? 15 : 0),
      lastInteractedDay: 0,
      missingHomeworkIds: [],
      detentionScheduled: false,
      detentionServedToday: false,
      rememberedEvents: [],
    });
    idx++;
  }

  // 21 students in 1B (Junior Teaching class) -> 43 named students total
  for (let i = 0; i < 21; i++) {
    const surname = SURNAMES[(idx + 3) % SURNAMES.length];
    const given = GIVEN_NAMES[(idx + 7) % GIVEN_NAMES.length];
    students.push({
      id: `stu_1b_${i + 1}`,
      nameZh: `${surname}${given}`,
      className: '1B',
      seatRow: Math.floor(i / 5),
      seatCol: i % 5,
      rapport: (i % 6 === 0) ? -10 : 5,
      lastInteractedDay: 0,
      missingHomeworkIds: [],
      detentionScheduled: false,
      detentionServedToday: false,
      rememberedEvents: [],
    });
    idx++;
  }

  return students;
}

export function generateInitialStaff(): StaffProfile[] {
  return [
    {
      id: 'staff_panel_head',
      nameZh: '張科主任 (Mr. Cheung)',
      roleZh: '英文科科主任 (English Panel Head)',
      channel: 'MANAGEMENT',
      trust: 0,
      lastInteractedDay: 0,
      rememberedEvents: [],
    },
    {
      id: 'staff_vp',
      nameZh: '周副校長 (VP Chow)',
      roleZh: '副校長（教務及查簿）',
      channel: 'MANAGEMENT',
      trust: 0,
      lastInteractedDay: 0,
      rememberedEvents: [],
    },
    {
      id: 'staff_mentor',
      nameZh: '陳老師 (Miss Chan)',
      roleZh: '隔離位資深英文科老師',
      channel: 'FELLOW_TEACHERS',
      trust: 22,
      lastInteractedDay: 0,
      rememberedEvents: ['開學前帶你行熟校舍'],
    },
    {
      id: 'staff_colleague_2',
      nameZh: '吳老師 (Mr. Ng)',
      roleZh: '4B班主任兼體育科老師',
      channel: 'FELLOW_TEACHERS',
      trust: 8,
      lastInteractedDay: 0,
      rememberedEvents: [],
    },
  ];
}

// Rotating HK 5-day timetable with 2 double English lessons per class per week
export function getDayTimetable(dayOfWeek: 1 | 2 | 3 | 4 | 5): TimetableSlot[] {
  const baseStart: TimetableSlot[] = [
    {
      id: 'ct_time',
      startMin: 480, // 08:00
      endMin: 500,   // 08:20
      labelZh: '早會及班主任課 (4C)',
      targetRoom: 'CLASS_4C',
      className: '4C',
      isTeaching: false,
    },
  ];

  // Rotate classes across days; include double lessons
  const patterns: Record<1 | 2 | 3 | 4 | 5, TimetableSlot[]> = {
    1: [
      { id: 'p1_2', startMin: 500, endMin: 600, labelZh: '第1–2節 連堂：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isDoubleLesson: true, isTeaching: true },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息 (教員室 / 追功課)', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3', startMin: 620, endMin: 670, labelZh: '第3節：空堂 (批改/備課)', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p4', startMin: 670, endMin: 720, labelZh: '第4節：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isTeaching: true },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5_6', startMin: 770, endMin: 870, labelZh: '第5–6節 連堂：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isDoubleLesson: true, isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段 (15:30後可離校或加班)', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    2: [
      { id: 'p1', startMin: 500, endMin: 550, labelZh: '第1節：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isTeaching: true },
      { id: 'p2', startMin: 550, endMin: 600, labelZh: '第2節：空堂 (批改/行政)', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3_4', startMin: 620, endMin: 720, labelZh: '第3–4節 連堂：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isDoubleLesson: true, isTeaching: true },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5', startMin: 770, endMin: 820, labelZh: '第5節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p6', startMin: 820, endMin: 870, labelZh: '第6節：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    3: [
      { id: 'p1_2', startMin: 500, endMin: 600, labelZh: '第1–2節 連堂：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isDoubleLesson: true, isTeaching: true },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3', startMin: 620, endMin: 670, labelZh: '第3節：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isTeaching: true },
      { id: 'p4', startMin: 670, endMin: 720, labelZh: '第4節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5', startMin: 770, endMin: 820, labelZh: '第5節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p6', startMin: 820, endMin: 870, labelZh: '第6節：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    4: [
      { id: 'p1', startMin: 500, endMin: 550, labelZh: '第1節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p2', startMin: 550, endMin: 600, labelZh: '第2節：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isTeaching: true },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3', startMin: 620, endMin: 670, labelZh: '第3節：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isTeaching: true },
      { id: 'p4', startMin: 670, endMin: 720, labelZh: '第4節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5_6', startMin: 770, endMin: 870, labelZh: '第5–6節 連堂：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isDoubleLesson: true, isTeaching: true },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
    5: [
      { id: 'p1', startMin: 500, endMin: 550, labelZh: '第1節：4C 英文', targetRoom: 'CLASS_4C', className: '4C', isTeaching: true },
      { id: 'p2', startMin: 550, endMin: 600, labelZh: '第2節：空堂', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'r1', startMin: 600, endMin: 620, labelZh: '小息', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p3_4', startMin: 620, endMin: 720, labelZh: '第3–4節 連堂：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isDoubleLesson: true, isTeaching: true },
      { id: 'lunch', startMin: 720, endMin: 770, labelZh: '午膳時段', targetRoom: 'STAFFROOM', isTeaching: false },
      { id: 'p5', startMin: 770, endMin: 820, labelZh: '第5節：1B 英文', targetRoom: 'CLASS_1B', className: '1B', isTeaching: true },
      { id: 'p6', startMin: 820, endMin: 870, labelZh: '第6節：4C 週會/班務', targetRoom: 'CLASS_4C', className: '4C', isTeaching: false },
      { id: 'after', startMin: 870, endMin: 930, labelZh: '放學時段', targetRoom: 'STAFFROOM', isTeaching: false },
    ],
  };

  return [...baseStart, ...patterns[dayOfWeek]];
}

export function createInitialHomework(): HomeworkAssignment[] {
  return [
    {
      id: 'hw_4c_w1',
      className: '4C',
      title: '4C Writing 1 (Argumentative Essay)',
      type: 'COMPOSITION',
      dueWeek: 1,
      dueDay: 1,
      deliveredToDesk: false,
      totalStudents: 22,
      submittedCount: 19,
      markedCount: 0,
      missingStudentIds: ['stu_4c_1', 'stu_4c_6', 'stu_4c_11'],
      followUpLogged: false,
    },
    {
      id: 'hw_1b_d1',
      className: '1B',
      title: '1B Dictation 1 (Unit 1 Vocab)',
      type: 'DICTATION',
      dueWeek: 1,
      dueDay: 1,
      deliveredToDesk: false,
      totalStudents: 21,
      submittedCount: 19,
      markedCount: 0,
      missingStudentIds: ['stu_1b_1', 'stu_1b_7'],
      followUpLogged: false,
    },
  ];
}
