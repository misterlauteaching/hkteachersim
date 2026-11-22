// Visual Teacher's Desk Hub Modal matching the illustrated Desk Hub tiles

import React from 'react';
import { DeskPostIt, HomeworkAssignment, LeftoverItem } from '../types/game';

interface Props {
  open: boolean;
  curfewTriggered: boolean;
  snacksRemaining: number;
  energyCueLabel: string;
  leftovers: LeftoverItem[];
  homeworkLedger: HomeworkAssignment[];
  postIts: DeskPostIt[];
  getMissingNames: (ids: string[]) => string;
  onClose: () => void;
  onRecover: (kind: 'NAP_10' | 'NAP_20' | 'NAP_30' | 'COFFEE' | 'SNACK' | 'CHAT') => void;
  onResolveLeftover: (id: string) => void;
  onSimMarking: (hwId: string) => void;
}

export const DeskHubModal: React.FC<Props> = ({
  open,
  curfewTriggered,
  snacksRemaining,
  energyCueLabel,
  leftovers,
  homeworkLedger,
  postIts,
  getMissingNames,
  onClose,
  onRecover,
  onResolveLeftover,
  onSimMarking,
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        zIndex: 45,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: '#1e293b',
          border: '2px solid #2dd4bf',
          borderRadius: 14,
          padding: 18,
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ color: '#2dd4bf', fontSize: 16 }}>辦公桌工作台 (Teacher's Desk Hub)</h3>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>體力狀態：{energyCueLabel}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}
          >
            關閉
          </button>
        </div>

        {curfewTriggered ? (
          <div style={{ background: '#7f1d1d', padding: 14, borderRadius: 8, fontSize: 13, color: '#fecaca' }}>
            校工已經準備鎖門（19:00），今日唔可以再做嘢喇，請前往校門離校。
          </div>
        ) : (
          <>
            {/* 6 Visual Tile Cards matching Desk Hub */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <div style={tileCardStyle}>
                <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: 13 }}>功課批改 Ledger</div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                  共 {homeworkLedger.length} 項英文功課紀錄
                </div>
              </div>
              <div style={tileCardStyle}>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 13 }}>積壓事項 Tray</div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                  {leftovers.length} / 3 格未完成積壓
                </div>
              </div>
              <div style={tileCardStyle}>
                <div style={{ fontWeight: 700, color: '#a7f3d0', fontSize: 13 }}>小休 Nap</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => onRecover('NAP_10')} style={miniBtnStyle}>10分</button>
                  <button onClick={() => onRecover('NAP_20')} style={miniBtnStyle}>20分</button>
                  <button onClick={() => onRecover('NAP_30')} style={miniBtnStyle}>30分</button>
                </div>
              </div>

              <div style={tileCardStyle}>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13 }}>沖咖啡 Coffee</div>
                <button onClick={() => onRecover('COFFEE')} style={{ ...miniBtnStyle, marginTop: 6 }}>
                  沖一杯 (+精力)
                </button>
              </div>
              <div style={tileCardStyle}>
                <div style={{ fontWeight: 700, color: '#fb7185', fontSize: 13 }}>食零食 Snacks</div>
                <button onClick={() => onRecover('SNACK')} style={{ ...miniBtnStyle, marginTop: 6 }}>
                  食零食 (餘 {snacksRemaining})
                </button>
              </div>
              <div style={tileCardStyle}>
                <div style={{ fontWeight: 700, color: '#c084fc', fontSize: 13 }}>便利貼／傾偈</div>
                <button onClick={() => onRecover('CHAT')} style={{ ...miniBtnStyle, marginTop: 6 }}>
                  同隔離位傾偈
                </button>
              </div>
            </div>

            {/* Homework Detail List */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>英文功課及欠交名單</div>
              {homeworkLedger.map((hw) => {
                const missing = getMissingNames(hw.missingStudentIds);
                return (
                  <div key={hw.id} style={{ background: '#0f172a', padding: 10, borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>{hw.title}</div>
                    <div style={{ color: '#cbd5e1' }}>
                      {hw.deliveredToDesk ? `已交 ${hw.submittedCount}/${hw.totalStudents}｜已改 ${hw.markedCount}` : '08:20 早會後由班長送上桌面'}
                    </div>
                    {missing && <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 2 }}>欠交：{missing}</div>}
                    {hw.deliveredToDesk && hw.markedCount < hw.submittedCount && (
                      <button onClick={() => onSimMarking(hw.id)} style={{ ...miniBtnStyle, marginTop: 6 }}>
                        快速批改（質素較隨機）
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Leftovers & Post-Its */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#0f172a', padding: 10, borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>積壓盤 ({leftovers.length}/3)</div>
                {leftovers.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>目前無積壓。</div>
                ) : (
                  leftovers.map((l) => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span>{l.fermented ? `【爆煲】${l.loudTitleZh}` : l.titleZh}</span>
                      <button onClick={() => onResolveLeftover(l.id)} style={miniBtnStyle}>處理</button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: '#0f172a', padding: 10, borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#fde047', marginBottom: 6 }}>桌面便利貼</div>
                <ul style={{ paddingLeft: 16, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {postIts.slice(0, 3).map((p) => (
                    <li key={p.id}>{p.textZh}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const tileCardStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 10,
  padding: 10,
};

const miniBtnStyle: React.CSSProperties = {
  background: '#334155',
  color: '#f8fafc',
  border: '1px solid #475569',
  borderRadius: 5,
  padding: '4px 8px',
  fontSize: 11,
  cursor: 'pointer',
};
