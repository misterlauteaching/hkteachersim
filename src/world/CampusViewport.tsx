// 3DS-Pokemon-Style Illustrated 2.5D Campus & Classroom Viewport
// Renders detailed furniture, chalkboards, lockers, plants, teacher/student avatars, and posture cues

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

const ROOM_THEME: Record<
  RoomId,
  {
    titleZh: string;
    subZh: string;
    wallTop: string;
    wallBot: string;
    floorLight: string;
    floorDark: string;
    accent: string;
  }
> = {
  STAFFROOM: {
    titleZh: '教員室・你的辦公桌 (Staffroom)',
    subZh: '點擊發光辦公桌開啟「辦公桌工作台」｜可批改功課、小休、沖咖啡、食零食、睇便利貼',
    wallTop: '#1e293b',
    wallBot: '#334155',
    floorLight: '#d6c7b2',
    floorDark: '#c7b69f',
    accent: '#2dd4bf',
  },
  CORRIDOR: {
    titleZh: '教學樓走廊 (Corridor Hub — 1A–6C)',
    subZh: '連接 18 班課室、教員室、16:00 留堂室與校門｜留意小息及午膳追功課',
    wallTop: '#243044',
    wallBot: '#384863',
    floorLight: '#cbd5e1',
    floorDark: '#b8c4d4',
    accent: '#93c5fd',
  },
  CLASS_4C: {
    titleZh: '4C 課室 (班主任班 + 英文任教)',
    subZh: '40x 課堂時鐘｜點擊有異動學生行埋去處理，對話完畢自動繼續講書',
    wallTop: '#1f2d3d',
    wallBot: '#32465e',
    floorLight: '#d8c3a5',
    floorDark: '#cbb392',
    accent: '#fbbf24',
  },
  CLASS_1B: {
    titleZh: '1B 課室 (中一英文任教)',
    subZh: '40x 課堂時鐘｜中一課室節奏明快，留意坐姿與課堂專注度',
    wallTop: '#1e2f38',
    wallBot: '#304957',
    floorLight: '#d8c3a5',
    floorDark: '#cbb392',
    accent: '#34d399',
  },
  DETENTION_ROOM: {
    titleZh: '16:00 留堂室 (After-School Detention)',
    subZh: '欠交英文功課學生留堂補做｜15:30 後 1.2x 時鐘加速，19:00 校工鎖門',
    wallTop: '#1c2230',
    wallBot: '#2b3447',
    floorLight: '#94a3b8',
    floorDark: '#8292a8',
    accent: '#f59e0b',
  },
  GATE: {
    titleZh: '學校正門 (School Entrance)',
    subZh: '15:30 放學鈴響後無職務可離校休息；19:00 校工鎖門必須離開',
    wallTop: '#1e3a34',
    wallBot: '#2b5249',
    floorLight: '#99b8ad',
    floorDark: '#87a89c',
    accent: '#38bdf8',
  },
};

function drawPottedPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Terracotta pot
  ctx.fillStyle = '#c2593f';
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 4);
  ctx.lineTo(x + 10, y - 4);
  ctx.lineTo(x + 8, y + 10);
  ctx.lineTo(x - 8, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Lush foliage clusters
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(x - 5, y - 10, 8, 0, Math.PI * 2);
  ctx.arc(x + 6, y - 9, 7.5, 0, Math.PI * 2);
  ctx.arc(x, y - 15, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(x - 2, y - 14, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, w = 64, h = 34) {
  ctx.fillStyle = '#6b3e26';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Colored folders / ring binders
  const colors = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#f97316', '#8b5cf6'];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x + 6 + i * 7.5, y + 5, 5.5, h - 10);
  }
}

function drawIllustratedAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: {
    label: string;
    blazerColor: string;
    shirtColor: string;
    hairColor: string;
    isPlayer?: boolean;
    posture?: 'UPRIGHT' | 'SLOUCH' | 'EXHAUSTED' | 'RAISED_HAND' | 'SLUMPED';
    walkStep?: number;
    facing?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    hasGlasses?: boolean;
  }
) {
  const step = opts.walkStep ?? 0;
  const bob = step % 2 === 1 ? -4 : 0;
  const stride = step === 1 ? -4.5 : step === 3 ? 4.5 : 0;
  const slouch =
    opts.posture === 'EXHAUSTED' || opts.posture === 'SLUMPED'
      ? 5
      : opts.posture === 'SLOUCH'
      ? 2.5
      : 0;

  // Ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 16, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (opts.isPlayer) {
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 21, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Trousers / skirt & shoes
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 2 + bob);
  ctx.lineTo(cx - 5 + stride, cy + 11);
  ctx.moveTo(cx + 5, cy + 2 + bob);
  ctx.lineTo(cx + 5 - stride, cy + 11);
  ctx.stroke();

  // Blazer / uniform top
  const torsoY = cy - 11 + bob + slouch;
  ctx.fillStyle = opts.blazerColor;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(cx - 11, torsoY, 22, 15, 4) : ctx.rect(cx - 11, torsoY, 22, 15);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Inner shirt V + tie/collar
  ctx.fillStyle = opts.shirtColor;
  ctx.beginPath();
  ctx.moveTo(cx - 4, torsoY);
  ctx.lineTo(cx + 4, torsoY);
  ctx.lineTo(cx, torsoY + 9);
  ctx.closePath();
  ctx.fill();

  // Arms
  ctx.strokeStyle = opts.blazerColor;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(cx - 11, torsoY + 3);
  ctx.lineTo(cx - 16, torsoY + 11);
  if (opts.posture === 'RAISED_HAND') {
    ctx.moveTo(cx + 11, torsoY + 3);
    ctx.lineTo(cx + 15, torsoY - 14);
  } else {
    ctx.moveTo(cx + 11, torsoY + 3);
    ctx.lineTo(cx + 16, torsoY + 11);
  }
  ctx.stroke();

  // Hand dot if raising hand
  if (opts.posture === 'RAISED_HAND') {
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(cx + 15, torsoY - 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Head
  const headY = cy - 21 + bob + slouch;
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(cx, headY, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Hair cap + fringe
  ctx.fillStyle = opts.hairColor;
  ctx.beginPath();
  ctx.arc(cx, headY - 2, 11, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.stroke();

  // Eyes / Glasses / Expressions
  ctx.fillStyle = '#0f172a';
  if (opts.facing !== 'UP') {
    if (opts.posture === 'SLUMPED' || opts.posture === 'EXHAUSTED') {
      // Tired half-lidded eyes
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 6, headY);
      ctx.lineTo(cx - 2, headY);
      ctx.moveTo(cx + 2, headY);
      ctx.lineTo(cx + 6, headY);
      ctx.stroke();
    } else {
      ctx.fillRect(cx - 5.5, headY - 1, 3, 3.2);
      ctx.fillRect(cx + 2.5, headY - 1, 3, 3.2);
    }

    if (opts.hasGlasses) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(cx - 7, headY - 2.5, 5.5, 5);
      ctx.strokeRect(cx + 1.5, headY - 2.5, 5.5, 5);
      ctx.beginPath();
      ctx.moveTo(cx - 1.5, headY);
      ctx.lineTo(cx + 1.5, headY);
      ctx.stroke();
    }
  }

  // Floating Nameplate
  ctx.font = opts.isPlayer ? 'bold 12px sans-serif' : '11px sans-serif';
  const badgeW = ctx.measureText(opts.label).width + 12;
  ctx.fillStyle = opts.isPlayer ? '#0d9488' : 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(cx - badgeW / 2, headY - 30, badgeW, 17);
  ctx.strokeStyle = opts.isPlayer ? '#99f6e4' : 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - badgeW / 2, headY - 30, badgeW, 17);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(opts.label, cx, headY - 18);
  ctx.textAlign = 'left';
}

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
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 4, y: 4 });
  const [facing, setFacing] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('DOWN');
  const [walkPhase, setWalkPhase] = useState<number>(0);

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

    setPlayerPos((prev) => ({
      x: Math.max(0, Math.min(COLS - 1, prev.x + dx)),
      y: Math.max(0, Math.min(ROWS - 1, prev.y + dy)),
    }));
    setWalkPhase((p) => (p + 1) % 4);
  };

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

    const theme = ROOM_THEME[room];
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Wall backdrop
    ctx.fillStyle = theme.wallTop;
    ctx.fillRect(0, 0, w, 72);
    ctx.fillStyle = theme.wallBot;
    ctx.fillRect(0, 56, w, 18);

    // Windows / Bulletin board along upper wall
    for (let i = 0; i < 3; i++) {
      const wx = 34 + i * 62;
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(wx, 12, 44, 28);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx, 12, 44, 28);
    }

    // Room Title Plaque
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(235, 12, 220, 34);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(235, 12, 220, 34);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(theme.titleZh, 345, 34);
    ctx.textAlign = 'left';

    // Right wall bookshelves & plant
    drawBookshelf(ctx, 485, 14, 72, 32);
    drawPottedPlant(ctx, 588, 34);

    // 2.5D Perspective Floor Grid
    const tileW = 62;
    const tileH = 38;
    const startY = 82;

    for (let r = 0; r < ROWS; r++) {
      const depthScale = 0.92 + r * 0.022;
      const rowW = tileW * depthScale;
      const rowH = tileH * depthScale;
      const rowTotalW = COLS * rowW;
      const rx = (w - rowTotalW) / 2;
      const ry = startY + r * (rowH * 0.92);

      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? theme.floorLight : theme.floorDark;
        ctx.fillRect(rx + c * rowW + 1, ry + 1, rowW - 2, rowH - 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + c * rowW + 1, ry + 1, rowW - 2, rowH - 2);
      }
    }

    const tileCenter = (gx: number, gy: number) => {
      const depthScale = 0.92 + gy * 0.022;
      const rowW = tileW * depthScale;
      const rowH = tileH * depthScale;
      const rowTotalW = COLS * rowW;
      const rx = (w - rowTotalW) / 2;
      const ry = startY + gy * (rowH * 0.92);
      return { cx: rx + (gx + 0.5) * rowW, cy: ry + rowH * 0.55 };
    };

    const pCoord = tileCenter(playerPos.x, playerPos.y);

    if (room === 'STAFFROOM') {
      // Colleague 1: Miss Chan
      const c1 = tileCenter(2, 1);
      ctx.fillStyle = '#8b5e34';
      ctx.fillRect(c1.cx - 34, c1.cy - 6, 68, 22);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(c1.cx - 34, c1.cy - 6, 68, 22);
      drawIllustratedAvatar(ctx, c1.cx, c1.cy - 10, {
        label: '陳老師',
        blazerColor: '#6d28d9',
        shirtColor: '#f8fafc',
        hairColor: '#1e293b',
        hasGlasses: true,
      });

      // Colleague 2: Mr. Ng
      const c2 = tileCenter(7, 1);
      ctx.fillStyle = '#8b5e34';
      ctx.fillRect(c2.cx - 34, c2.cy - 6, 68, 22);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(c2.cx - 34, c2.cy - 6, 68, 22);
      drawIllustratedAvatar(ctx, c2.cx, c2.cy - 10, {
        label: '吳老師',
        blazerColor: '#d97706',
        shirtColor: '#ffffff',
        hairColor: '#0f172a',
      });

      // Player's Workstation Desk at (4, 2)
      const d = tileCenter(4, 2);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(d.cx - 48, d.cy - 14, 96, 30);
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(d.cx - 48, d.cy - 14, 96, 30);

      // Papers, mug & red pen on desk
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(d.cx - 38, d.cy - 8, 18, 12);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(d.cx - 12, d.cy - 8, 16, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(d.cx + 12, d.cy - 7, 14, 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('你的辦公桌 [點擊]', d.cx - 42, d.cy + 11);
    } else if (room === 'CLASS_4C' || room === 'CLASS_1B') {
      // Green Chalkboard with English lesson notes
      ctx.fillStyle = '#14532d';
      ctx.fillRect(195, 14, 290, 38);
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 3;
      ctx.strokeRect(195, 14, 290, 38);
      ctx.fillStyle = '#fef9c3';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(
        `${room === 'CLASS_4C' ? '4C' : '1B'} English — Argumentative & Grammar`,
        222,
        37
      );

      // Teacher Podium
      const pod = tileCenter(4, 1);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(pod.cx - 24, pod.cy - 8, 48, 18);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(pod.cx - 24, pod.cy - 8, 48, 18);

      // Student desks + illustrated student avatars
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const gx = 2 + c;
          const gy = 3 + r;
          const sPos = tileCenter(gx, gy);
          const inc = incidents.find(
            (i) => !i.resolved && i.seatRow === r && i.seatCol === c
          );

          ctx.fillStyle = inc ? '#fef08a' : '#8b5e34';
          ctx.fillRect(sPos.cx - 24, sPos.cy + 2, 48, 16);
          ctx.strokeStyle = inc ? '#d97706' : '#1e293b';
          ctx.lineWidth = inc ? 2 : 1.2;
          ctx.strokeRect(sPos.cx - 24, sPos.cy + 2, 48, 16);

          drawIllustratedAvatar(ctx, sPos.cx, sPos.cy - 6, {
            label: inc ? inc.studentNameZh : `${room === 'CLASS_4C' ? '4C' : '1B'}生`,
            blazerColor: inc ? '#ea580c' : '#2563eb',
            shirtColor: '#ffffff',
            hairColor: '#1e293b',
            posture: inc ? 'RAISED_HAND' : 'UPRIGHT',
          });
        }
      }
    } else if (room === 'CORRIDOR') {
      // Lockers & corridor student
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(80 + i * 34, 22, 28, 34);
        ctx.strokeStyle = '#0f172a';
        ctx.strokeRect(80 + i * 34, 22, 28, 34);
      }
      const npc1 = tileCenter(2, 3);
      drawIllustratedAvatar(ctx, npc1.cx, npc1.cy, {
        label: '欠交功課生',
        blazerColor: '#2563eb',
        shirtColor: '#ffffff',
        hairColor: '#0f172a',
        posture: 'SLOUCH',
      });
    } else if (room === 'DETENTION_ROOM') {
      const detStu = tileCenter(4, 3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(detStu.cx - 30, detStu.cy + 2, 60, 18);
      drawIllustratedAvatar(ctx, detStu.cx, detStu.cy - 6, {
        label: '16:00 留堂生',
        blazerColor: '#dc2626',
        shirtColor: '#ffffff',
        hairColor: '#1e293b',
        posture: 'SLUMPED',
      });
    } else if (room === 'GATE') {
      const gate = tileCenter(4, 2);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(gate.cx - 68, gate.cy - 16, 136, 34);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.strokeRect(gate.cx - 68, gate.cy - 16, 136, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('校門出口 (GATE)', gate.cx - 48, gate.cy + 5);
    }

    // Draw Player Character (Lau Sir) on top
    drawIllustratedAvatar(ctx, pCoord.cx, pCoord.cy, {
      label: '你 (Lau Sir)',
      blazerColor: '#0d9488',
      shirtColor: '#f8fafc',
      hairColor: '#0f172a',
      isPlayer: true,
      posture: playerPosture,
      walkStep: walkPhase,
      facing,
      hasGlasses: true,
    });
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
        Math.abs(clickX - deskCenterX) <= 52 &&
        Math.abs(clickY - deskCenterY) <= 28
      ) {
        onOpenDesk();
        return;
      }
    }

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

  const theme = ROOM_THEME[room];

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
          <div style={{ fontWeight: 700, color: theme.accent, fontSize: 14 }}>{theme.titleZh}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{theme.subZh}</div>
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
