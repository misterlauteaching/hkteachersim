export type GameMode =
  | 'WEEK_PLANNING'
  | 'SCHOOL_DAY'
  | 'SCENE'
  | 'REVIEW'
  | 'HOLIDAY';

export type PlayerGender = 'MALE' | 'FEMALE';

export type DomainType =
  | 'CURRICULUM'
  | 'ADMIN'
  | 'STUDENT_ISSUES'
  | 'PARENT_COMMS'
  | 'POLICY'
  | 'PERSONAL';

export type EffortBand = '低' | '低中' | '中' | '中高' | '高' | '極高';
export type AttitudeBand = 'Wary' | 'Guarded' | 'Neutral' | 'Warm' | 'Devoted';
export type PolicyStance = 'ADMIN_FIRST' | 'STUDENTS_FIRST' | 'SELF_PRESERVE' | 'BALANCED';

export type ClassCode =
  | '1A' | '1B' | '1C'
  | '2A' | '2B' | '2C'
  | '3A' | '3B' | '3C'
  | '4A' | '4B' | '4C'
  | '5A' | '5B' | '5C'
  | '6A' | '6B' | '6C';

export type RoomId =
  | 'STAFFROOM'
  | 'CORRIDOR_2F'
  | 'CORRIDOR_1F'
  | 'CORRIDOR_3F'
  | 'SCHOOL_OFFICE'
  | 'PRINCIPAL_OFFICE'
  | 'GROUND_FLOOR'
  | `CLASS_${ClassCode}`;

export interface HiddenTraits {
  subjectKnowledge: number;
  social: number;
  luck: number;
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
  energy: number;
  stress: number;
  standing: number;
  reputation: number;
  parentTrust: number;
  satisfaction: number;
}

export interface LeftoverItem {
  id: string;
  domain: DomainType;
  titleZh: string;
  loudTitleZh: string;
  fermented: boolean;
  createdWeek: number;
  escalatedCount: number;
}

export interface StudentProfile {
  id: string;
  nameZh: string;
  gender: 'MALE' | 'FEMALE';
  className: ClassCode;
  seatRow: number;
  seatCol: number;
  rapport: number;
  lastInteractedDay: number;
  missingHomeworkIds: string[];
  detentionScheduled: boolean;
  rememberedEvents: string[];
}

export interface StaffProfile {
  id: string;
  nameZh: string;
  roleZh: string;
  gender: 'MALE' | 'FEMALE';
  variant: 1 | 2;
  channel: 'FELLOW_TEACHERS' | 'MANAGEMENT';
  trust: number;
  lastInteractedDay: number;
  rememberedEvents: string[];
}

export interface HomeworkAssignment {
  id: string;
  className: ClassCode;
  title: string;
  type: 'DICTATION' | 'GRAMMAR' | 'COMPOSITION';
  dueWeek: number;
  dueDay: number;
  deliveredToDesk: boolean;
  totalStudents: number;
  submittedCount: number;
  markedCount: number;
  missingStudentIds: string[];
  followUpLogged: boolean;
}

export interface ClassroomIncident {
  id: string;
  studentId: string;
  studentNameZh: string;
  studentGender: 'MALE' | 'FEMALE';
  seatRow: number;
  seatCol: number;
  postureHintZh: string;
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
  startMin: number;
  endMin: number;
  labelZh: string;
  targetRoom: RoomId;
  className?: ClassCode;
  isDoubleLesson?: boolean;
  isTeaching: boolean;
}

export interface EscalationState {
  stage: 0 | 1 | 2 | 3;
  warningNoteZh?: string;
}

export interface ActiveScene {
  titleZh: string;
  speakerZh: string;
  speakerPortrait?: string;
  bodyZh: string;
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
  playerGender: PlayerGender;
  pastorClass: ClassCode;
  teachClass: ClassCode;

  week: number;
  dayOfWeek: 1 | 2 | 3 | 4 | 5;
  clockMinutes: number;
  clockPaused: boolean;
  curfewTriggered: boolean;
  snacksRemainingToday: number;
  coffeeCountToday: number;

  currentRoom: RoomId;
  inLesson: boolean;
  activeLessonClass: ClassCode | null;
  lessonProgress: number;
  lessonIsDouble: boolean;
  activeIncidents: ClassroomIncident[];

  traits: HiddenTraits;
  meters: HiddenMeters;
  escalation: EscalationState;
  leftovers: LeftoverItem[];
  students: StudentProfile[];
  staff: StaffProfile[];
  homeworkLedger: HomeworkAssignment[];
  postIts: DeskPostIt[];
  gossipFeed: string[];
  weeklyLog: string[];
  activeScene: ActiveScene | null;
  daySchedule: TimetableSlot[];
  weeklyReviewLines: string[];
}
