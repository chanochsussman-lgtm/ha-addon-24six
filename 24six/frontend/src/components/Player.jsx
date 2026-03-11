import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';

// Singleton audio element — only one, lives at module scope
const audioEl = new Audio();
audioEl.crossOrigin = 'use-credentials';

export default function Player() {
  const { currentTrack, playing, progress, duration, setPlaying, setProgress, setDuration, next, prev } = useStore();
  const seeking = useRef(false);

  // Load new track when currentTrack changes
  useEffect(() => {
    if (!currentTrack?.url) return;
    audioEl.src = currentTrack.url;
    audioEl.load();
    audioEl.play().catch(console.error);
  }, [currentTrack?.url]);

  // Sync play/pause state
  useEffect(() => {
    if (playing) audioEl.play().catch(console.error);
    else audioEl.pause();
  }, [playing]);

  // Wire up audio events
  useEffect(() => {
    const onTime = () => { if (!seeking.current) setProgress(audioEl.currentTime); };
    const onDur = () => setDuration(isNaN(audioEl.duration) ? 0 : audioEl.duration);
    const onEnd = () => next();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audioEl.addEventListener('timeupdate', onTime);
    audioEl.addEventListener('durationchange', onDur);
    audioEl.addEventListener('ended', onEnd);
    audioEl.addEventListener('play', onPlay);
    audioEl.addEventListener('pause', onPause);

    // Android: prevent suspension when screen off
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && playing) audioEl.play().catch(() => {});
    });

    return () => {
      audioEl.removeEventListener('timeupdate', onTime);
      audioEl.removeEventListener('durationchange', onDur);
      audioEl.removeEventListener('ended', onEnd);
      audioEl.removeEventListener('play', onPlay);
      audioEl.removeEventListener('pause', onPause);
    };
  }, []);

  if (!currentTrack) return null;

  const img = currentTrack.img || currentTrack.image;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const pct = duration ? (progress / duration) * 100 : 0;

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    seeking.current = true;
    audioEl.currentTime = x * duration;
    setProgress(audioEl.currentTime);
    setTimeout(() => { seeking.current = false; }, 200);
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 flex items-center gap-4 z-50"
      style={{ height: 88 }}
    >
      {/* Art + track info */}
      <div className="flex items-center gap-3 w-56 flex-shrink-0 min-w-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-card flex-shrink-0">
          {img
            ? <img src={img} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center text-muted">♪</div>
          }
        </div>
        <div className="min-w-0">
          <p className="text-text text-sm font-medium truncate">{currentTrack.title || currentTrack.name}</p>
          <p className="text-text-secondary text-xs truncate">{currentTrack.artist_name || currentTrack.artist || ''}</p>
        </div>
      </div>

      {/* Controls + scrubber */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-6">
          <button onClick={prev} className="text-text-secondary hover:text-text text-xl transition-colors">⏮</button>
          <button
            onClick={() => setPlaying(!playing)}
            className="w-10 h-10 bg-accent hover:bg-accent-dim rounded-full flex items-center justify-center text-bg text-lg transition-colors"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={next} className="text-text-secondary hover:text-text text-xl transition-colors">⏭</button>
        </div>
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="text-muted text-xs w-8 text-right tabular-nums">{fmt(progress)}</span>
          <div
            className="flex-1 h-1 bg-border rounded-full cursor-pointer group"
            onClick={seek}
          >
            <div
              className="h-full bg-accent rounded-full transition-all group-hover:bg-accent-dim"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-muted text-xs w-8 tabular-nums">{fmt(duration)}</span>
        </div>
      </div>

      {/* Right spacer (future: volume, cast button) */}
      <div className="w-32 flex-shrink-0" />
    </div>
  );
}
