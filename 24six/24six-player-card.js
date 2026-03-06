/**
 * 24Six Player Card — Lovelace custom element  v2
 * Full-featured: speed, quality, sleep timer, ±10s, lyrics, autoplay toggle
 * Syncs with add-on via WebSocket /ws/player
 */

const ADDON_URL = '/api/hassio_ingress/twentyfour_six';

class TwentyfourSixCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = null;
    this._speakers = [];
    this._ws = null;
    this._wsRetry = null;
    this._hass = null;
    this._rendered = false;
    this._sleepTimeout = null;
    this._sleepInterval = null;
    this._sleepEndsAt = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._rendered = true;
      this._render();
      this._connect();
      this._loadSpeakers();
    }
  }

  setConfig(config) { this._config = config || {}; }
  static getStubConfig() { return {}; }

  connectedCallback() {
    if (this._hass && !this._rendered) {
      this._rendered = true;
      this._render();
      this._connect();
      this._loadSpeakers();
    }
  }

  disconnectedCallback() {
    if (this._ws) { this._ws.close(); this._ws = null; }
    if (this._wsRetry) { clearTimeout(this._wsRetry); this._wsRetry = null; }
    if (this._sleepTimeout) clearTimeout(this._sleepTimeout);
    if (this._sleepInterval) clearInterval(this._sleepInterval);
  }

  _connect() {
    if (this._ws) this._ws.close();
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    try {
      this._ws = new WebSocket(`${proto}://${location.host}${ADDON_URL}/ws/player`);
      this._ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'state') { this._state = msg.payload; this._updateUI(); }
        } catch {}
      };
      this._ws.onclose = () => { this._wsRetry = setTimeout(() => this._connect(), 5000); };
      this._ws.onerror = () => { this._ws.close(); };
    } catch {}
  }

  async _loadSpeakers() {
    try {
      const r = await fetch(`${ADDON_URL}/api/ha/speakers`);
      if (r.ok) { this._speakers = await r.json(); this._updateUI(); }
    } catch {}
  }

  async _call(path, method = 'POST', body) {
    try {
      await fetch(`${ADDON_URL}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {}
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { box-sizing: border-box; }
        .card {
          background: #17181c; border-radius: 16px; padding: 16px;
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
          color: #f0f0f2; border: 1px solid #2a2b32;
        }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .artwork { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; background: #1e1f25; flex-shrink: 0; }
        .artwork-placeholder { width: 52px; height: 52px; border-radius: 10px; background: #1e1f25; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .song-info { flex: 1; min-width: 0; }
        .song-title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f0f0f2; }
        .song-artist { font-size: 12px; color: #9a9ba6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .open-btn { background: rgba(200,168,75,0.15); border: 1px solid #c8a84b; border-radius: 8px; color: #c8a84b; font-size: 11px; padding: 4px 8px; cursor: pointer; text-decoration: none; flex-shrink: 0; }
        .progress-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .time { font-size: 11px; color: #6b6c77; width: 30px; }
        .time.right { text-align: right; }
        input[type=range] { flex: 1; -webkit-appearance: none; height: 3px; border-radius: 2px; background: #2a2b32; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #c8a84b; margin-top: -4.5px; }
        .controls { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .btn { background: none; border: none; cursor: pointer; color: #9a9ba6; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 6px; transition: color 0.15s; font-size: 11px; font-weight: 600; line-height: 1; }
        .btn:hover { color: #f0f0f2; }
        .btn.active { color: #c8a84b; }
        .play-btn { width: 40px; height: 40px; border-radius: 50%; background: #c8a84b; color: #0d0d0f; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .secondary-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
        .volume-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .picker { background: #1e1f25; border: 1px solid #2a2b32; border-radius: 6px; color: #9a9ba6; font-size: 11px; font-weight: 600; padding: 3px 6px; cursor: pointer; outline: none; font-family: inherit; flex-shrink: 0; }
        .picker.active { color: #c8a84b; border-color: rgba(200,168,75,0.4); }
        .speaker-select { width: 100%; background: #1e1f25; border: 1px solid #2a2b32; border-radius: 8px; color: #9a9ba6; font-size: 12px; padding: 6px 8px; cursor: pointer; outline: none; margin-bottom: 8px; font-family: inherit; }
        .open-app { display: block; width: 100%; text-align: center; font-size: 12px; padding: 8px; border-radius: 10px; background: rgba(200,168,75,0.1); color: #c8a84b; border: 1px solid rgba(200,168,75,0.3); cursor: pointer; text-decoration: none; font-family: inherit; }
        .open-app:hover { background: rgba(200,168,75,0.18); }
      </style>

      <div class="card">
        <div class="header">
          <div class="artwork-placeholder" id="art">🎵</div>
          <div class="song-info">
            <div class="song-title" id="title">24Six</div>
            <div class="song-artist" id="artist">Nothing playing</div>
          </div>
          <a class="open-btn" href="${ADDON_URL}" target="_blank">Open ↗</a>
        </div>

        <div class="progress-wrap">
          <span class="time" id="elapsed">0:00</span>
          <input type="range" id="progress" min="0" max="100" value="0" />
          <span class="time right" id="total">0:00</span>
        </div>

        <div class="controls">
          <button class="btn" id="shuffle" title="Shuffle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
          </button>
          <button class="btn" id="prev" title="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
          </button>
          <button class="btn" id="rewind10" title="-10s">-10</button>
          <button class="play-btn" id="playpause">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="btn" id="forward10" title="+10s">+10</button>
          <button class="btn" id="next" title="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
          <button class="btn" id="repeat" title="Repeat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>

        <div class="secondary-row">
          <select class="picker" id="speedPicker" title="Playback speed">
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1" selected>1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="1.75">1.75×</option>
            <option value="2">2×</option>
          </select>
          <select class="picker" id="qualityPicker" title="Stream quality">
            <option value="aac" selected>AAC</option>
            <option value="mp3">MP3</option>
            <option value="flac">HQ</option>
          </select>
          <select class="picker" id="sleepPicker" title="Sleep timer">
            <option value="">💤 Off</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
            <option value="20">20 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hr</option>
            <option value="90">1.5 hr</option>
          </select>
          <button class="btn" id="autoplayBtn" title="Autoplay">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="3" x2="19" y2="21"/></svg>
          </button>
          <a class="btn" id="lyricsBtn" href="${ADDON_URL}" target="_blank" title="Lyrics" style="text-decoration:none;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </a>
        </div>

        <div class="volume-row">
          <button class="btn" id="mute">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
          <input type="range" id="volume" min="0" max="100" value="70" />
        </div>

        <select class="speaker-select" id="speakerSel">
          <option value="">🖥 This Device (Browser)</option>
        </select>
        <a class="open-app" href="${ADDON_URL}" target="_blank">Open Full 24Six App ↗</a>
      </div>`;

    // Transport
    this.shadowRoot.getElementById('playpause').addEventListener('click', () => {
      this._call('/api/player/state', 'POST', { isPlaying: !this._state?.isPlaying });
    });
    this.shadowRoot.getElementById('prev').addEventListener('click', () => this._call('/api/player/prev'));
    this.shadowRoot.getElementById('next').addEventListener('click', () => this._call('/api/player/next'));
    this.shadowRoot.getElementById('rewind10').addEventListener('click', () => {
      const p = Math.max(0, (this._state?.progress || 0) - 10);
      this._call('/api/player/state', 'POST', { progress: p });
    });
    this.shadowRoot.getElementById('forward10').addEventListener('click', () => {
      const dur = this._state?.duration || 0;
      const p = Math.min(dur > 0 ? dur : (this._state?.progress || 0) + 10, (this._state?.progress || 0) + 10);
      this._call('/api/player/state', 'POST', { progress: p });
    });
    this.shadowRoot.getElementById('shuffle').addEventListener('click', () => {
      this._call('/api/player/state', 'POST', { shuffle: !this._state?.shuffle });
    });
    this.shadowRoot.getElementById('repeat').addEventListener('click', () => {
      const r = this._state?.repeat || 'none';
      const next = r === 'none' ? 'all' : r === 'all' ? 'one' : 'none';
      this._call('/api/player/state', 'POST', { repeat: next });
    });
    this.shadowRoot.getElementById('progress').addEventListener('change', (e) => {
      this._call('/api/player/state', 'POST', { progress: Number(e.target.value) });
    });
    this.shadowRoot.getElementById('mute').addEventListener('click', () => {
      const v = (this._state?.volume ?? 0.7) > 0 ? 0 : 0.7;
      this._call('/api/player/state', 'POST', { volume: v });
      const eid = this._state?.entity_id;
      if (eid) this._hass?.callService('media_player', 'volume_set', { entity_id: eid, volume_level: v });
    });
    this.shadowRoot.getElementById('volume').addEventListener('input', (e) => {
      const v = e.target.value / 100;
      this._call('/api/player/state', 'POST', { volume: v });
      const eid = this._state?.entity_id;
      if (eid) this._hass?.callService('media_player', 'volume_set', { entity_id: eid, volume_level: v });
    });
    this.shadowRoot.getElementById('speakerSel').addEventListener('change', (e) => {
      this._call('/api/player/state', 'POST', { entity_id: e.target.value || null });
    });
    this.shadowRoot.getElementById('speedPicker').addEventListener('change', (e) => {
      const speed = Number(e.target.value);
      this._call('/api/player/state', 'POST', { speed });
      e.target.classList.toggle('active', speed !== 1);
    });
    this.shadowRoot.getElementById('qualityPicker').addEventListener('change', (e) => {
      const quality = e.target.value;
      this._call('/api/player/state', 'POST', { quality });
      e.target.classList.toggle('active', quality !== 'aac');
    });
    this.shadowRoot.getElementById('sleepPicker').addEventListener('change', (e) => {
      const minutes = Number(e.target.value) || 0;
      if (this._sleepTimeout) clearTimeout(this._sleepTimeout);
      if (this._sleepInterval) { clearInterval(this._sleepInterval); this._sleepInterval = null; }
      const sp = e.target;
      if (minutes > 0) {
        sp.classList.add('active');
        this._sleepEndsAt = Date.now() + minutes * 60000;
        this._sleepTimeout = setTimeout(() => {
          this._call('/api/player/state', 'POST', { isPlaying: false });
          clearInterval(this._sleepInterval); this._sleepInterval = null;
          sp.value = ''; sp.classList.remove('active');
          if (sp.options[0]) sp.options[0].text = '💤 Off';
        }, minutes * 60000);
        this._sleepInterval = setInterval(() => {
          const rem = Math.max(0, Math.ceil((this._sleepEndsAt - Date.now()) / 1000));
          const m = Math.floor(rem / 60), s = rem % 60;
          if (sp.options[0]) sp.options[0].text = `💤 ${m}:${s.toString().padStart(2, '0')}`;
        }, 1000);
      } else {
        sp.classList.remove('active');
        if (sp.options[0]) sp.options[0].text = '💤 Off';
      }
    });
    this.shadowRoot.getElementById('autoplayBtn').addEventListener('click', () => {
      const next = !(this._state?.autoplay !== false);
      this._call('/api/player/state', 'POST', { autoplay: next });
      this.shadowRoot.getElementById('autoplayBtn').classList.toggle('active', next);
    });
  }

  _updateUI() {
    if (!this.shadowRoot.querySelector('.card')) return;
    const s = this._state;
    const song = s?.currentSong;

    // Artwork
    const artEl = this.shadowRoot.getElementById('art');
    const art = song?.artwork || song?.image || song?.cover;
    if (artEl) {
      if (art) {
        if (artEl.tagName === 'IMG') { artEl.src = art; }
        else {
          const img = document.createElement('img');
          img.className = 'artwork'; img.id = 'art'; img.src = art; img.alt = '';
          artEl.replaceWith(img);
        }
      } else if (artEl.tagName === 'IMG') {
        const ph = document.createElement('div');
        ph.className = 'artwork-placeholder'; ph.id = 'art'; ph.textContent = '🎵';
        artEl.replaceWith(ph);
      }
    }

    const _set = (id, txt) => { const el = this.shadowRoot.getElementById(id); if (el) el.textContent = txt; };
    _set('title', song?.title || song?.name || '24Six');
    _set('artist', song?.artist?.name || song?.artistName || song?.artist || (song ? '' : 'Nothing playing'));

    const prog = this.shadowRoot.getElementById('progress');
    if (prog) {
      prog.max = s?.duration || 100;
      prog.value = s?.progress || 0;
      _set('elapsed', this._fmt(s?.progress));
      _set('total', this._fmt(s?.duration));
    }

    const pp = this.shadowRoot.getElementById('playpause');
    if (pp) pp.innerHTML = s?.isPlaying
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

    const _cls = (id, active) => { const el = this.shadowRoot.getElementById(id); if (el) el.className = active ? 'btn active' : 'btn'; };
    _cls('shuffle', s?.shuffle);
    _cls('repeat', s?.repeat && s.repeat !== 'none');
    _cls('autoplayBtn', s?.autoplay !== false);

    const vol = this.shadowRoot.getElementById('volume');
    if (vol) vol.value = Math.round((s?.volume ?? 0.7) * 100);

    const speedPick = this.shadowRoot.getElementById('speedPicker');
    if (speedPick) { speedPick.value = String(s?.speed || 1); speedPick.classList.toggle('active', (s?.speed || 1) !== 1); }

    const qualPick = this.shadowRoot.getElementById('qualityPicker');
    if (qualPick) { qualPick.value = s?.quality || 'aac'; qualPick.classList.toggle('active', (s?.quality || 'aac') !== 'aac'); }

    const lyrBtn = this.shadowRoot.getElementById('lyricsBtn');
    if (lyrBtn) {
      lyrBtn.href = song?.id ? `${ADDON_URL}/lyrics/${song.id}` : ADDON_URL;
      lyrBtn.className = song?.id ? 'btn active' : 'btn';
      lyrBtn.style.textDecoration = 'none';
    }

    const sel = this.shadowRoot.getElementById('speakerSel');
    if (sel && this._speakers.length && sel.options.length === 1) {
      this._speakers.forEach(sp => {
        const opt = document.createElement('option');
        opt.value = sp.entity_id;
        opt.textContent = `🔊 ${sp.name}`;
        sel.appendChild(opt);
      });
    }
    if (sel) sel.value = s?.entity_id || '';
  }

  _fmt(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

customElements.define('twentyfour-six-card', TwentyfourSixCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'twentyfour-six-card',
  name: '24Six Player',
  description: 'Full-featured 24Six player card: speed, quality, sleep timer, ±10s, lyrics, autoplay',
});
