import React, { useEffect, useState } from 'react';
import {
  advanceClockTick,
  createNewGameState,
  enterRoom,
  getClockSpeedMultiplier,
  leaveSchoolForToday,
  performDeskRecovery,
} from './engine/gameEngine';
import { resolveLeftover } from './engine/fermentation';
import {
  describeTraitQualitatively,
  formatClockZh,
  getChannelBandSummary,
  getEnergyBodyCue,
  getStressDiegeticCue,
} from './engine/presenter';
import { simulateRoutineDayMacro } from './engine/simulation';
import { defaultSaveAdapter } from './save/saveAdapter';
import { ClassroomIncident, GameState, PlayerGender, PolicyStance, RoomId } from './types/game';
import { DeskHubModal } from './ui/DeskHubModal';
import { HDCampusViewport } from './world/HDCampusViewport';

const DAY_NAMES = ['', '星期一', '星期二', '星期三', '星期四', '星期五'];

export default function App() {
  const [state, setState] = useState<GameState>(() => createNewGameState('MALE'));
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [selectedStance, setSelectedStance] = useState<PolicyStance>('BALANCED');
  const [deskModalOpen, setDeskModalOpen] = useState<boolean>(false);

  useEffect(() => {
    defaultSaveAdapter.load().then((saved) => {
      if (saved) setState(saved);
    });
  }, []);

  useEffect(() => {
    if (state.mode !== 'SCHOOL_DAY') return;
    const timer = setInterval(() => {
      setState((prev) => advanceClockTick(prev, 0.25));
    }, 250);
    return () => clearInterval(timer);
  }, [state.mode]);

  const commitState = (next: GameState, autosave = false) => {
    setState(next);
    if (autosave) defaultSaveAdapter.save(next);
  };

  const handleSelectGender = (gender: PlayerGender) => {
    const fresh = createNewGameState(gender);
    commitState(fresh, true);
  };

  const energyCue = getEnergyBodyCue(state.meters);
  const stressCue = getStressDiegeticCue(state.meters);
  const channels = getChannelBandSummary(state);
  const currentSlot = state.daySchedule.find(
    (s) => state.clockMinutes >= s.startMin && state.clockMinutes < s.endMin
  );

  const handleOpenIncident = (inc: ClassroomIncident) => {
    commitState({
      ...state,
      clockPaused: true,
      activeScene: {
        titleZh: `課室即時處理（${state.activeLessonClass}）`,
        speakerZh: inc.studentNameZh,
        bodyZh: inc.promptZh,
        choices: inc.options.map((o) => ({
          id: o.id,
          labelZh: `${o.labelZh}〔精力消耗：${o.effort}〕`,
          effort: o.effort,
          actionType: 'RESOLVE_INCIDENT',
          payload: { incidentId: inc.id, studentId: inc.studentId, assignDetention: o.assignDetention },
        })),
      },
    });
  };

  const handleSceneChoice = (choice: NonNullable<GameState['activeScene']>['choices'][number]) => {
    let next: GameState = {
      ...state,
      clockPaused: false,
      activeScene: null,
    };

    if (choice.actionType === 'RESOLVE_INCIDENT' && choice.payload) {
      const incidentId = String(choice.payload.incidentId);
      const studentId = String(choice.payload.studentId);
      const assignDetention = Boolean(choice.payload.assignDetention);

      next.activeIncidents = next.activeIncidents.map((i) =>
        i.id === incidentId ? { ...i, resolved: true } : i
      );
      next.meters = {
        ...next.meters,
        energy: Math.max(3, next.meters.energy - 1),
        standing: Math.min(100, next.meters.standing + 2),
      };
      next.students = next.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              rapport: s.rapport + (assignDetention ? -4 : 5),
              detentionScheduled: assignDetention ? true : s.detentionScheduled,
              rememberedEvents: [
                assignDetention ? '被英文老師下令16:00留堂補做功課' : '堂上獲老師耐心指點',
                ...s.rememberedEvents.slice(0, 4),
              ],
            }
          : s
      );
    }

    commitState(next);
  };

  const getMissingStudentNames = (missingIds: string[]) =>
    missingIds
      .map((id) => state.students.find((s) => s.id === id)?.nameZh)
      .filter(Boolean)
      .join('、');

  const portraitSrc =
    state.playerGender === 'MALE'
      ? './assets/sprites/player_male_portrait.png'
      : './assets/sprites/player_female_portrait.png';

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: stressCue.dangerVignette ? 'inset 0 0 60px rgba(220,38,38,0.65)' : 'none',
      }}
    >
      {/* Top Status Header */}
      <header
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={portraitSrc}
            alt="Teacher Portrait"
            style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #2dd4bf', objectFit: 'cover' }}
          />
          <div>
            <span style={{ fontWeight: 700, color: '#2dd4bf', marginRight: 10 }}>
              第 {state.week} 週・{DAY_NAMES[state.dayOfWeek]}
            </span>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{formatClockZh(state.clockMinutes)}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>
              ({state.curfewTriggered ? '19:00 已鎖門' : `${getClockSpeedMultiplier(state)}x`})
            </span>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#e2e8f0' }}>
          任教：<strong>{state.pastorClass} (班主任)</strong> / <strong>{state.teachClass}</strong> ｜ 目前：
          <strong>{currentSlot ? currentSlot.labelZh : '放學／加班時段'}</strong>
        </div>

        <div style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'center' }}>
          <span>體力：{energyCue.labelZh}</span>
          <span>狀態：{stressCue.labelZh}</span>
          <button
            onClick={() => {
              defaultSaveAdapter.clear();
              commitState(createNewGameState(state.playerGender), true);
              setBannerMsg('已重新隨機編班並開啟新學年！');
            }}
            style={{ background: '#334155', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          >
            重開新學年
          </button>
        </div>
      </header>

      {bannerMsg && (
        <div style={{ background: '#7f1d1d', padding: '7px 16px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>{bannerMsg}</span>
          <button onClick={() => setBannerMsg(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Main Responsive Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 12, padding: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {state.mode === 'WEEK_PLANNING' && (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 18, border: '1px solid #334155' }}>
              <h2 style={{ color: '#2dd4bf', marginBottom: 8 }}>新學年・教師角色與週一晨早規劃</h2>
              <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 14 }}>
                本學年隨機編班結果：你獲派擔任 <strong>{state.pastorClass} 班主任兼英文老師</strong>，同時任教 <strong>{state.teachClass} 英文科</strong>。
              </p>

              {/* Male / Female Teacher Avatar Selector */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {(
                  [
                    ['MALE', '男老師 (Lau Sir)', './assets/sprites/player_male_portrait.png'],
                    ['FEMALE', '女老師 (Ms. Cheung)', './assets/sprites/player_female_portrait.png'],
                  ] as [PlayerGender, string, string][]
                ).map(([g, label, img]) => (
                  <button
                    key={g}
                    onClick={() => handleSelectGender(g)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: state.playerGender === g ? '#0f766e' : '#0f172a',
                      border: state.playerGender === g ? '2px solid #2dd4bf' : '1px solid #334155',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <img src={img} alt={label} style={{ width: 44, height: 44, borderRadius: '50%' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#cbd5e1' }}>Smart Casual 造型</div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => commitState({ ...state, mode: 'SCHOOL_DAY', clockPaused: false }, true)}
                style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}
              >
                進入 2/F 教員室開始今日校園生活 (08:00)
              </button>

              <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  【戰術快進】模擬常規上課日（遇危機自動中斷）
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(
                    [
                      ['ADMIN_FIRST', '保底交差'],
                      ['STUDENTS_FIRST', '學生為本'],
                      ['SELF_PRESERVE', '準時收工'],
                      ['BALANCED', '平均應付'],
                    ] as [PolicyStance, string][]
                  ).map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => setSelectedStance(code)}
                      style={{
                        background: selectedStance === code ? '#2563eb' : '#1e293b',
                        color: '#fff',
                        border: '1px solid #475569',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const res = simulateRoutineDayMacro(state, selectedStance);
                    if (res.haltedEarly && res.haltReasonZh) setBannerMsg(res.haltReasonZh);
                    commitState(res.nextState, true);
                  }}
                  style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
                >
                  執行模擬今日（快進一天）
                </button>
              </div>
            </div>
          )}

          {state.mode === 'SCHOOL_DAY' && (
            <>
              <HDCampusViewport
                room={state.currentRoom}
                playerGender={state.playerGender}
                pastorClass={state.pastorClass}
                teachClass={state.teachClass}
                inLesson={state.inLesson}
                students={state.students}
                incidents={state.activeIncidents}
                playerPosture={energyCue.posture}
                dangerVignette={stressCue.dangerVignette}
                onEnterRoom={(rid) => {
                  setDeskModalOpen(false);
                  commitState(enterRoom(state, rid));
                }}
                onSelectIncident={handleOpenIncident}
                onOpenDeskTasks={() => setDeskModalOpen(true)}
                onQuickSnackOrCoffee={(kind) => {
                  commitState(performDeskRecovery(state, kind));
                  setBannerMsg(kind === 'COFFEE' ? '喺茶水吧沖咗杯熱咖啡，精神返啲！' : '食咗份小食，稍微回氣。');
                }}
                onShowToast={(msg) => setBannerMsg(msg)}
              />

              {/* Floor Quick-Jump Bar */}
              <div style={{ background: '#1e293b', borderRadius: 10, padding: 10, border: '1px solid #334155', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>樓層導航：</span>
                {(
                  [
                    ['STAFFROOM', '2/F 教員室'],
                    ['CORRIDOR_2F', '2/F 走廊'],
                    ['CORRIDOR_1F', '1/F 三岔走廊'],
                    ['SCHOOL_OFFICE', '1/F 校務處'],
                    ['PRINCIPAL_OFFICE', '1/F 校長及副校長室'],
                    ['CORRIDOR_3F', '3/F 走廊'],
                    ['GROUND_FLOOR', 'G/F 飯堂/操場'],
                    ['CLASSROOM_PASTOR', `${state.pastorClass} 課室`],
                    ['CLASSROOM_TEACH', `${state.teachClass} 課室`],
                  ] as [RoomId, string][]
                ).map(([rid, label]) => (
                  <button
                    key={rid}
                    onClick={() => {
                      setDeskModalOpen(false);
                      commitState(enterRoom(state, rid));
                    }}
                    style={{
                      background: state.currentRoom === rid ? '#0d9488' : '#334155',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 9px',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}

                {state.clockMinutes >= 930 && (
                  <button
                    onClick={() => {
                      setDeskModalOpen(false);
                      commitState(leaveSchoolForToday(state), true);
                    }}
                    style={{
                      marginLeft: 'auto',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 11px',
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    離開學校・回家休息
                  </button>
                )}
              </div>
            </>
          )}

          {state.mode === 'REVIEW' && (
            <div style={{ background: '#1e293b', borderRadius: 10, padding: 18, border: '1px solid #334155' }}>
              <h2 style={{ color: '#2dd4bf', marginBottom: 10 }}>週日自我檢討 (Weekly Self-Review)</h2>
              <ul style={{ paddingLeft: 18, lineHeight: 1.8, fontSize: 14, marginBottom: 16 }}>
                {state.weeklyReviewLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              <button
                onClick={() => commitState({ ...state, mode: 'WEEK_PLANNING' }, true)}
                style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
              >
                進入新的一週（週一晨早規劃）
              </button>
            </div>
          )}
        </div>

        {/* Right Status & Ledger Sidebar */}
        <aside style={{ background: '#1e293b', borderRadius: 12, padding: 12, border: '1px solid #334155', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
              未完成積壓盤 ({state.leftovers.length} / 3 格)
            </div>
            {state.leftovers.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>暫無積壓事項。</div>
            ) : (
              state.leftovers.map((item) => (
                <div key={item.id} style={{ background: '#0f172a', padding: 8, borderRadius: 6, marginBottom: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{item.fermented ? `【爆煲】${item.loudTitleZh}` : item.titleZh}</span>
                  {!state.curfewTriggered && (
                    <button
                      onClick={() => commitState(resolveLeftover(state, item.id))}
                      style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 11, cursor: 'pointer' }}
                    >
                      處理
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>
              英文科功課及六月查簿紀錄冊
            </div>
            {state.homeworkLedger.map((hw) => {
              const missingNames = getMissingStudentNames(hw.missingStudentIds);
              return (
                <div key={hw.id} style={{ background: '#0f172a', padding: 8, borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 700 }}>{hw.title}</div>
                  <div style={{ color: '#cbd5e1', marginTop: 2 }}>
                    {hw.deliveredToDesk ? `已收 ${hw.submittedCount}/${hw.totalStudents} 份（已改 ${hw.markedCount} 份）` : '08:20 早會後由班長送上中央辦公桌'}
                  </div>
                  {missingNames && (
                    <div style={{ color: '#fbbf24', marginTop: 2, fontSize: 11 }}>欠交：{missingNames}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f472b6', marginBottom: 4 }}>
              四方觀感與教員室風聲
            </div>
            <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 }}>
              學生：{channels.students} ｜ 家長：{channels.parents}<br />
              同事：{channels.colleagues} ｜ 管理層：{channels.management}
            </div>
            <ul style={{ paddingLeft: 16, fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.5 }}>
              {state.gossipFeed.slice(0, 3).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              個人印象：{describeTraitQualitatively(state.traits)}
            </div>
          </div>
        </aside>
      </div>

      {/* Centered Floating Teacher's Tasks Pop-Up */}
      <DeskHubModal
        open={deskModalOpen}
        curfewTriggered={state.curfewTriggered}
        snacksRemaining={state.snacksRemainingToday}
        energyCueLabel={energyCue.labelZh}
        leftovers={state.leftovers}
        homeworkLedger={state.homeworkLedger}
        postIts={state.postIts}
        getMissingNames={getMissingStudentNames}
        onClose={() => setDeskModalOpen(false)}
        onRecover={(kind) => commitState(performDeskRecovery(state, kind))}
        onResolveLeftover={(id) => commitState(resolveLeftover(state, id))}
        onSimMarking={(hwId) =>
          commitState({
            ...state,
            homeworkLedger: state.homeworkLedger.map((h) =>
              h.id === hwId ? { ...h, markedCount: h.submittedCount } : h
            ),
          })
        }
      />

      {/* Student Incident Dialogue Modal (opened by walking up to "!" bubble student) */}
      {state.activeScene && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 55 }}>
          <div style={{ width: '100%', maxWidth: 620, background: '#0f172a', border: '3px solid #2dd4bf', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, color: '#2dd4bf', fontWeight: 700, marginBottom: 4 }}>
              {state.activeScene.titleZh}（時間暫停）
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{state.activeScene.speakerZh}</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>{state.activeScene.bodyZh}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state.activeScene.choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSceneChoice(c)}
                  style={{ textAlign: 'left', background: '#1e293b', color: '#f8fafc', border: '1px solid #475569', borderRadius: 8, padding: '10px 12px', fontSize: 13, cursor: 'pointer' }}
                >
                  ▸ {c.labelZh}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
