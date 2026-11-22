// High-Definition 2.5D Sprite-Layered Campus & Classroom Viewport
// - Properly proportioned character heights (percentage of viewport height) matching chairs, desks & doors
// - All 18 classrooms (1A..6C) accessible from their respective floor corridors
// - Distinct HD backgrounds for Staffroom, G/F, 1/F, 2/F, 3/F Corridors, School Office, Principal's Office, and 18 Classrooms

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFloorForClass } from '../data/schoolData';
import {
  ClassCode,
  ClassroomIncident,
  PlayerGender,
  RoomId,
  StudentProfile,
} from '../types/game';

interface Props {
  room: RoomId;
  playerGender: PlayerGender;
  pastorClass: ClassCode;
  teachClass: ClassCode;
  inLesson: boolean;
  students: StudentProfile[];
  incidents: ClassroomIncident[];
  playerPosture: 'UPRIGHT' | 'SLOUCH' | 'EXHAUSTED';
  dangerVignette: boolean;
  onEnterRoom: (target: RoomId) => void;
  onSelectIncident: (inc: ClassroomIncident) => void;
  onOpenDeskTasks: () => void;
  onQuickSnackOrCoffee: (kind: 'COFFEE' | 'SNACK') => void;
  onShowToast: (msg: string) => void;
}

const GRID_COLS = 14;
const GRID_ROWS = 9;

interface GridNode {
  x: number;
  y: number;
}

interface InteractiveHotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  labelZh: string;
  accent?: string;
  onTrigger: () => void;
}

function findGridPath(start: GridNode, goal: GridNode, blocked: Set<string>): GridNode[] {
  const key = (x: number, y: number) => `${x},${y}`;
  if (start.x === goal.x && start.y === goal.y) return [];

  const queue: GridNode[][] = [[start]];
  const visited = new Set<string>([key(start.x, start.y)]);
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const curr = path[path.length - 1];

    for (const d of dirs) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      if (blocked.has(k) && !(nx === goal.x && ny === goal.y)) continue;

      const nextPath = [...path, { x: nx, y: ny }];
      if (nx === goal.x && ny === goal.y) return nextPath.slice(1);
      visited.add(k);
      queue.push(nextPath);
    }
  }
  return [];
}

