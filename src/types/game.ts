// Core v1 TypeScript Schema — Zero raw numbers ever leak directly to UI

export type GameMode =
  | 'WEEK_PLANNING'
  | 'SCHOOL_DAY'
  | 'SCENE'
  | 'REVIEW'
  | 'HOLIDAY';

export type DomainType =
  | 'CURRICULUM'
  | 'ADMIN'
  | 'STUDENT_ISSUES'
  | 'PARENT_COMMS'
  | 'POLICY'
  | 'PERSONAL';

export type EffortBand = '低' | '低中' | '中' | '中高' | '高' | '極高';

export type AttitudeBand = 'Wary' | 'Guarded' | 'Neutral' | 'Warm' | 'Devoted';

export type PolicyStance =
  | 'ADMIN_FIRST'     // 保底交差
  | 'STUDENTS_FIRST'  // 學生為本
  | 'SELF_PRESERVE'   // 準時收工
  | 'BALANCED';       // 平均應付

export type RoomId =
  | 'STAFFROOM'
  | 'CORRIDOR'
  | 'CLASS_4C'
  | 'CLASS_1B'
  | 'DETENTION_ROOM'
  | 'GATE';

export interface HiddenTraits {
  subjectKnowledge: number;
  social: number;
  luck: number; // Static +2.5% per point
  physique: number;
  patience: number;
  resilience: number;
  ceilings: {
    subjectKnowledge: number;
    social: number;
    physique: number;
    patience: number;
    resilience: number;
  };
}

export interface HiddenMeters {
  energy: number;       // 0-20, Floor 3
  stress: number;       // 0-50, Danger thresholds 45 & 48
  standing: number;     // 0-100
  reputation: number;   // 0-100
  parentTrust: number;  // 0-100
  satisfaction: number; // 0-100
}

export interface LeftoverItem {
  id: string;
  domain: DomainType;
  titleZh: string;
  loudTitleZh: string;
  fermented: boolean; // false = Quiet Return (E), true = Loud Return (F)
  createdWeek: number;
  escalatedCount: number;
}

export interface StudentProfile {
  id: string;
  nameZh: string;
  className: '4C' | '1B';
  seatRow: number;
  seatCol: number;
  rapport: number; // Hidden -100..+100
  lastInteractedDay: number;
  missingHomeworkIds: string[];
  detentionScheduled: boolean;
  detentionServedToday: boolean;
  rememberedEvents: string[];
}

export interface StaffProfile {
  id: string;
  nameZh: string;
  roleZh: string;
  channel: 'FELLOW_TEACHERS' | 'MANAGEMENT';
  trust: number; // Hidden -100..+100
  lastInteractedDay: number;
  rememberedEvents: string[];
}

export interface HomeworkAssignment {
  id: string;
  className: '4C' | '1B';
  title: string; // e.g. '4C Writing 1'
  type: 'DICTATION' | 'GRAMMAR' | 'COMPOSITION';
  dueWeek: number;
  dueDay: number;
  deliveredToDesk: boolean;
  totalStudents: number;
  submittedCount: number;
  markedCount: number;
  missingStudentIds: string[];
  followUpLogged: boolean; // Audited by Vice Principal in June
}

export interface ClassroomIncident {
  id: string;
  studentId: string;
  studentNameZh: string;
  seatRow: number;
  seatCol: number;
  postureHintZh: string; // Diegetic posture cue (no icons)
  promptZh: string;
  options: {
    id: string;
    labelZh: string;
    effort: EffortBand;
    traitUsed: 'subjectKnowledge' | 'social' | 'patience';
    assignDetention?: boolean;
  }[];
  resolved: boolean;
}

export interface TimetableSlot {
  id: string;
  startMin: number; // Minutes from 00:00 (e.g. 480 = 08:00)
  endMin: number;
  labelZh: string;
  targetRoom: RoomId;
  className?: '4C' | '1B';
  isDoubleLesson?: boolean;
  isTeaching: boolean;
}

export interface EscalationState {
  stage: 0 | 1 | 2 | 3; // 3 = Dismissal (Game Over)
  warningNoteZh?: string;
}

export interface ActiveScene {
  titleZh: string;
  speakerZh: string;
  bodyZh: string;
  effortShown?: EffortBand;
  choices: {
    id: string;
    labelZh: string;
    effort?: EffortBand;
    actionType: 'RESOLVE_INCIDENT' | 'CHASE_HW' | 'GOSSIP' | 'INFO_ONLY';
    payload?: Record<string, unknown>;
  }[];
}

export interface DeskPostIt {
  id: string;
  textZh: string;
  tone: 'INFO' | 'WARN' | 'URGENT';
}

export interface GameState {
  mode: GameMode;
  week: number; // -1, 0 = Late August Onboarding; 1..36 = Sept..June
  dayOfWeek: 1 | 2 | 3 | 4 | 5; // Mon..Fri
  clockMinutes: number; // 480 (08:00) to 1140 (19:00)
  clockPaused: boolean;
  curfewTriggered: boolean; // True at 19:00 (1140)
  snacksRemainingToday: number;
  coffeeCountToday: number;

  // Spatial position
  currentRoom: RoomId;
  playerGridX: number;
  playerGridZ: number;

  // Lesson state
  inLesson: boolean;
  activeLessonClass: '4C' | '1B' | null;
  lessonProgress: number; // 0..100
  lessonIsDouble: boolean;
  activeIncidents: ClassroomIncident[];

  // Core simulation structures
  traits: HiddenTraits;
  meters: HiddenMeters;
  escalation: EscalationState;
  leftovers: LeftoverItem[]; // Max 3 FIFO slots
  students: StudentProfile[];
  staff: StaffProfile[];
  homeworkLedger: HomeworkAssignment[];
  postIts: DeskPostIt[];
  gossipFeed: string[];
  weeklyLog: string[];
  activeScene: ActiveScene | null;
  daySchedule: TimetableSlot[];
  eveningSummaryZh: string | null;
  weeklyReviewLines: string[];
  monthlyReviewData: {
    rating: 'Below' | 'Meeting' | 'Above';
    criticismZh: string;
    expectationZh: string;
  } | null;
}
