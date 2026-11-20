// Local-First Autosave + Optional Google Sign-In Cloud Sync Adapter

import { GameState } from '../types/game';

const LOCAL_SAVE_KEY = 'hk_teacher_sim_v1_autosave';

export interface SaveAdapter {
  save(state: GameState): Promise<void>;
  load(): Promise<GameState | null>;
  clear(): Promise<void>;
}

export class LocalSaveAdapter implements SaveAdapter {
  async save(state: GameState): Promise<void> {
    try {
      const payload = JSON.stringify({
        savedAt: new Date().toISOString(),
        version: '1.0.0',
        state,
      });
      localStorage.setItem(LOCAL_SAVE_KEY, payload);
    } catch (err) {
      console.warn('Local autosave failed:', err);
    }
  }

  async load(): Promise<GameState | null> {
    try {
      const raw = localStorage.getItem(LOCAL_SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state as GameState;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(LOCAL_SAVE_KEY);
  }
}

export const defaultSaveAdapter = new LocalSaveAdapter();
