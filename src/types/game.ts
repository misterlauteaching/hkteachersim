// Core v1 TypeScript Schema — Zero numbers ever leak directly to UI

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
  energy: number;       // Floor 3
  stress: number;       // Danger thresholds 45 & 48
  standing: number;
  reputation: number;
  parentTrust: number;
  satisfaction: number;
}

export interface LeftoverItem {
  id: string;
  domain: DomainType;
  titleZh: string;
  fermented: boolean; // false = Quiet Return (E), true = Loud Return (F)
  createdWeek: number;
  escalatedCount: number;
}

export interface StudentProfile {
  id: string;
  nameZh: string;
  className: string; // e.g. '4C' or '1B'
  seatIndex: number;
  rapport: number; // Hidden numeric; translated to AttitudeBand
  missingHomeworkIds: string[];
  detentionScheduled: boolean;
  rememberedEvents: string[];
}

export interface HomeworkAssignment {
  id: string;
  className: string;
  title: string; // e.g. '4C Writing 2'
  type: 'DICTATION' | 'GRAMMAR' | 'COMPOSITION';
  totalStudents: number;
  submittedCount: number;
  markedCount: number;
  missingStudentIds: string[];
  followUpLogged: boolean; // Audited by Vice Principal in June
}

export interface EscalationState {
  stage: 0 | 1 | 2 | 3; // 3 = Dismissal (Game Over)
  activeWarningDeadlineWeek?: number;
}
