import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Auth
  configured: false,
  profile: null,
  setConfigured: (configured, profile) => set({ configured, profile }),

  // Player
  queue: [],
  queueIndex: -1,
  playing: false,
  currentTrack: null,
  progress: 0,
  duration: 0,

  setQueue: (queue, index = 0) => set({ queue, queueIndex: index, currentTrack: queue[index] || null }),
  playTrack: (track, queue, index) => {
    set({ queue: queue || [track], queueIndex: index ?? 0, currentTrack: track, playing: true });
  },
  next: () => {
    const { queue, queueIndex } = get();
    const next = queueIndex + 1;
    if (next < queue.length) set({ queueIndex: next, currentTrack: queue[next], playing: true });
  },
  prev: () => {
    const { queue, queueIndex } = get();
    const prev = queueIndex - 1;
    if (prev >= 0) set({ queueIndex: prev, currentTrack: queue[prev], playing: true });
  },
  setPlaying: (playing) => set({ playing }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
}));
