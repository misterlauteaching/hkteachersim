// 3DS-Pokemon-Style 2.5D Isometric/Fixed-Angle Classroom & Campus Canvas

import React, { useEffect, useRef } from 'react';
import { ClassroomIncident, RoomId } from '../types/game';

interface Props {
  room: RoomId;
  inLesson: boolean;
  incidents: ClassroomIncident[];
  onSelectIncident: (inc: ClassroomIncident) => void;
  onInteractDesk: () => void;
}

const ROOM_LABELS: Record<RoomId, string> = {
  STAFFROOM: '教員室 — 你的辦公桌 (Staffroom & Desk)',
  CORRIDOR: '教學樓走廊 (1A–6C 課室通道)',
  CLASS_4C: '4C 課室 (班主任班 + 英文任教)',
  CLASS_1B: '1B 課室 (中一英文任教)',
  DETENTION_ROOM: '16:00 留堂室 (Detention Room)',
  GATE: '學校正門 (15:30後可離校)',
};

export const CampusViewport: React.FC<Props> = ({
  room,
  inLesson,
  incidents,
  onSelectIncident,
  onInteractDesk,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background floor gradient (3DS-style fixed camera perspective)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw 8x6 modular floor tiles
    const cols = 8;
    const rows = 6;
    const tileW = 68;
    const tileH = 42;
    const offsetX = (w - cols * tileW) / 2;
    const offsetY = 75;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * tileW;
        const y = offsetY + r * tileH;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#334155' : '#293548';
        ctx.fillRect(x, y, tileW - 2, tileH - 2);
      }
    }

    // Room-specific diegetic props
    if (room === 'STAFFROOM') {
      // Teacher's Desk highlight
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(offsetX + 2 * tileW, offsetY + 2 * tileH, tileW * 2 - 2, tileH - 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('你的辦公桌 (點擊開啟)', offsetX + 2 * tileW + 8, offsetY + 2 * tileH + 24);
    } else if (room === 'CLASS_4C' || room === 'CLASS_1B') {
      // Blackboard & Podium
      ctx.fillStyle = '#065f46';
      ctx.fillRect(offsetX + tileW * 2, offsetY - 34, tileW * 4, 24);
      ctx.fillStyle = '#ecfdf5';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${room === 'CLASS_4C' ? '4C' : '1B'} English Lesson — Blackboard`, offsetX + tileW * 2 + 24, offsetY - 18);

      // Student Desks (5 cols x 4 rows)
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
          const dx = offsetX + (c + 1.5) * tileW;
          const dy = offsetY + (r + 1) * tileH;
          const inc = incidents.find((i) => !i.resolved && i.seatRow === r && i.seatCol === c);

          ctx.fillStyle = inc ? '#d97706' : '#475569';
          ctx.fillRect(dx + 6, dy + 6, tileW - 14, tileH - 12);

          ctx.fillStyle = '#f8fafc';
          ctx.font = '11px sans-serif';
          ctx.fillText(inc ? '舉手/異動' : '學生', dx + 10, dy + 24);
        }
      }
    } else if (room === 'CORRIDOR') {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px sans-serif';
      ctx.fillText('走廊兩側：1A–1C / 2A–2C / 3A–3C / 4A–4C / 5A–5C / 6A–6C', offsetX + 60, offsetY + 120);
    } else if (room === 'DETENTION_ROOM') {
      ctx.fillStyle = '#f59e0b';
      ctx.font = '13px sans-serif';
      ctx.fillText('16:00 留堂室：欠交功課學生在此補做（需老師親身巡視點收）', offsetX + 60, offsetY + 120);
    } else if (room === 'GATE') {
      ctx.fillStyle = '#38bdf8';
      ctx.font = '13px sans-serif';
      ctx.fillText('學校正門：15:30 放學鈴響後，無職務即可由此離校回家休息。', offsetX + 60, offsetY + 120);
    }
  }, [room, inLesson, incidents]);

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: '#2dd4bf' }}>{ROOM_LABELS[room]}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>2.5D 固定視角・點擊桌位互動</span>
      </div>
      <canvas
        ref={canvasRef}
        width={620}
        height={350}
        onClick={() => {
          if (room === 'STAFFROOM') onInteractDesk();
        }}
        style={{ width: '100%', height: 'auto', borderRadius: 8, cursor: 'pointer', display: 'block' }}
      />
      {inLesson && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {incidents
            .filter((i) => !i.resolved)
            .map((inc) => (
              <button
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                style={{
                  background: '#b45309',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                行近 {inc.studentNameZh}（{inc.postureHintZh}）
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
