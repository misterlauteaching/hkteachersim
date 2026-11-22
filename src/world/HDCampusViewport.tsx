// High-Definition 2.5D Sprite-Layered Campus & Classroom Viewport
// Features:
// - Pre-rendered 1376x768 2.5D room illustrations (Staffroom, 4-Floor Corridor Junction, Classroom)
// - Depth-sorted HD sprites (Player Male/Female front & back, Colleagues front & back, Students front & back)
// - Rectangular "!" speech bubbles over incident students (player walks over to interact)
// - Unified Controls: WASD / Arrows + Bottom-Left Mobile Virtual D-Pad + Click/Tap-to-Walk BFS Pathfinding

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

// Lightweight BFS shortest-path finder over walkable tiles
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
      // Allow stepping onto goal even if goal is an interactive object tile
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

  // Set natural entry position & facing per room
  useEffect(() => {
    setAutoPath([]);
    setPendingAction(null);
    setTargetMarker(null);

    if (room === 'STAFFROOM') {
      setPlayerPos({ x: 6, y: 6 });
      setFacing('UP');
    } else if (room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') {
      // Classroom: doors on right-hand side; player faces top of screen (back view)
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
      setPlayerPos({ x: 6, y: 5 });
      setFacing('UP');
    }
  }, [room]);

  // Blocked obstacle tiles per room (desks, walls)
  const blockedTiles = useMemo(() => {
    const set = new Set<string>();
    if (room === 'STAFFROOM') {
      // Central teacher desk obstacle at x=6..7, y=4
      set.add('6,4');
      set.add('7,4');
      // Regular grid of colleague desks
      for (const gx of [3, 4, 9, 10]) {
        for (const gy of [2, 6]) {
          set.add(`${gx},${gy}`);
        }
      }
    } else if (room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') {
      // Teacher podium top-left
      set.add('3,2');
      set.add('4,2');
    }
    return set;
  }, [room]);

  // Interactive hotspots matching the exact spatial design
  const hotspots: InteractiveHotspot[] = useMemo(() => {
    if (room === 'STAFFROOM') {
      return [
        {
          id: 'player_desk',
          x: 6,
          y: 4,
          w: 2,
          h: 1,
          labelZh: '你的辦公桌 [按互動鍵 / 點擊]',
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
          y: 3,
          w: 1,
          h: 2,
          labelZh: '離開教員室 → 2/F 走廊',
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
          labelZh: '← 返回 2/F 教員室',
          accent: '#2dd4bf',
          onTrigger: () => onEnterRoom('STAFFROOM'),
        },
        {
          id: 'stairs_2f',
          x: 6,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '2/F 中央樓梯 (落 1/F)',
          accent: '#fbbf24',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'stairs_2f_up',
          x: 8,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '2/F 中央樓梯 (上 3/F)',
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
      // 3-Way Junction: North -> Offices, East -> 1A-1C / 2A-2C opposing classrooms, South -> Stairs up/down
      const list: InteractiveHotspot[] = [
        {
          id: 'north_offices',
          x: 5,
          y: 2,
          w: 2,
          h: 1,
          labelZh: '↑ 北翼：校務處及校長室',
          accent: '#f472b6',
          onTrigger: () => onEnterRoom('SCHOOL_OFFICE'),
        },
        {
          id: 'south_stairs',
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
          x: 9,
          y: 4,
          w: 2,
          h: 1,
          labelZh: `東翼課室：進入 ${pastorClass} (對面門格局)`,
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
          labelZh: `東翼課室：進入 ${teachClass} (對面門格局)`,
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
          id: 'back_to_1f',
          x: 6,
          y: 7,
          w: 2,
          h: 1,
          labelZh: '↓ 返回 1/F 三岔走廊',
          accent: '#93c5fd',
          onTrigger: () => onEnterRoom('CORRIDOR_1F'),
        },
        {
          id: 'principal_door',
          x: 6,
          y: 3,
          w: 2,
          h: 1,
          labelZh: '校長室及校務處櫃檯',
          accent: '#f472b6',
          onTrigger: () => onShowToast('校務處書記：「老師你好，暫時無緊急文件要簽收。」'),
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
          labelZh: 'G/F 小食部／飯堂',
          accent: '#f59e0b',
          onTrigger: () => onQuickSnackOrCoffee('SNACK'),
        },
      ];
    }

    // CLASSROOM_PASTOR or CLASSROOM_TEACH: Door is ALWAYS on the right-hand side!
    const activeCls = room === 'CLASSROOM_PASTOR' ? pastorClass : teachClass;
    const returnCorridor = getFloorForClass(activeCls);
    return [
      {
        id: 'classroom_right_door',
        x: 12,
        y: 4,
        w: 1,
        h: 2,
        labelZh: `課室右門 → 離開 ${activeCls}`,
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

  // Manual single-step movement (cancels any active tap-to-walk path)
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
        const ny = Math.max(0, Math.min(GRID_ROWS - 1, prev.y + dy));
        if (blockedTiles.has(`${nx},${ny}`)) return prev;
        return { x: nx, y: ny };
      });
      setWalkFrame((f) => (f + 1) % 2);
    },
    [blockedTiles]
  );

  // Automatic path stepping when user taps/clicks a destination tile
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
    }, 155);
    return () => clearInterval(timer);
  }, [autoPath, pendingAction]);

  // Trigger adjacent hotspot or nearby "!" incident student when pressing Interact (E / Enter / Space)
  const triggerNearbyInteraction = useCallback(() => {
    // 1. Check nearby hotspot within 1.6 tiles
    for (const hs of hotspots) {
      const cx = hs.x + (hs.w - 1) / 2;
      const cy = hs.y + (hs.h - 1) / 2;
      if (Math.hypot(playerPos.x - cx, playerPos.y - cy) <= 1.8) {
        hs.onTrigger();
        return;
      }
    }

    // 2. Check nearby student with "!" bubble in classroom
    if (room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') {
      for (const inc of incidents) {
        if (inc.resolved) continue;
        const sx = 2 + inc.seatCol * 2;
        const sy = 3 + inc.seatRow * 2;
        if (Math.hypot(playerPos.x - sx, playerPos.y - sy) <= 2.1) {
          onSelectIncident(inc);
          return;
        }
      }
    }

    onShowToast('附近暫無可互動物件，行近辦公桌、門口或有「!」的學生再按互動鍵。');
  }, [hotspots, playerPos, room, incidents, onSelectIncident, onShowToast]);

  // Keyboard WASD / Arrow keys + E/Enter/Space interact
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

  // Click / Tap anywhere in the room -> auto-walk to that grid space (and trigger if hotspot/student!)
  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const gx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(relX * GRID_COLS)));
    const gy = Math.max(1, Math.min(GRID_ROWS - 1, Math.floor(relY * GRID_ROWS)));

    // Check if user tapped an interactive hotspot directly
    const hitHotspot = hotspots.find(
      (h) => gx >= h.x && gx < h.x + h.w && gy >= h.y && gy < h.y + h.h
    );

    if (hitHotspot) {
      // Find closest walkable tile adjacent to the hotspot
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
      if (Math.hypot(playerPos.x - dest.x, playerPos.y - dest.y) <= 1.2) {
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

  // Select HD Background Plate
  const bgUrl =
    room === 'STAFFROOM'
      ? './assets/backgrounds/staffroom.png'
      : room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH'
      ? './assets/backgrounds/classroom.png'
      : './assets/backgrounds/corridor.png';

  // Select Player Sprite based on gender, facing (front vs back!), and walk frame
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

  // Build depth-sorted character renderables (Staffroom colleagues or Classroom students facing bottom)
  const activeClassCode =
    room === 'CLASSROOM_PASTOR'
      ? pastorClass
      : room === 'CLASSROOM_TEACH'
      ? teachClass
      : null;

  const classStudents = useMemo(
    () => (activeClassCode ? students.filter((s) => s.className === activeClassCode) : []),
    [activeClassCode, students]
  );

  const floorBanner =
    room === 'STAFFROOM'
      ? '2/F 左翼・教員室 (中央辦公桌｜左茶水零食吧｜右書櫃及出口)'
      : room === 'CORRIDOR_2F'
      ? '2/F 走廊 (左：教員室｜中：上下樓梯｜右：中三至中四課室)'
      : room === 'CORRIDOR_1F'
      ? '1/F 三岔走廊 (北：校務處及校長室｜東：1A–1C / 2A–2C 對門課室｜南：上下樓梯)'
      : room === 'CORRIDOR_3F'
      ? '3/F 走廊 (中五至中六課室｜樓梯只落 2/F)'
      : room === 'SCHOOL_OFFICE'
      ? '1/F 北翼・校務處及校長室'
      : room === 'GROUND_FLOOR'
      ? 'G/F 地下・飯堂及操場（中央樓梯只上 1/F）'
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
      {/* Top Location Pill */}
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

      {/* HD 16:9 Scene Viewport */}
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
        {/* High-Definition 2.5D Room Background Image */}
        <img
          src={bgUrl}
          alt={room}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter:
              room === 'CORRIDOR_3F'
                ? 'hue-rotate(18deg) brightness(0.95)'
                : room === 'GROUND_FLOOR'
                ? 'hue-rotate(-25deg) brightness(1.03)'
                : 'none',
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
                background: 'rgba(15, 23, 42, 0.84)',
                border: `1.5px solid ${hs.accent ?? '#2dd4bf'}`,
                color: '#f8fafc',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
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
              width: 28,
              height: 14,
              borderRadius: '50%',
              border: '2px solid #2dd4bf',
              background: 'rgba(45, 212, 191, 0.25)',
              pointerEvents: 'none',
              zIndex: 9,
            }}
          />
        )}

        {/* Staffroom Colleague Sprites (Old-money business attire) */}
        {room === 'STAFFROOM' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '26%',
                top: '31%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                textAlign: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_female_1_front.png"
                alt="陳老師"
                draggable={false}
                style={{ height: 86, width: 'auto', display: 'block', margin: '0 auto' }}
              />
              <span style={tagPillStyle}>陳老師</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '73%',
                top: '31%',
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
                textAlign: 'center',
              }}
            >
              <img
                src="./assets/sprites/staff_male_1_front.png"
                alt="張科主任"
                draggable={false}
                style={{ height: 86, width: 'auto', display: 'block', margin: '0 auto' }}
              />
              <span style={tagPillStyle}>張科主任</span>
            </div>
          </>
        )}

        {/* Classroom Students (Facing toward bottom of page in 2.5D; rectangular "!" bubble on incident) */}
        {(room === 'CLASSROOM_PASTOR' || room === 'CLASSROOM_TEACH') &&
          classStudents.map((stu) => {
            const leftPct = ((2.2 + stu.seatCol * 1.85) / GRID_COLS) * 100;
            const topPct = ((3.4 + stu.seatRow * 1.75) / GRID_ROWS) * 100;
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
                  if (Math.hypot(playerPos.x - dest.x, playerPos.y - dest.y) <= 2.1 && inc) {
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
                {/* Rectangular "!" Word Bubble when something happens */}
                {inc && (
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      background: '#fef9c3',
                      color: '#92400e',
                      border: '2px solid #1e293b',
                      borderRadius: 5,
                      padding: '1px 8px',
                      fontWeight: 900,
                      fontSize: 14,
                      marginBottom: 2,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                    }}
                  >
                    !
                  </div>
                )}
                <img
                  src={spriteSrc}
                  alt={stu.nameZh}
                  draggable={false}
                  style={{ height: 74, width: 'auto', display: 'block', margin: '0 auto' }}
                />
                <span style={tagPillStyle}>{stu.nameZh}</span>
              </div>
            );
          })}

        {/* Player Character Sprite (Front & Back views, business casual, depth-sorted) */}
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
              padding: '1px 7px',
              borderRadius: 999,
              marginBottom: 2,
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
              height: 94,
              width: 'auto',
              display: 'block',
              margin: '0 auto',
              transform: `${flipPlayerHorizontal ? 'scaleX(-1)' : 'scaleX(1)'} ${
                playerPosture === 'EXHAUSTED' ? 'translateY(3px)' : ''
              }`,
              filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.55))',
            }}
          />
        </div>

        {/* Bottom-Left Virtual Keypad (Mobile & Touch Friendly) */}
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
