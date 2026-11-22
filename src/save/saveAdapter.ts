import { GameState } from '../types/game';

const LOCAL_SAVE_KEY = 'hk_teacher_sim_v2_hd_autosave';

export const defaultSaveAdapter = {
  async save(state: GameState): Promise<void> {
    try {
      localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), state }));
    } catch (err) {
      console.warn('Autosave failed:', err);
    }
  },
  async load(): Promise<GameState | null> {
    try {
      const raw = localStorage.getItem(LOCAL_SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).state as GameState;
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    localStorage.removeItem(LOCAL_SAVE_KEY);
  },
};
