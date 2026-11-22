// High-Definition 2.5D Sprite-Layered Campus & Classroom Viewport
// Fixes:
// - Exact Staffroom vs. Classroom vs. 4-Floor Corridor + School Office + Principal/VP 2-Desk Office mapping
// - 18 individual classroom plates (public/assets/backgrounds/classrooms/1A.png .. 6C.png)
// - Calibrated 2.5D character sprite proportions matching room furniture & doorways
// - Unified Controls: WASD / Arrows + Bottom-Left Mobile Virtual D-Pad + Click/Tap-to-Walk BFS

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

function findGridPath(
  start: GridNode,
  goal: GridNode,
  blocked: Set<string>
): GridNode[] {
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
      if (nx === goal.x && ny === goal.y) {
        return nextPath.slice(1);
      }
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
    } else if (room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') {
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
    } else if (room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') {
      set.add('3,2');
      set.add('4,2');
    }
    return set;
  }, [room]);

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
      const list: InteractiveHotspot[] = [
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
          x: 6,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '↓ 中央樓梯：落 1/F',
          accent: '#fbbf24',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'stairs_2f_up',
          x: 8,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '↑ 中央樓梯：上 3/F',
          accent: '#c084fc',
          onTrigger: () => onEnterRoom('CORRIDOR_3F'),
        },
      ];
      if (getFloorForClass(pastorClass) === 'CORRIDOR_2F') {
        list.push({
          id: 'enter_pastor_2f',
          x: 10,
          y: 5,
          w: 2,
          h: 1,
          labelZh: `進入 ${pastorClass} 課室 (班主任班)`,
          accent: '#34d399',
          onTrigger: () => onEnterRoom('CLASSROOM_PASTOR'),
        });
      }
      if (getFloorForClass(teachClass) === 'CORRIDOR_2F') {
        list.push({
          id: 'enter_teach_2f',
          x: 11,
          y: 6,
          w: 2,
          h: 1,
          labelZh: `進入 ${teachClass} 課室`,
          accent: '#38bdf8',
          onTrigger: () => onEnterRoom('CLASSROOM_TEACH'),
        });
      }
      return list;
    }

    if (room === 'CORRIDOR_1F') {
      const list: InteractiveHotspot[] = [
        {
          id: 'north_general_office',
          x: 4,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↑ 北翼：校務處 (General Office)',
          accent: '#38bdf8',
          onTrigger: () => onEnterRoom('SCHOOL_OFFICE'),
        },
        {
          id: 'north_principal_office',
          x: 7,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↑ 北翼：校長及副校長室',
          accent: '#f472b6',
          onTrigger: () => onEnterRoom('PRINCIPAL_OFFICE'),
        },
        {
          id: 'south_stairs_down',
          x: 5,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↓ 南翼樓梯：落 G/F 飯堂操場',
          accent: '#fbbf24',
          onTrigger: () => onEnterRoom('GROUND_FLOOR'),
        },
        {
          id: 'south_stairs_up',
          x: 8,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↑ 南翼樓梯：上 2/F 教員室',
          accent: '#2dd4bf',
          onTrigger: () => onEnterRoom('CORRIDOR_2F'),
        },
      ];
      if (getFloorForClass(pastorClass) === 'CORRIDOR_1F') {
        list.push({
          id: 'enter_pastor_1f',
          x: 10,
          y: 4,
          w: 2,
          h: 1,
          labelZh: `東翼對門課室：進入 ${pastorClass}`,
          accent: '#34d399',
          onTrigger: () => onEnterRoom('CLASSROOM_PASTOR'),
        });
      }
      if (getFloorForClass(teachClass) === 'CORRIDOR_1F') {
        list.push({
          id: 'enter_teach_1f',
          x: 11,
          y: 5,
          w: 2,
          h: 1,
          labelZh: `東翼對門課室：進入 ${teachClass}`,
          accent: '#38bdf8',
          onTrigger: () => onEnterRoom('CLASSROOM_TEACH'),
        });
      }
      return list;
    }

    if (room === 'CORRIDOR_3F') {
      const list: InteractiveHotspot[] = [
        {
          id: 'stairs_3f_down',
          x: 6,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↓ 3/F 樓梯（只落 2/F）',
          accent: '#2dd4bf',
          onTrigger: () => onEnterRoom('CORRIDOR_2F'),
        },
      ];
      if (getFloorForClass(pastorClass) === 'CORRIDOR_3F') {
        list.push({
          id: 'enter_pastor_3f',
          x: 9,
          y: 4,
          w: 2,
          h: 1,
          labelZh: `進入 ${pastorClass} 課室`,
          accent: '#34d399',
          onTrigger: () => onEnterRoom('CLASSROOM_PASTOR'),
        });
      }
      return list;
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
          x: 6,
          y: 4,
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
          x: 2,
          y: 5,
          w: 2,
          h: 1,
          labelZh: 'G/F 學校飯堂／小食部',
          accent: '#f59e0b',
          onTrigger: () => onQuickSnackOrCoffee('SNACK'),
        },
      ];
    }

    const activeCls = room === 'CLASSROOM_PASTOR' ? pastorClass : teachClass;
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
    pastorClass,
    teachClass,
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

    if (room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') {
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

    onShowToast('附近暫無可互動物件，行近辦公桌、門口或有「!」的學生再按互動鍵。');
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

  const activeClassCode =
    room === 'CLASSROOM_PASTOR'
      ? pastorClass
      : room === 'CLASSROOM_TEACH'
      ? teachClass
      : null;

  // Map each room to its dedicated HD background plate (including 18 named classrooms!)
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

  // Calibrated 2.5D character scale matching room furniture & doors
  // Perspective scale increases gently as characters move closer to bottom of screen
  const depthScale = 0.86 + (playerPos.y / GRID_ROWS) * 0.24;
  const baseCharacterHeight =
    room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH' ? 68 : 64;
  const playerHeightPx = Math.round(baseCharacterHeight * depthScale);

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

  const classStudents = useMemo(
    () => (activeClassCode ? students.filter((s) => s.className === activeClassCode) : []),
    [activeClassCode, students]
  );

  const floorBanner =
    room === 'STAFFROOM'
      ? '2/F 左翼・教員室 (中央辦公桌｜左茶水零食吧｜右書櫃及出口)'
      : room === 'CORRIDOR_2F'
      ? '2/F 走廊 (左：教員室｜中：上下樓梯｜右：3A–4C 對門課室)'
      : room === 'CORRIDOR_1F'
      ? '1/F 三岔走廊 (北：校務處及校長室｜東：1A–1C / 2A–2C 對門課室｜南：上下樓梯)'
      : room === 'CORRIDOR_3F'
      ? '3/F 頂層走廊 (5A–6C 對門課室｜樓梯只落 2/F)'
      : room === 'SCHOOL_OFFICE'
      ? '1/F 北翼・校務處 (General Office)'
      : room === 'PRINCIPAL_OFFICE'
      ? '1/F 北翼・校長及副校長室 (雙辦公桌格局)'
      : room === 'GROUND_FLOOR'
      ? 'G/F 地下・操場及飯堂（中央樓梯只上 1/F）'
      : `${activeClassCode} 課室（右門格局｜學生面向下方，你背對鏡頭面向學生）`;

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
          background: 'rgba(15, 23, 42, 0.92)',
          padding: '8px 14px',
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
          點擊地面自動行過去｜WASD / 左下角方向鍵移動
        </div>
      </div>

      <div
        ref={containerRef}
        onClick={handleSceneClick}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '64vh',
          cursor: 'pointer',
          overflow: 'hidden',
          background: '#0f172a',
        }}
      >
        <img
          src={bgUrl}
          alt={room}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
                background: 'rgba(15, 23, 42, 0.85)',
                border: `1.5px solid ${hs.accent ?? '#2dd4bf'}`,
                color: '#f8fafc',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
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

        {/* Staffroom Colleague Sprites (calibrated scale matching desks) */}
        {room === 'STAFFROOM' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '27%',
                top: '33%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                textAlign: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_female_1_front.png"
                alt="陳老師"
                draggable={false}
                style={{ height: 56, width: 'auto', display: 'block', margin: '0 auto' }}
              />
              <span style={tagPillStyle}>陳老師</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '72%',
                top: '33%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                textAlign: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_1_front.png"
                alt="張科主任"
                draggable={false}
                style={{ height: 56, width: 'auto', display: 'block', margin: '0 auto' }}
              />
              <span style={tagPillStyle}>張科主任</span>
            </div>
          </>
        )}

        {/* Principal & Vice Principal Sprites at their 2 executive desks */}
        {room === 'PRINCIPAL_OFFICE' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '34%',
                top: '35%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                textAlign: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_2_front.png"
                alt="校長"
                draggable={false}
                style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }}
              />
              <span style={tagPillStyle}>校長</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '66%',
                top: '35%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                textAlign: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_1_front.png"
                alt="周副校長"
                draggable={false}
                style={{ height: 58, width: 'auto', display: 'block', margin: '0 auto' }}
              />
              <span style={tagPillStyle}>周副校長</span>
            </div>
          </>
        )}

        {/* Classroom Students (facing bottom of screen, calibrated scale matching student desks) */}
        {(room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') &&
          classStudents.map((stu) => {
            const leftPct = ((2.25 + stu.seatCol * 1.8) / GRID_COLS) * 100;
            const topPct = ((3.5 + stu.seatRow * 1.8) / GRID_ROWS) * 100;
            const rowScale = 0.88 + stu.seatRow * 0.08;
            const inc = incidents.find((i) => !i.resolved && i.studentId === stu.id);
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
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10 + stu.seatRow * 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                {inc && (
                  <div
                    style={{
                      display: 'inline-block',
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
                    height: Math.round(52 * rowScale),
                    width: 'auto',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
                <span style={tagPillStyle}>{stu.nameZh}</span>
              </div>
            );
          })}

        {/* Player Character Sprite (calibrated 2.5D scale + front/back view) */}
        <div
          style={{
            position: 'absolute',
            left: `${((playerPos.x + 0.5) / GRID_COLS) * 100}%`,
            top: `${((playerPos.y + 0.45) / GRID_ROWS) * 100}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.14s linear, top 0.14s linear',
            zIndex: 11 + playerPos.y * 2,
            pointerEvents: 'none',
            textAlign: 'center',
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
              height: playerHeightPx,
              width: 'auto',
              display: 'block',
              margin: '0 auto',
              transform: `${flipPlayerHorizontal ? 'scaleX(-1)' : 'scaleX(1)'} ${
                playerPosture === 'EXHAUSTED' ? 'translateY(2px)' : ''
              }`,
              filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.55))',
            }}
          />
        </div>

        {/* Bottom-Left Virtual Keypad */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 14,
            bottom: 14,
            zIndex: 30,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 42px)',
            gridTemplateRows: 'repeat(3, 42px)',
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
              background: 'rgba(13, 148, 136, 0.9)',
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
            padding: '8px 14px',
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
  background: 'rgba(15, 23, 42, 0.85)',
  color: '#f8fafc',
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 4,
  marginTop: 1,
};

const dpadBtnStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  background: 'rgba(15, 23, 42, 0.82)',
  color: '#f8fafc',
  border: '1.5px solid rgba(148, 163, 184, 0.55)',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
};
