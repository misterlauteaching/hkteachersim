// 3DS-Pokemon-Style 2.5D Campus & Classroom Viewport with Player Avatar, Tile Movement & Desk Trigger

import React, { useEffect, useRef, useState } from 'react';
import { ClassroomIncident, RoomId } from '../types/game';

interface Props {
  room: RoomId;
  inLesson: boolean;
  incidents: ClassroomIncident[];
  playerPosture: 'UPRIGHT' | 'SLOUCH' | 'EXHAUSTED';
  playerSpeedMultiplier: number;
  dangerVignette: boolean;
  onSelectIncident: (inc: ClassroomIncident) => void;
  onOpenDesk: () => void;
}

const COLS = 10;
const ROWS = 7;

const ROOM_META: Record<
  RoomId,
  { title: string; subtitle: string; floorA: string; floorB: string; accent: string }
> = {
  STAFFROOM: {
    title: '教員室・你的辦公桌 (Staffroom)',
    subtitle: '行近或點擊發光的辦公桌開啟工作台｜可小休、沖咖啡、查功課',
    floorA: '#3b495e',
    floorB: '#313e52',
    accent: '#2dd4bf',
  },
  CORRIDOR: {
    title: '教學樓走廊 (Corridor Hub — 1A–6C)',
    subtitle: '連接 18 班課室、教員室、留堂室與校門｜留意小息及午膳追功課',
    floorA: '#475569',
    floorB: '#3c495c',
    accent: '#93c5fd',
  },
  CLASS_4C: {
    title: '4C 課室 (班主任班 + 英文任教)',
    subtitle: '40x 課堂節奏｜點擊有異動學生行埋去處理，完即自動繼續講書',
    floorA: '#4a5568',
    floorB: '#3f495a',
    accent: '#fbbf24',
  },
  CLASS_1B: {
    title: '1B 課室 (中一英文任教)',
    subtitle: '40x 課堂節奏｜中一學生較活潑，留意坐姿與上課專注度',
    floorA: '#4a5568',
    floorB: '#3f495a',
    accent: '#34d399',
  },
  DETENTION_ROOM: {
    title: '16:00 留堂室 (After-School Detention)',
    subtitle: '欠交英文功課學生留堂補做位置｜15:30 後 1.2x 時鐘加速',
    floorA: '#3f4756',
    floorB: '#343b48',
    accent: '#f59e0b',
  },
  GATE: {
    title: '學校正門 (School Entrance)',
    subtitle: '15:30 放學鈴響後無職務可離校休息；19:00 校工鎖門必須離開',
    floorA: '#3b5249',
    floorB: '#31463e',
    accent: '#38bdf8',
  },
};

