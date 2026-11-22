import { DomainType, GameState, LeftoverItem } from '../types/game';

const QUIET_TEMPLATES: Record<DomainType, { title: string; loud: string }> = {
  CURRICULUM: {
    title: '過薄的課業再出現（未批改積壓）',
    loud: '薄薄被當成班的樣子：科主任抽查發現整疊未改',
  },
  ADMIN: {
    title: '順延的職務紀錄／點名表',
    loud: '空白的職務紀錄：校務處轉來的催交電話',
  },
  STUDENT_ISSUES: {
    title: '仍未開始的學生跟進承諾',
    loud: '你答應過的那句：同一個名字再次在訓導處被問到',
  },
  PARENT_COMMS: {
    title: '未回覆的家長 eClass 訊息',
    loud: '群組裡的名字：家長直接致電校務處投訴未獲回覆',
  },
  POLICY: {
    title: '未完成的聯署／通告回條統計',
    loud: '另一位老師在教員室說出你的名字：全級唯獨你班未交齊',
  },
  PERSONAL: {
    title: '連續數晚帶回家未動過的紅筆與文件',
    loud: '凌晨兩點仍未闔眼：身體發出嚴重透支警號',
  },
};

export function enqueueLeftover(
  state: GameState,
  domain: DomainType,
  customTitleZh?: string
): GameState {
  const existingIdx = state.leftovers.findIndex((item) => item.domain === domain);
  if (existingIdx !== -1) {
    const updated = [...state.leftovers];
    updated[existingIdx] = { ...updated[existingIdx], fermented: true };
    return {
      ...state,
      leftovers: updated,
      postIts: [
        { id: `pi_${Date.now()}`, textZh: `【發酵提醒】${updated[existingIdx].titleZh}`, tone: 'WARN' },
        ...state.postIts.slice(0, 4),
      ],
    };
  }

  const tpl = QUIET_TEMPLATES[domain];
  const newItem: LeftoverItem = {
    id: `lo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    domain,
    titleZh: customTitleZh ?? tpl.title,
    loudTitleZh: tpl.loud,
    fermented: false,
    createdWeek: state.week,
    escalatedCount: 0,
  };

  if (state.leftovers.length >= 3) {
    const [oldest, ...rest] = state.leftovers;
    const erupted: LeftoverItem = {
      ...oldest,
      fermented: true,
      escalatedCount: oldest.escalatedCount + 1,
    };
    const nextStage = Math.min(3, state.escalation.stage + 1) as 0 | 1 | 2 | 3;

    return {
      ...state,
      leftovers: [...rest, newItem],
      meters: {
        ...state.meters,
        stress: Math.min(50, state.meters.stress + 6),
        reputation: Math.max(0, state.meters.reputation - 8),
      },
      escalation: {
        stage: nextStage,
        warningNoteZh: `【Stage ${nextStage} 警告】${erupted.loudTitleZh}`,
      },
      gossipFeed: [
        `教員室耳語：「聽講 ${erupted.loudTitleZh}……」`,
        ...state.gossipFeed.slice(0, 7),
      ],
      postIts: [
        { id: `pi_loud_${Date.now()}`, textZh: `【緊急】${erupted.loudTitleZh}`, tone: 'URGENT' },
        ...state.postIts.slice(0, 4),
      ],
    };
  }

  return {
    ...state,
    leftovers: [...state.leftovers, newItem],
    postIts: [
      { id: `pi_${Date.now()}`, textZh: `待辦積壓：${newItem.titleZh}`, tone: 'INFO' },
      ...state.postIts.slice(0, 4),
    ],
  };
}

export function resolveLeftover(state: GameState, leftoverId: string): GameState {
  return {
    ...state,
    leftovers: state.leftovers.filter((l) => l.id !== leftoverId),
    meters: {
      ...state.meters,
      stress: Math.max(0, state.meters.stress - 2),
      satisfaction: Math.min(100, state.meters.satisfaction + 2),
    },
  };
}