export const HDCampusViewport: React.FC<Props> = ({
  room,
  playerGender,
  pastorClass,
  teachClass,
  inLesson,
  students,
  incidents,
  playerPosture,
  dangerVignette,
  onEnterRoom,
  onSelectIncident,
  onOpenDeskTasks,
  onQuickSnackOrCoffee,
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [playerPos, setPlayerPos] = useState<GridNode>({ x: 6, y: 6 });
  const [facing, setFacing] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [walkFrame, setWalkFrame] = useState<number>(0);
  const [autoPath, setAutoPath] = useState<GridNode[]>([]);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [targetMarker, setTargetMarker] = useState<GridNode | null>(null);

  useEffect(() => {
    setAutoPath([]);
    setPendingAction(null);
    setTargetMarker(null);

    if (room === 'STAFFROOM') {
      setPlayerPos({ x: 6, y: 6 });
      setFacing('UP');
    } else if (room.startsWith('CLASS_')) {
      setPlayerPos({ x: 11, y: 5 });
      setFacing('UP');
    } else if (room === 'CORRIDOR_2F') {
      setPlayerPos({ x: 3, y: 5 });
      setFacing('RIGHT');
    } else if (room === 'CORRIDOR_1F') {
      setPlayerPos({ x: 6, y: 5 });
      setFacing('UP');
    } else if (room === 'CORRIDOR_3F') {
      setPlayerPos({ x: 6, y: 6 });
      setFacing('UP');
    } else {
      setPlayerPos({ x: 6, y: 6 });
      setFacing('UP');
    }
  }, [room]);

  const blockedTiles = useMemo(() => {
    const set = new Set<string>();
    if (room === 'STAFFROOM') {
      set.add('6,4');
      set.add('7,4');
      for (const gx of [3, 4, 9, 10]) {
        for (const gy of [2, 6]) {
          set.add(`${gx},${gy}`);
        }
      }
    } else if (room === 'PRINCIPAL_OFFICE') {
      set.add('4,3');
      set.add('5,3');
      set.add('8,3');
      set.add('9,3');
    } else if (room.startsWith('CLASS_')) {
      set.add('3,2');
      set.add('4,2');
    }
    return set;
  }, [room]);

  const makeClassHotspot = useCallback(
    (cls: ClassCode, x: number, y: number): InteractiveHotspot => {
      const isMine = cls === pastorClass || cls === teachClass;
      const badge = cls === pastorClass ? ' (班主任)' : cls === teachClass ? ' (任教)' : '';
      return {
        id: `enter_${cls}`,
        x,
        y,
        w: 1,
        h: 1,
        labelZh: `${cls}${badge}`,
        accent: isMine ? '#34d399' : '#94a3b8',
        onTrigger: () => onEnterRoom(`CLASS_${cls}`),
      };
    },
    [pastorClass, teachClass, onEnterRoom]
  );

  const hotspots: InteractiveHotspot[] = useMemo(() => {
    if (room === 'STAFFROOM') {
      return [
        {
          id: 'player_desk',
          x: 6,
          y: 4,
          w: 2,
          h: 1,
          labelZh: '你的中央辦公桌 [互動 / 點擊]',
          accent: '#2dd4bf',
          onTrigger: () => onOpenDeskTasks(),
        },
        {
          id: 'snack_bar',
          x: 1,
          y: 3,
          w: 1,
          h: 2,
          labelZh: '茶水間・零食飲品吧',
          accent: '#f59e0b',
          onTrigger: () => onQuickSnackOrCoffee('COFFEE'),
        },
        {
          id: 'staffroom_exit_door',
          x: 12,
          y: 4,
          w: 1,
          h: 2,
          labelZh: '右門出口 → 2/F 走廊',
          accent: '#38bdf8',
          onTrigger: () => onEnterRoom('CORRIDOR_2F'),
        },
      ];
    }

    if (room === 'CORRIDOR_2F') {
      return [
        {
          id: 'door_staffroom',
          x: 1,
          y: 4,
          w: 2,
          h: 1,
          labelZh: '← 左翼：2/F 教員室',
          accent: '#2dd4bf',
          onTrigger: () => onEnterRoom('STAFFROOM'),
        },
        {
          id: 'stairs_2f_down',
          x: 4,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '↓ 中央樓梯：落 1/F',
          accent: '#fbbf24',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'stairs_2f_up',
          x: 4,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↑ 中央樓梯：上 3/F',
          accent: '#c084fc',
          onTrigger: () => onEnterRoom('CORRIDOR_3F'),
        },
        // 6 opposing classrooms on 2/F East (3A-3C top row, 4A-4C bottom row)
        makeClassHotspot('3A', 8, 3),
        makeClassHotspot('3B', 10, 3),
        makeClassHotspot('3C', 12, 3),
        makeClassHotspot('4A', 8, 6),
        makeClassHotspot('4B', 10, 6),
        makeClassHotspot('4C', 12, 6),
      ];
    }

    if (room === 'CORRIDOR_1F') {
      return [
        {
          id: 'north_general_office',
          x: 3,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↑ 北翼：校務處',
          accent: '#38bdf8',
          onTrigger: () => onEnterRoom('SCHOOL_OFFICE'),
        },
        {
          id: 'north_principal_office',
          x: 5,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↑ 北翼：校長及副校長室',
          accent: '#f472b6',
          onTrigger: () => onEnterRoom('PRINCIPAL_OFFICE'),
        },
        {
          id: 'south_stairs_down',
          x: 4,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↓ 南翼樓梯：落 G/F',
          accent: '#fbbf24',
          onTrigger: () => onEnterRoom('GROUND_FLOOR'),
        },
        {
          id: 'south_stairs_up',
          x: 6,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↑ 南翼樓梯：上 2/F',
          accent: '#2dd4bf',
          onTrigger: () => onEnterRoom('CORRIDOR_2F'),
        },
        // 6 opposing classrooms on 1/F East (1A-1C top row, 2A-2C bottom row)
        makeClassHotspot('1A', 9, 3),
        makeClassHotspot('1B', 11, 3),
        makeClassHotspot('1C', 13, 3),
        makeClassHotspot('2A', 9, 6),
        makeClassHotspot('2B', 11, 6),
        makeClassHotspot('2C', 13, 6),
      ];
    }

    if (room === 'CORRIDOR_3F') {
      return [
        {
          id: 'stairs_3f_down',
          x: 10,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↓ 3/F 樓梯（只落 2/F）',
          accent: '#2dd4bf',
          onTrigger: () => onEnterRoom('CORRIDOR_2F'),
        },
        // 6 opposing classrooms on 3/F (5A-5C top row, 6A-6C bottom row)
        makeClassHotspot('5A', 3, 3),
        makeClassHotspot('5B', 5, 3),
        makeClassHotspot('5C', 7, 3),
        makeClassHotspot('6A', 3, 6),
        makeClassHotspot('6B', 5, 6),
        makeClassHotspot('6C', 7, 6),
      ];
    }

    if (room === 'SCHOOL_OFFICE') {
      return [
        {
          id: 'back_to_1f_so',
          x: 6,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↓ 返回 1/F 三岔走廊',
          accent: '#93c5fd',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'so_counter',
          x: 5,
          y: 5,
          w: 2,
          h: 1,
          labelZh: '校務處接待櫃檯',
          accent: '#38bdf8',
          onTrigger: () => onShowToast('校務處書記：「老師你好，今日通告及點名簿已處理妥當。」'),
        },
      ];
    }

    if (room === 'PRINCIPAL_OFFICE') {
      return [
        {
          id: 'back_to_1f_po',
          x: 6,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↓ 返回 1/F 三岔走廊',
          accent: '#93c5fd',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'principal_desk',
          x: 4,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '校長辦公桌',
          accent: '#fbbf24',
          onTrigger: () => onShowToast('校長室：校長正在審閱校務發展計劃。'),
        },
        {
          id: 'vp_desk',
          x: 8,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '周副校長辦公桌 (查簿/教務)',
          accent: '#38bdf8',
          onTrigger: () => onShowToast('周副校長：「記得 keep 好全學年英文功課欠交與跟進紀錄，六月查簿會睇。」'),
        },
      ];
    }

    if (room === 'GROUND_FLOOR') {
      return [
        {
          id: 'gf_stairs_up',
          x: 6,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '↑ G/F 中央樓梯（只上 1/F）',
          accent: '#fbbf24',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'gf_canteen',
          x: 10,
          y: 5,
          w: 2,
          h: 1,
          labelZh: 'G/F 學校飯堂／小食部',
          accent: '#f59e0b',
          onTrigger: () => onQuickSnackOrCoffee('SNACK'),
        },
      ];
    }

    // CLASS_1A .. CLASS_6C: Door is ALWAYS on the right-hand side!
    const activeCls = room.replace('CLASS_', '') as ClassCode;
    const returnCorridor = getFloorForClass(activeCls);
    return [
      {
        id: 'classroom_right_door',
        x: 12,
        y: 4,
        w: 1,
        h: 2,
        labelZh: `右門 → 離開 ${activeCls}`,
        accent: '#38bdf8',
        onTrigger: () => onEnterRoom(returnCorridor),
      },
    ];
  }, [
    room,
    makeClassHotspot,
    onOpenDeskTasks,
    onQuickSnackOrCoffee,
    onEnterRoom,
    onShowToast,
  ]);

  const stepManual = useCallback(
    (dx: number, dy: number) => {
      setAutoPath([]);
      setPendingAction(null);
      setTargetMarker(null);

      if (dx < 0) setFacing('LEFT');
      else if (dx > 0) setFacing('RIGHT');
      else if (dy < 0) setFacing('UP');
      else if (dy > 0) setFacing('DOWN');

      setPlayerPos((prev) => {
        const nx = Math.max(0, Math.min(GRID_COLS - 1, prev.x + dx));
        const ny = Math.max(1, Math.min(GRID_ROWS - 1, prev.y + dy));
        if (blockedTiles.has(`${nx},${ny}`)) return prev;
        return { x: nx, y: ny };
      });
      setWalkFrame((f) => (f + 1) % 2);
    },
    [blockedTiles]
  );

  useEffect(() => {
    if (autoPath.length === 0) return;
    const timer = setInterval(() => {
      setAutoPath((prevPath) => {
        if (prevPath.length === 0) return [];
        const [nextStep, ...rest] = prevPath;
        setPlayerPos((curr) => {
          const dx = nextStep.x - curr.x;
          const dy = nextStep.y - curr.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            setFacing(dx > 0 ? 'RIGHT' : 'LEFT');
          } else if (dy !== 0) {
            setFacing(dy > 0 ? 'DOWN' : 'UP');
          }
          return nextStep;
        });
        setWalkFrame((f) => (f + 1) % 2);

        if (rest.length === 0) {
          setTargetMarker(null);
          if (pendingAction) {
            const fn = pendingAction;
            setPendingAction(null);
            setTimeout(fn, 80);
          }
        }
        return rest;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [autoPath, pendingAction]);

  const triggerNearbyInteraction = useCallback(() => {
    for (const hs of hotspots) {
      const cx = hs.x + (hs.w - 1) / 2;
      const cy = hs.y + (hs.h - 1) / 2;
      if (Math.hypot(playerPos.x - cx, playerPos.y - cy) <= 1.9) {
        hs.onTrigger();
        return;
      }
    }

    if (room.startsWith('CLASS_')) {
      for (const inc of incidents) {
        if (inc.resolved) continue;
        const sx = 2 + inc.seatCol * 2;
        const sy = 3 + inc.seatRow * 2;
        if (Math.hypot(playerPos.x - sx, playerPos.y - sy) <= 2.2) {
          onSelectIncident(inc);
          return;
        }
      }
    }

    onShowToast('附近暫無可互動物件，行近辦公桌、課室門或有「!」的學生再按互動鍵。');
  }, [hotspots, playerPos, room, incidents, onSelectIncident, onShowToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') stepManual(0, -1);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') stepManual(0, 1);
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') stepManual(-1, 0);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') stepManual(1, 0);
      else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
        triggerNearbyInteraction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepManual, triggerNearbyInteraction]);

  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const gx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(relX * GRID_COLS)));
    const gy = Math.max(1, Math.min(GRID_ROWS - 1, Math.floor(relY * GRID_ROWS)));

    const hitHotspot = hotspots.find(
      (h) => gx >= h.x && gx < h.x + h.w && gy >= h.y && gy < h.y + h.h
    );

    if (hitHotspot) {
      const candidates: GridNode[] = [
        { x: hitHotspot.x, y: hitHotspot.y + 1 },
        { x: hitHotspot.x, y: hitHotspot.y - 1 },
        { x: hitHotspot.x - 1, y: hitHotspot.y },
        { x: hitHotspot.x + hitHotspot.w, y: hitHotspot.y },
      ].filter(
        (c) =>
          c.x >= 0 &&
          c.x < GRID_COLS &&
          c.y >= 1 &&
          c.y < GRID_ROWS &&
          !blockedTiles.has(`${c.x},${c.y}`)
      );

      const dest = candidates[0] ?? { x: gx, y: gy };
      if (Math.hypot(playerPos.x - dest.x, playerPos.y - dest.y) <= 1.3) {
        hitHotspot.onTrigger();
        return;
      }
      const path = findGridPath(playerPos, dest, blockedTiles);
      setTargetMarker(dest);
      setAutoPath(path);
      setPendingAction(() => hitHotspot.onTrigger);
      return;
    }

    const path = findGridPath(playerPos, { x: gx, y: gy }, blockedTiles);
    setTargetMarker({ x: gx, y: gy });
    setAutoPath(path);
    setPendingAction(null);
  };

  const activeClassCode = room.startsWith('CLASS_') ? (room.replace('CLASS_', '') as ClassCode) : null;
  const isMyAssignedClass = activeClassCode === pastorClass || activeClassCode === teachClass;

  const bgUrl = useMemo(() => {
    if (room === 'STAFFROOM') return './assets/backgrounds/staffroom.png';
    if (room === 'CORRIDOR_1F') return './assets/backgrounds/corridor_1f.png';
    if (room === 'CORRIDOR_2F') return './assets/backgrounds/corridor_2f.png';
    if (room === 'CORRIDOR_3F') return './assets/backgrounds/corridor_3f.png';
    if (room === 'SCHOOL_OFFICE') return './assets/backgrounds/school_office.png';
    if (room === 'PRINCIPAL_OFFICE') return './assets/backgrounds/principal_office.png';
    if (room === 'GROUND_FLOOR') return './assets/backgrounds/corridor_gf.png';
    if (activeClassCode) return `./assets/backgrounds/classrooms/${activeClassCode}.png`;
    return './assets/backgrounds/classroom.png';
  }, [room, activeClassCode]);

  // Responsive percentage-based character sizing so characters always match the room's furniture/chairs at any screen size!
  const depthScale = 0.88 + (playerPos.y / GRID_ROWS) * 0.25;
  const baseHeightPct = room.startsWith('CLASS_') ? 21 : 19;
  const playerHeightPct = (baseHeightPct * depthScale).toFixed(1);

  const isBackFacing = facing === 'UP';
  const frameNum = walkFrame === 0 ? 1 : 2;
  const playerSpriteSrc =
    playerGender === 'MALE'
      ? isBackFacing
        ? `./assets/sprites/player_male_back_${frameNum}.png`
        : `./assets/sprites/player_male_front_${frameNum}.png`
      : isBackFacing
      ? `./assets/sprites/player_female_back_${frameNum}.png`
      : `./assets/sprites/player_female_front_${frameNum}.png`;

  const flipPlayerHorizontal = facing === 'LEFT';

  // Generate display students for any of the 18 classrooms (real roster for assigned classes, generic classmates for other 16 rooms)
  const displayStudents = useMemo(() => {
    if (!activeClassCode) return [];
    const existing = students.filter((s) => s.className === activeClassCode);
    if (existing.length > 0) return existing;

    const filler: StudentProfile[] = [];
    for (let i = 0; i < 15; i++) {
      filler.push({
        id: `guest_${activeClassCode}_${i}`,
        nameZh: `${activeClassCode}同學`,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        className: activeClassCode,
        seatRow: Math.floor(i / 5),
        seatCol: i % 5,
        rapport: 0,
        lastInteractedDay: 0,
        missingHomeworkIds: [],
        detentionScheduled: false,
        rememberedEvents: [],
      });
    }
    return filler;
  }, [activeClassCode, students]);

  const floorBanner =
    room === 'STAFFROOM'
      ? '2/F 左翼・教員室 (中央辦公桌｜左茶水零食吧｜右書櫃及出口)'
      : room === 'CORRIDOR_2F'
      ? '2/F 走廊 (左：教員室｜中：上下樓梯｜右：3A–3C / 4A–4C 對門課室)'
      : room === 'CORRIDOR_1F'
      ? '1/F 三岔走廊 (北：校務處及校長室｜東：1A–1C / 2A–2C 對門課室｜南：上下樓梯)'
      : room === 'CORRIDOR_3F'
      ? '3/F 頂層走廊 (5A–5C / 6A–6C 對門課室｜樓梯只落 2/F)'
      : room === 'SCHOOL_OFFICE'
      ? '1/F 北翼・校務處 (General Office)'
      : room === 'PRINCIPAL_OFFICE'
      ? '1/F 北翼・校長及副校長室 (雙辦公桌格局)'
      : room === 'GROUND_FLOOR'
      ? 'G/F 地下・操場及飯堂（中央樓梯只上 1/F）'
      : `${activeClassCode} 課室${
          activeClassCode === pastorClass
            ? '（你的班主任兼任教班）'
            : activeClassCode === teachClass
            ? '（你的任教班）'
            : '（其他班別課室）'
        }`;

  return (
    <div
      style={{
        position: 'relative',
        background: '#090d16',
        border: dangerVignette ? '2px solid #ef4444' : '1px solid #334155',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.94)',
          padding: '7px 14px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: '#2dd4bf' }}>{floorBanner}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          點擊地面或課室門移動｜WASD / 左下角方向鍵
        </div>
      </div>

      {/* Properly scaled 16:9 viewport container (objectFit: contain so full room is visible without zoom-cropping) */}
      <div
        ref={containerRef}
        onClick={handleSceneClick}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '58vh',
          margin: '0 auto',
          cursor: 'pointer',
          overflow: 'hidden',
          background: '#090d16',
        }}
      >
        <img
          src={bgUrl}
          alt={room}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            display: 'block',
          }}
        />

        {/* Interactive Hotspot Markers */}
        {hotspots.map((hs) => {
          const leftPct = ((hs.x + hs.w / 2) / GRID_COLS) * 100;
          const topPct = ((hs.y + hs.h / 2) / GRID_ROWS) * 100;
          return (
            <div
              key={hs.id}
              onClick={(e) => {
                e.stopPropagation();
                hs.onTrigger();
              }}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(15, 23, 42, 0.86)',
                border: `1.5px solid ${hs.accent ?? '#2dd4bf'}`,
                color: '#f8fafc',
                padding: '2px 7px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
                zIndex: 8,
              }}
            >
              {hs.labelZh}
            </div>
          );
        })}

        {/* Click-to-Move Target Ring */}
        {targetMarker && (
          <div
            style={{
              position: 'absolute',
              left: `${((targetMarker.x + 0.5) / GRID_COLS) * 100}%`,
              top: `${((targetMarker.y + 0.65) / GRID_ROWS) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 24,
              height: 12,
              borderRadius: '50%',
              border: '2px solid #2dd4bf',
              background: 'rgba(45, 212, 191, 0.25)',
              pointerEvents: 'none',
              zIndex: 9,
            }}
          />
        )}

        {/* Staffroom Colleagues (percentage height = 17.5% of room height, matching desk chairs) */}
        {room === 'STAFFROOM' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '27%',
                top: '34%',
                height: '17.5%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_female_1_front.png"
                alt="陳老師"
                draggable={false}
                style={{ height: '100%', width: 'auto', display: 'block' }}
              />
              <span style={tagPillStyle}>陳老師</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '72%',
                top: '34%',
                height: '17.5%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_1_front.png"
                alt="張科主任"
                draggable={false}
                style={{ height: '100%', width: 'auto', display: 'block' }}
              />
              <span style={tagPillStyle}>張科主任</span>
            </div>
          </>
        )}

        {/* Principal & Vice Principal at their 2 executive desks */}
        {room === 'PRINCIPAL_OFFICE' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '30%',
                top: '38%',
                height: '18%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_2_front.png"
                alt="校長"
                draggable={false}
                style={{ height: '100%', width: 'auto', display: 'block' }}
              />
              <span style={tagPillStyle}>校長</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '68%',
                top: '48%',
                height: '18.5%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_1_front.png"
                alt="周副校長"
                draggable={false}
                style={{ height: '100%', width: 'auto', display: 'block' }}
              />
              <span style={tagPillStyle}>周副校長</span>
            </div>
          </>
        )}

        {/* Classroom Students (15.5%–18.5% height matching the wooden student desks & chairs!) */}
        {room.startsWith('CLASS_') &&
          displayStudents.map((stu) => {
            const leftPct = ((2.1 + stu.seatCol * 1.82) / GRID_COLS) * 100;
            const topPct = ((3.7 + stu.seatRow * 1.85) / GRID_ROWS) * 100;
            const rowHeightPct = (15.5 + stu.seatRow * 1.5).toFixed(1);
            const inc = isMyAssignedClass
              ? incidents.find((i) => !i.resolved && i.studentId === stu.id)
              : undefined;
            const spriteSrc =
              stu.gender === 'MALE'
                ? './assets/sprites/student_male_front_1.png'
                : './assets/sprites/student_female_front_1.png';

            return (
              <div
                key={stu.id}
                onClick={(e) => {
                  e.stopPropagation();
                  const dest: GridNode = {
                    x: Math.min(GRID_COLS - 1, 2 + stu.seatCol * 2),
                    y: Math.min(GRID_ROWS - 1, 3 + stu.seatRow * 2),
                  };
                  if (Math.hypot(playerPos.x - dest.x, playerPos.y - dest.y) <= 2.2 && inc) {
                    onSelectIncident(inc);
                    return;
                  }
                  const path = findGridPath(playerPos, dest, blockedTiles);
                  setTargetMarker(dest);
                  setAutoPath(path);
                  if (inc) {
                    setPendingAction(() => () => onSelectIncident(inc));
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  height: `${rowHeightPct}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10 + stu.seatRow * 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {inc && (
                  <div
                    style={{
                      background: '#fef9c3',
                      color: '#92400e',
                      border: '2px solid #1e293b',
                      borderRadius: 4,
                      padding: '0px 7px',
                      fontWeight: 900,
                      fontSize: 13,
                      marginBottom: 1,
                      boxShadow: '0 2px 5px rgba(0,0,0,0.45)',
                    }}
                  >
                    !
                  </div>
                )}
                <img
                  src={spriteSrc}
                  alt={stu.nameZh}
                  draggable={false}
                  style={{
                    height: '100%',
                    width: 'auto',
                    display: 'block',
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
                  }}
                />
                <span style={tagPillStyle}>{stu.nameZh}</span>
              </div>
            );
          })}

        {/* Player Character Sprite (percentage-scaled to match desks & doorways!) */}
        <div
          style={{
            position: 'absolute',
            left: `${((playerPos.x + 0.5) / GRID_COLS) * 100}%`,
            top: `${((playerPos.y + 0.45) / GRID_ROWS) * 100}%`,
            height: `${playerHeightPct}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.14s linear, top 0.14s linear',
            zIndex: 11 + playerPos.y * 2,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              background: '#0d9488',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 999,
              marginBottom: 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}
          >
            {playerGender === 'MALE' ? '你 (Lau Sir)' : '你 (Ms. Cheung)'}
          </div>
          <img
            src={playerSpriteSrc}
            alt="Player"
            draggable={false}
            style={{
              height: '100%',
              width: 'auto',
              display: 'block',
              transform: `${flipPlayerHorizontal ? 'scaleX(-1)' : 'scaleX(1)'} ${
                playerPosture === 'EXHAUSTED' ? 'translateY(2px)' : ''
              }`,
              filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.6))',
            }}
          />
        </div>

        {/* Bottom-Left Virtual Keypad */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            zIndex: 30,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 40px)',
            gridTemplateRows: 'repeat(3, 40px)',
            gap: 4,
            touchAction: 'none',
          }}
        >
          <div />
          <button onClick={() => stepManual(0, -1)} style={dpadBtnStyle} aria-label="Up">▲</button>
          <div />
          <button onClick={() => stepManual(-1, 0)} style={dpadBtnStyle} aria-label="Left">◀</button>
          <button
            onClick={triggerNearbyInteraction}
            style={{
              ...dpadBtnStyle,
              background: 'rgba(13, 148, 136, 0.92)',
              borderColor: '#5eead4',
              fontSize: 11,
            }}
            aria-label="Interact"
          >
            互動
          </button>
          <button onClick={() => stepManual(1, 0)} style={dpadBtnStyle} aria-label="Right">▶</button>
          <div />
          <button onClick={() => stepManual(0, 1)} style={dpadBtnStyle} aria-label="Down">▼</button>
          <div />
        </div>
      </div>

      {inLesson && (
        <div
          style={{
            background: '#064e3b',
            padding: '7px 14px',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            <strong>自動授課中（{activeClassCode}）：</strong>
            行近頭頂有「!」氣泡嘅學生並按互動，對話結束後自動繼續講書。
          </span>
        </div>
      )}
    </div>
  );
};

const tagPillStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(15, 23, 42, 0.88)',
  color: '#f8fafc',
  fontSize: 10,
  padding: '0px 5px',
  borderRadius: 4,
  marginTop: 1,
  whiteSpace: 'nowrap',
};

const dpadBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  background: 'rgba(15, 23, 42, 0.82)',
  color: '#f8fafc',
  border: '1.5px solid rgba(148, 163, 184, 0.55)',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
};
