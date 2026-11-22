import { AttitudeBand, GameState, HiddenMeters, HiddenTraits } from '../types/game';

export function getAttitudeBand(score: number): AttitudeBand {
  if (score <= -25) return 'Wary';
  if (score <= -8) return 'Guarded';
  if (score < 12) return 'Neutral';
  if (score < 30) return 'Warm';
  return 'Devoted';
}

export function getAttitudeLabelZh(band: AttitudeBand): string {
  const map: Record<AttitudeBand, string> = {
    Wary: '戒備 (Wary)',
    Guarded: '冷淡 (Guarded)',
    Neutral: '平淡 (Neutral)',
    Warm: '友善 (Warm)',
    Devoted: '信任 (Devoted)',
  };
  return map[band];
}

export function getEnergyBodyCue(meters: HiddenMeters): {
  labelZh: string;
  posture: 'UPRIGHT' | 'SLOUCH' | 'EXHAUSTED';
  speedMultiplier: number;
} {
  if (meters.energy <= 5) {
    return { labelZh: '腳步沉重・眼皮打架', posture: 'EXHAUSTED', speedMultiplier: 0.72 };
  }
  if (meters.energy <= 11) {
    return { labelZh: '略顯疲態・想飲杯咖啡', posture: 'SLOUCH', speedMultiplier: 0.9 };
  }
  return { labelZh: '精神尚可・步伐穩健', posture: 'UPRIGHT', speedMultiplier: 1.0 };
}

export function getStressDiegeticCue(meters: HiddenMeters): {
  labelZh: string;
  dangerVignette: boolean;
} {
  if (meters.stress >= 45) {
    return { labelZh: '心跳加速・太陽穴抽痛（臨界）', dangerVignette: true };
  }
  if (meters.stress >= 30) {
    return { labelZh: '枱面文件堆積・精神繃緊', dangerVignette: false };
  }
  return { labelZh: '呼吸平穩・尚算可控', dangerVignette: false };
}

export function getChannelBandSummary(state: GameState) {
  const avgStu = state.students.reduce((acc, s) => acc + s.rapport, 0) / Math.max(1, state.students.length);
  const fellow = state.staff.filter((s) => s.channel === 'FELLOW_TEACHERS');
  const mgmt = state.staff.filter((s) => s.channel === 'MANAGEMENT');
  const avgFellow = fellow.reduce((acc, s) => acc + s.trust, 0) / Math.max(1, fellow.length);
  const avgMgmt = mgmt.reduce((acc, s) => acc + s.trust, 0) / Math.max(1, mgmt.length);

  return {
    students: getAttitudeLabelZh(getAttitudeBand(avgStu)),
    parents: getAttitudeLabelZh(getAttitudeBand(state.meters.parentTrust - 50)),
    colleagues: getAttitudeLabelZh(getAttitudeBand(avgFellow)),
    management: getAttitudeLabelZh(getAttitudeBand(avgMgmt)),
  };
}

export function describeTraitQualitatively(traits: HiddenTraits): string {
  return traits.subjectKnowledge >= 7
    ? '英文科底子紮實，講解文法得心應手'
    : '備課仍需花時間翻查教材與評分準則';
}

export function formatClockZh(minutesFromMidnight: number): string {
  const total = Math.floor(minutesFromMidnight);
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
