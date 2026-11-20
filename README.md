# Hong Kong Secondary Teacher Simulator (`hk-teacher-sim`)

A 3DS-Pokémon-style 2.5D/3D third-person realistic career survival RPG set in an 18-class Hong Kong secondary school.

## V1 Core Loop & Architecture
- **School Structure**: 18 classes (`1A`–`6C`). Player is a newly graduated English Language teacher managing 2 classes (1 Pastoring + Teaching class, e.g. `4C`, and 1 Junior Teaching class, e.g. `1B`).
- **Five Play Modes**: Week-Planning Mode, School-Day Mode (`40x` in-class / `60x` campus / `72x` after-school until hard `19:00` janitor curfew), Scene Mode (paused dialogue), Review Mode, and Holiday/Break Mode.
- **3-Slot FIFO Leftover Fermentation**: Unfinished tasks ferment from Quiet Return (`E`) to Loud Return (`F`) on overflow.
- **English Homework & June Book Inspection (六月查簿)**: Auto-delivery after `08:20`, corridor chasing (`追功課`), `16:00` detention, and full-year Exercise Book Audit Log.
- **Two-Tier Skewed Automation**: Macro Day-Sim (with policy stances) and Micro Work-Sim, capped at a hidden 70% max success rate.

## Local Development
```bash
npm install
npm run dev
```