export const CampusViewport: React.FC<Props> = ({
  room,
  inLesson,
  incidents,
  playerPosture,
  playerSpeedMultiplier,
  dangerVignette,
  onSelectIncident,
  onOpenDesk,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 4, y: 3 });
  const [facing, setFacing] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('DOWN');
  const [walkPhase, setWalkPhase] = useState<number>(0);

  // Reset starting position per room
  useEffect(() => {
    if (room === 'STAFFROOM') {
      setPlayerPos({ x: 4, y: 4 });
      setFacing('UP');
    } else if (room === 'CLASS_4C' || room === 'CLASS_1B') {
      setPlayerPos({ x: 4, y: 1 });
      setFacing('DOWN');
    } else {
      setPlayerPos({ x: 4, y: 3 });
      setFacing('DOWN');
    }
  }, [room]);

  const moveStep = (dx: number, dy: number) => {
    if (dx < 0) setFacing('LEFT');
    else if (dx > 0) setFacing('RIGHT');
    else if (dy < 0) setFacing('UP');
    else if (dy > 0) setFacing('DOWN');

    setPlayerPos((prev) => {
      const nx = Math.max(0, Math.min(COLS - 1, prev.x + dx));
      const ny = Math.max(0, Math.min(ROWS - 1, prev.y + dy));
      return { x: nx, y: ny };
    });
    setWalkPhase((p) => (p + 1) % 4);
  };

  // Keyboard WASD / Arrow movement + E/Enter interact
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveStep(0, -1);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveStep(0, 1);
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveStep(-1, 0);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveStep(1, 0);
      else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        if (room === 'STAFFROOM') onOpenDesk();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const meta = ROOM_META[room];
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Wall backdrop with 3DS-style depth
    ctx.fillStyle = '#141c2b';
    ctx.fillRect(0, 0, w, 68);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 68, w, h - 68);

    // Room banner sign on back wall
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = meta.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(170, 16, w - 340, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(meta.title, w / 2, 39);
    ctx.textAlign = 'left';

    const tileW = 62;
    const tileH = 38;
    const gridW = COLS * tileW;
    const startX = (w - gridW) / 2;
    const startY = 82;

    // Draw perspective-tilted 2.5D tiles
    for (let r = 0; r < ROWS; r++) {
      const depthScale = 0.92 + r * 0.022;
      const rowW = tileW * depthScale;
      const rowH = tileH * depthScale;
      const rowTotalW = COLS * rowW;
      const rx = (w - rowTotalW) / 2;
      const ry = startY + r * (rowH * 0.92);

      for (let c = 0; c < COLS; c++) {
        const tx = rx + c * rowW;
        const ty = ry;
        ctx.fillStyle = (r + c) % 2 === 0 ? meta.floorA : meta.floorB;
        ctx.fillRect(tx + 1, ty + 1, rowW - 2, rowH - 2);

        // Subtle tile border
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 1, ty + 1, rowW - 2, rowH - 2);
      }
    }

    const tileCenter = (gx: number, gy: number) => {
      const depthScale = 0.92 + gy * 0.022;
      const rowW = tileW * depthScale;
      const rowH = tileH * depthScale;
      const rowTotalW = COLS * rowW;
      const rx = (w - rowTotalW) / 2;
      const ry = startY + gy * (rowH * 0.92);
      return {
        cx: rx + (gx + 0.5) * rowW,
        cy: ry + rowH * 0.55,
        rowW,
        rowH,
      };
    };

    // Room props & interactive zones
    if (room === 'STAFFROOM') {
      // Colleague desks in background
      const c1 = tileCenter(1, 1);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(c1.cx - 28, c1.cy - 14, 56, 26);
      ctx.fillStyle = '#fde68a';
      ctx.font = '10px sans-serif';
      ctx.fillText('陳老師位', c1.cx - 22, c1.cy + 3);

      const c2 = tileCenter(7, 1);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(c2.cx - 28, c2.cy - 14, 56, 26);
      ctx.fillStyle = '#fde68a';
      ctx.fillText('吳老師位', c2.cx - 22, c2.cy + 3);

      // Player's Teacher Desk (glowing teal interactive station at x=4, y=2)
      const d = tileCenter(4, 2);
      ctx.fillStyle = '#0f766e';
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(d.cx - 42, d.cy - 18, 84, 34, 6);
      ctx.fill();
      ctx.stroke();

      // Papers & red pen on desk
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(d.cx - 32, d.cy - 10, 18, 12);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(d.cx + 12, d.cy - 8, 14, 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('你的辦公桌 [點擊]', d.cx - 38, d.cy + 12);
    } else if (room === 'CLASS_4C' || room === 'CLASS_1B') {
      // Green chalkboard + teacher podium
      ctx.fillStyle = '#064e3b';
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.fillRect(145, 14, w - 290, 42);
      ctx.strokeRect(145, 14, w - 290, 42);
      ctx.fillStyle = '#ecfdf5';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(
        `${room === 'CLASS_4C' ? '4C' : '1B'} English — Grammar & Writing`,
        220,
        39
      );

      // Podium at (4, 1)
      const pod = tileCenter(4, 1);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(pod.cx - 22, pod.cy - 12, 44, 22);
      ctx.fillStyle = '#fef3c7';
      ctx.font = '10px sans-serif';
      ctx.fillText('講台', pod.cx - 10, pod.cy + 3);

      // Student desks (rows 3..5, cols 1..7)
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const gx = 2 + c;
          const gy = 3 + r;
          const sPos = tileCenter(gx, gy);
          const inc = incidents.find(
            (i) => !i.resolved && i.seatRow === r && i.seatCol === c
          );

          ctx.fillStyle = inc ? '#b45309' : '#5c4033';
          ctx.strokeStyle = inc ? '#fbbf24' : '#785546';
          ctx.lineWidth = inc ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(sPos.cx - 24, sPos.cy - 12, 48, 24, 4);
          ctx.fill();
          ctx.stroke();

          // Student head & posture cue
          ctx.fillStyle = inc ? '#fef08a' : '#e2e8f0';
          ctx.beginPath();
          ctx.arc(sPos.cx, sPos.cy - (inc ? 16 : 12), 7, 0, Math.PI * 2);
          ctx.fill();

          if (inc) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('!', sPos.cx + 10, sPos.cy - 14);
          }
        }
      }
    } else if (room === 'CORRIDOR') {
      // Classroom doors along top & bottom
      for (let i = 0; i < 4; i++) {
        const door = tileCenter(1 + i * 2, 0);
        ctx.fillStyle = '#334155';
        ctx.fillRect(door.cx - 24, 52, 48, 16);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px sans-serif';
        ctx.fillText(`課室 ${i + 1}A–C`, door.cx - 20, 64);
      }
    } else if (room === 'DETENTION_ROOM') {
      const det = tileCenter(4, 3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(det.cx - 50, det.cy - 20, 100, 40);
      ctx.fillStyle = '#fde68a';
      ctx.font = '11px sans-serif';
      ctx.fillText('留堂補做專區', det.cx - 34, det.cy + 4);
    } else if (room === 'GATE') {
      const gate = tileCenter(4, 2);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(gate.cx - 60, gate.cy - 18, 120, 32);
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('校門出口 (EXIT)', gate.cx - 42, gate.cy + 3);
    }

    // Draw Player Character (Lau Sir / Teacher Avatar)
    const p = tileCenter(playerPos.x, playerPos.y);
    const bob = walkPhase % 2 === 1 ? -3 : 0;
    const slouchOffset =
      playerPosture === 'EXHAUSTED' ? 4 : playerPosture === 'SLOUCH' ? 2 : 0;

    // Shadow under player
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(p.cx, p.cy + 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teacher shirt / jacket torso
    ctx.fillStyle = '#0d9488';
    ctx.beginPath();
    ctx.roundRect(p.cx - 10, p.cy - 8 + bob + slouchOffset, 20, 18, 5);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(p.cx, p.cy - 16 + bob + slouchOffset, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair & glasses detail
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(p.cx, p.cy - 18 + bob + slouchOffset, 9, Math.PI, Math.PI * 2);
    ctx.fill();

    // Direction indicator dot
    ctx.fillStyle = '#2dd4bf';
    const dirX = facing === 'LEFT' ? -13 : facing === 'RIGHT' ? 13 : 0;
    const dirY = facing === 'UP' ? -28 : facing === 'DOWN' ? 14 : -14;
    ctx.beginPath();
    ctx.arc(p.cx + dirX, p.cy + dirY + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Nameplate above player
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('你 (英文老師)', p.cx, p.cy - 30 + bob + slouchOffset);
    ctx.textAlign = 'left';
  }, [room, inLesson, incidents, playerPos, facing, walkPhase, playerPosture]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const tileW = 62;
    const tileH = 38;
    const startY = 82;

    // Detect if user clicked on the Teacher Desk in Staffroom
    if (room === 'STAFFROOM') {
      const depthScale = 0.92 + 2 * 0.022;
      const rowW = tileW * depthScale;
      const rowH = tileH * depthScale;
      const rowTotalW = COLS * rowW;
      const rx = (canvas.width - rowTotalW) / 2;
      const ry = startY + 2 * (rowH * 0.92);
      const deskCenterX = rx + 4.5 * rowW;
      const deskCenterY = ry + rowH * 0.55;

      if (
        Math.abs(clickX - deskCenterX) <= 46 &&
        Math.abs(clickY - deskCenterY) <= 24
      ) {
        onOpenDesk();
        return;
      }
    }

    // Otherwise step toward clicked horizontal/vertical direction
    const depthScale = 0.92 + playerPos.y * 0.022;
    const rowW = tileW * depthScale;
    const rowH = tileH * depthScale;
    const rowTotalW = COLS * rowW;
    const rx = (canvas.width - rowTotalW) / 2;
    const ry = startY + playerPos.y * (rowH * 0.92);
    const px = rx + (playerPos.x + 0.5) * rowW;
    const py = ry + rowH * 0.55;

    const dx = clickX - px;
    const dy = clickY - py;
    if (Math.abs(dx) > Math.abs(dy)) {
      moveStep(dx > 0 ? 1 : -1, 0);
    } else {
      moveStep(0, dy > 0 ? 1 : -1);
    }
  };

  const meta = ROOM_META[room];

  return (
    <div
      style={{
        background: '#0f172a',
        border: dangerVignette ? '1px solid #ef4444' : '1px solid #334155',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, color: meta.accent, fontSize: 14 }}>{meta.title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{meta.subtitle}</div>
        </div>
        <div style={{ fontSize: 11, color: '#cbd5e1', textAlign: 'right' }}>
          <div>WASD / 方向鍵 / 點擊地面移動</div>
          <div style={{ color: '#94a3b8' }}>步速倍率：{playerSpeedMultiplier.toFixed(2)}x</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={680}
        height={360}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'block',
          border: '1px solid #1e293b',
        }}
      />

      {/* Quick On-Screen D-Pad + Desk Button for mouse/touch convenience */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => moveStep(-1, 0)} style={padBtnStyle}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={() => moveStep(0, -1)} style={padBtnStyle}>↑</button>
            <button onClick={() => moveStep(0, 1)} style={padBtnStyle}>↓</button>
          </div>
          <button onClick={() => moveStep(1, 0)} style={padBtnStyle}>→</button>
        </div>

        {room === 'STAFFROOM' && (
          <button
            onClick={onOpenDesk}
            style={{
              background: '#0d9488',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            開啟辦公桌工作台（功課／小休／便利貼）
          </button>
        )}

        {inLesson && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
    </div>
  );
};

const padBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  background: '#334155',
  color: '#f8fafc',
  border: '1px solid #475569',
  borderRadius: 6,
  fontWeight: 700,
  cursor: 'pointer',
};