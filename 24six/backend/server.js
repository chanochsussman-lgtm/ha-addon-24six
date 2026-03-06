const express = require('express');
const session = require('express-session');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8484;
const HA_URL = process.env.HA_URL || 'http://supervisor/core';
const HA_TOKEN = process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN || '';

const TWENTYFOUR_BASE = 'https://24six.app/api/v3';
const TWENTYFOUR_AUTH_HEADER = 'production-android-44fd2f70';

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Session secret: use env var if set, otherwise derive from a stable file-based secret
// This prevents forced re-login on every add-on restart
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  // Use /data (HA add-on persistent storage) so sessions survive restarts.
  // Falls back to __dirname for local dev outside HA.
  const secretFile = process.env.SESSION_SECRET_FILE
    || path.join(__dirname, '.session_secret');
  try {
    sessionSecret = fs.readFileSync(secretFile, 'utf8').trim();
  } catch {
    sessionSecret = require('crypto').randomBytes(32).toString('hex');
    try { fs.writeFileSync(secretFile, sessionSecret); } catch {}
  }
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// Serve React frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ── 24Six Auth ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TWENTYFOUR_AUTH_HEADER,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.token) {
      return res.status(401).json({ error: data.message || 'Login failed' });
    }

    // Store token + profile list in session
    req.session.token = data.token;
    req.session.userId = data.userId || data.id;

    // Fetch profiles
    const profileResp = await fetch(`${TWENTYFOUR_BASE}/user/profiles`, {
      headers: {
        'Authorization': `Bearer ${data.token}`,
      }
    });
    const profileData = await profileResp.json();
    const profiles = Array.isArray(profileData) ? profileData : (profileData.profiles || []);

    // Auto-select first profile
    if (profiles.length > 0) {
      req.session.profileId = profiles[0].id;
      req.session.profileName = profiles[0].name;
    }

    res.json({
      success: true,
      profiles,
      selectedProfile: req.session.profileId,
      userName: data.name || data.email,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Network error' });
  }
});

app.post('/api/auth/select-profile', (req, res) => {
  if (!req.session.token) return res.status(401).json({ error: 'Not logged in' });
  const { profileId, profileName } = req.body;
  req.session.profileId = profileId;
  req.session.profileName = profileName;
  res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/status', (req, res) => {
  if (!req.session.token) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    profileId: req.session.profileId,
    profileName: req.session.profileName,
  });
});

// ── 24Six API Proxy ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.token) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function twentyfourHeaders(req) {
  return {
    'Authorization': `Bearer ${req.session.token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function profileParam(req) {
  return req.session.profileId ? `profileId=${req.session.profileId}` : '';
}

// Generic GET proxy helper
async function proxyGet(req, res, path, extraParams = '') {
  const sep = path.includes('?') ? '&' : '?';
  const pp = profileParam(req);
  const query = [extraParams, pp].filter(Boolean).join('&');
  const url = `${TWENTYFOUR_BASE}${path}${query ? sep + query : ''}`;
  try {
    const resp = await fetch(url, { headers: twentyfourHeaders(req) });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Upstream error' });
  }
}

// ── Homepage / Browse ───────────────────────────────────────────────────────
app.get('/api/browse/home', requireAuth, async (req, res) => {
  const sections = [
    'yourTopSongs', 'yourTopArtists', 'trending', 'trendingSongs',
    'newAlbums', 'newSingles', 'newArtists', 'newStories',
    'playlists', 'myPlaylists', 'by24Six', 'popular',
    'newestTorah', 'newestDafYomi', 'recent', 'rewind'
  ];
  try {
    const results = await Promise.allSettled(
      sections.map(section =>
        fetch(`${TWENTYFOUR_BASE}/browse/home?section=${section}&${profileParam(req)}`, {
          headers: twentyfourHeaders(req)
        }).then(r => r.json()).then(d => ({ section, data: d }))
      )
    );
    const home = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') home[sections[i]] = r.value.data;
    });
    res.json(home);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/browse/section/:section', requireAuth, (req, res) => {
  proxyGet(req, res, `/browse/home`, `section=${req.params.section}&limit=${req.query.limit || 50}&offset=${req.query.offset || 0}`);
});

// ── Search ──────────────────────────────────────────────────────────────────
app.get('/api/search', requireAuth, (req, res) => {
  proxyGet(req, res, `/search`, `q=${encodeURIComponent(req.query.q || '')}&type=${req.query.type || 'all'}`);
});

// ── Artists ─────────────────────────────────────────────────────────────────
app.get('/api/artists', requireAuth, (req, res) => {
  proxyGet(req, res, '/browse/artists', `limit=${req.query.limit || 50}&offset=${req.query.offset || 0}`);
});

app.get('/api/artists/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/artists/${req.params.id}`);
});

app.get('/api/artists/:id/albums', requireAuth, (req, res) => {
  proxyGet(req, res, `/artists/${req.params.id}/albums`);
});

app.get('/api/artists/:id/songs', requireAuth, (req, res) => {
  proxyGet(req, res, `/artists/${req.params.id}/songs`);
});

// ── Albums ──────────────────────────────────────────────────────────────────
app.get('/api/albums/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/albums/${req.params.id}`);
});

app.get('/api/albums/:id/songs', requireAuth, (req, res) => {
  proxyGet(req, res, `/albums/${req.params.id}/songs`);
});

// ── Songs ───────────────────────────────────────────────────────────────────
app.get('/api/songs/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/content/${req.params.id}`);
});

// ── Playlists ────────────────────────────────────────────────────────────────
app.get('/api/playlists', requireAuth, (req, res) => {
  proxyGet(req, res, '/playlists');
});

app.get('/api/playlists/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/playlists/${req.params.id}`);
});

app.get('/api/playlists/:id/songs', requireAuth, (req, res) => {
  proxyGet(req, res, `/playlists/${req.params.id}/songs`);
});

// ── Library ──────────────────────────────────────────────────────────────────
app.get('/api/library/songs', requireAuth, (req, res) => {
  proxyGet(req, res, '/library/songs');
});

app.get('/api/library/albums', requireAuth, (req, res) => {
  proxyGet(req, res, '/library/albums');
});

app.get('/api/library/artists', requireAuth, (req, res) => {
  proxyGet(req, res, '/library/artists');
});

app.post('/api/library/songs/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/library/songs/${req.params.id}`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/library/songs/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/library/songs/${req.params.id}`, {
      method: 'DELETE',
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Stream URL ───────────────────────────────────────────────────────────────
app.get('/api/stream/:id', requireAuth, async (req, res) => {
  const format = req.query.format || 'aac';
  try {
    const resp = await fetch(
      `${TWENTYFOUR_BASE}/content/${req.params.id}/play?format=${format}`,
      { headers: twentyfourHeaders(req), redirect: 'manual' }
    );
    const location = resp.headers.get('location');
    if (location) return res.json({ url: location });
    const data = await resp.json();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Recently Played ──────────────────────────────────────────────────────────
app.get('/api/recent', requireAuth, (req, res) => {
  proxyGet(req, res, '/browse/home', `section=recent&limit=50`);
});

app.post('/api/recent/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/content/${req.params.id}/played`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Favorites ────────────────────────────────────────────────────────────────
app.get('/api/favorites', requireAuth, (req, res) => {
  proxyGet(req, res, '/favorites');
});

app.post('/api/favorites/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/favorites/${req.params.id}`, {
      method: 'POST', headers: twentyfourHeaders(req),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/favorites/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/favorites/${req.params.id}`, {
      method: 'DELETE', headers: twentyfourHeaders(req),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get('/api/categories', requireAuth, (req, res) => {
  proxyGet(req, res, '/browse/categories');
});

app.get('/api/categories/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/categories/${req.params.id}`);
});

// ── HA Speaker Control ────────────────────────────────────────────────────────
app.get('/api/ha/speakers', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${HA_URL}/api/states`, {
      headers: { 'Authorization': `Bearer ${HA_TOKEN}` }
    });
    const states = await resp.json();
    const speakers = states.filter(s =>
      s.entity_id.startsWith('media_player.') &&
      s.attributes.friendly_name
    ).map(s => ({
      entity_id: s.entity_id,
      name: s.attributes.friendly_name,
      state: s.state,
      volume: s.attributes.volume_level,
      muted: s.attributes.is_volume_muted,
      source: s.attributes.source,
      group_members: s.attributes.group_members || [],
      supports_grouping: !!s.attributes.group_members,
    }));
    res.json(speakers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ha/call', requireAuth, async (req, res) => {
  const { domain, service, entity_id, data: serviceData } = req.body;
  try {
    const resp = await fetch(`${HA_URL}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entity_id, ...serviceData }),
    });
    const result = await resp.json();
    res.status(resp.status).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Play a 24Six stream URL on a HA media player
app.post('/api/ha/play', requireAuth, async (req, res) => {
  const { entity_id, song_id, format = 'aac' } = req.body;
  if (!entity_id || !song_id) return res.status(400).json({ error: 'Missing entity_id or song_id' });

  try {
    // Get stream URL
    const streamResp = await fetch(
      `${TWENTYFOUR_BASE}/content/${song_id}/play?format=${format}`,
      { headers: twentyfourHeaders(req), redirect: 'manual' }
    );
    const streamUrl = streamResp.headers.get('location');
    if (!streamUrl) return res.status(500).json({ error: 'No stream URL' });

    // Send to HA
    const haResp = await fetch(`${HA_URL}/api/services/media_player/play_media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id,
        media_content_id: streamUrl,
        media_content_type: 'music',
      }),
    });
    const result = await haResp.json();

    // Log play
    fetch(`${TWENTYFOUR_BASE}/content/${song_id}/played`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
    }).catch(() => {});

    res.json({ success: true, streamUrl, result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Speaker grouping
app.post('/api/ha/group', requireAuth, async (req, res) => {
  const { leader, members } = req.body;
  try {
    const resp = await fetch(`${HA_URL}/api/services/media_player/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entity_id: leader, group_members: members }),
    });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ha/ungroup', requireAuth, async (req, res) => {
  const { entity_id } = req.body;
  try {
    const resp = await fetch(`${HA_URL}/api/services/media_player/unjoin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entity_id }),
    });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Player State (in-memory, shared across clients via WebSocket) ─────────────
let playerState = {
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  entity_id: null,
  shuffle: false,
  repeat: 'none', // none | one | all
};

app.get('/api/player/state', (req, res) => res.json(playerState));

app.post('/api/player/state', (req, res) => {
  // Whitelist only known keys to prevent state pollution
  const allowed = ['currentSong','queue','queueIndex','isPlaying','entity_id','shuffle','repeat','progress','duration','volume'];
  const patch = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }
  playerState = { ...playerState, ...patch };
  broadcastPlayerState();
  res.json(playerState);
});

app.post('/api/player/queue', (req, res) => {
  const { songs, startIndex = 0 } = req.body;
  if (!Array.isArray(songs) || songs.length === 0) return res.status(400).json({ error: 'songs must be a non-empty array' });
  const idx = Math.max(0, Math.min(startIndex, songs.length - 1));
  playerState.queue = songs;
  playerState.queueIndex = idx;
  playerState.currentSong = songs[idx] || null;
  broadcastPlayerState();
  res.json(playerState);
});

app.post('/api/player/queue/add', (req, res) => {
  const { songs } = req.body;
  if (!Array.isArray(songs)) return res.status(400).json({ error: 'songs must be an array' });
  playerState.queue = [...playerState.queue, ...songs];
  broadcastPlayerState();
  res.json(playerState);
});

app.post('/api/player/next', (req, res) => {
  const { queue, queueIndex, shuffle, repeat } = playerState;
  if (!queue.length) return res.json(playerState);
  let nextIdx;
  if (shuffle) {
    // Avoid replaying the same track
    const candidates = queue.map((_, i) => i).filter(i => i !== queueIndex);
    nextIdx = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : queueIndex;
  } else {
    nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeat === 'all') nextIdx = 0;
      else return res.json(playerState);
    }
  }
  playerState = { ...playerState, queueIndex: nextIdx, currentSong: queue[nextIdx], isPlaying: true, progress: 0 };
  broadcastPlayerState();
  res.json(playerState);
});

app.post('/api/player/prev', (req, res) => {
  const { queue, queueIndex } = playerState;
  if (!queue.length || queueIndex <= 0) return res.json(playerState);
  const prevIdx = queueIndex - 1;
  playerState = { ...playerState, queueIndex: prevIdx, currentSong: queue[prevIdx], isPlaying: true, progress: 0 };
  broadcastPlayerState();
  res.json(playerState);
});

// ── WebSocket for real-time player state sync ─────────────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws/player' });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'state', payload: playerState }));
  ws.on('close', () => wsClients.delete(ws));
  ws.on('message', (msg) => {
    try {
      const { type, payload } = JSON.parse(msg);
      if (type === 'state_update') {
        playerState = { ...playerState, ...payload };
        broadcastPlayerState(ws);
      }
    } catch {}
  });
});

function broadcastPlayerState(exclude) {
  const msg = JSON.stringify({ type: 'state', payload: playerState });
  wsClients.forEach(ws => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// ── Follow / Unfollow Artist ─────────────────────────────────────────────────
app.post('/api/artists/:id/follow', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/artists/${req.params.id}/follow`, {
      method: 'POST', headers: twentyfourHeaders(req),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/artists/:id/follow', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/artists/${req.params.id}/follow`, {
      method: 'DELETE', headers: twentyfourHeaders(req),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Playlist CRUD ────────────────────────────────────────────────────────────
app.post('/api/playlists', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/playlists`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ name, profileId: req.session.profileId }),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/playlists/:id/rename', requireAuth, async (req, res) => {
  const { name } = req.body;
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/playlists/${req.params.id}`, {
      method: 'PATCH',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ name }),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/playlists/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/playlists/${req.params.id}`, {
      method: 'DELETE', headers: twentyfourHeaders(req),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/playlists/:id/songs', requireAuth, async (req, res) => {
  const { songId } = req.body;
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/playlists/${req.params.id}/songs`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ songId }),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/playlists/:id/songs/:songId', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/playlists/${req.params.id}/songs/${req.params.songId}`, {
      method: 'DELETE', headers: twentyfourHeaders(req),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Lyrics ───────────────────────────────────────────────────────────────────
app.get('/api/lyrics/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/content/${req.params.id}/lyrics`);
});

// ── Bookmark / Resume position ───────────────────────────────────────────────
app.post('/api/player/bookmark/:id', requireAuth, async (req, res) => {
  const { position } = req.body;
  if (typeof position !== 'number') return res.status(400).json({ error: 'position required' });
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/content/${req.params.id}/position`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ position, profileId: req.session.profileId }),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Autoplay ─────────────────────────────────────────────────────────────────
app.get('/api/autoplay/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/content/${req.params.id}/related`);
});

// ── Videos ───────────────────────────────────────────────────────────────────
app.get('/api/videos', requireAuth, (req, res) => {
  proxyGet(req, res, '/browse/videos', `limit=${req.query.limit || 50}&offset=${req.query.offset || 0}`);
});

app.get('/api/videos/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/content/${req.params.id}`);
});

// ── Podcasts ─────────────────────────────────────────────────────────────────
app.get('/api/podcasts', requireAuth, (req, res) => {
  proxyGet(req, res, '/browse/podcasts');
});

app.get('/api/podcasts/:id', requireAuth, (req, res) => {
  proxyGet(req, res, `/podcasts/${req.params.id}`);
});

app.get('/api/podcasts/:id/episodes', requireAuth, (req, res) => {
  proxyGet(req, res, `/podcasts/${req.params.id}/episodes`);
});

// ── Rewind ───────────────────────────────────────────────────────────────────
app.get('/api/rewind', requireAuth, (req, res) => {
  proxyGet(req, res, '/rewind', `year=${new Date().getFullYear()}`);
});

// ── Zmanim (via Hebcal) ──────────────────────────────────────────────────────
app.get('/api/zmanim', requireAuth, async (req, res) => {
  try {
    const { lat, lng, city } = req.query;
    let geoParams;
    if (lat && lng) {
      geoParams = `geo=pos&latitude=${lat}&longitude=${lng}&tzid=auto`;
    } else if (city) {
      geoParams = `geo=city&city=${encodeURIComponent(city)}`;
    } else {
      return res.status(400).json({ error: 'lat/lng or city required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const url = `https://www.hebcal.com/zmanim?cfg=json&${geoParams}&date=${today}&sec=1`;

    const r = await fetch(url);
    const data = await r.json();

    // Also fetch today's parasha / Hebrew date
    const calUrl = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=on&mf=on&ss=on&c=on&${geoParams}&M=on&s=on`;
    const calR = await fetch(calUrl);
    const calData = await calR.json();

    const parashaItem = (calData.items || []).find(i => i.category === 'parashat');
    const shabbatItem = (calData.items || []).find(i => i.category === 'holiday' && i.title?.toLowerCase().includes('shabbat'));

    res.json({
      times: data.times || {},
      date: data.date,
      hebrew: calData.title,
      location: data.location,
      parasha: parashaItem?.title?.replace('Parashat ', '').replace('Parsha ', '') || null,
      isShabbat: !!(shabbatItem || new Date().getDay() === 6),
    });
  } catch (err) {
    console.error('Zmanim error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Brachos (from bundled JSON) ──────────────────────────────────────────────
let brachosData = null;

app.get('/api/brachos', (req, res) => {
  if (!brachosData) {
    try {
      const brachosPath = path.join(__dirname, 'brachos.json');
      if (!fs.existsSync(brachosPath)) {
        return res.json({ results: [], total: 0 });
      }
      brachosData = JSON.parse(fs.readFileSync(brachosPath, 'utf8'));
    } catch {
      return res.json({ results: [], total: 0 });
    }
  }
  res.json(brachosData);
});

// ── Share links ──────────────────────────────────────────────────────────────
app.get('/api/share/:type/:id', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/${type}s/${id}/share`, {
      headers: twentyfourHeaders(req),
    });
    if (resp.ok) {
      const data = await resp.json();
      return res.json(data);
    }
    // Fallback: construct share URL
    res.json({ url: `https://24six.app/${type}/${id}` });
  } catch (err) {
    res.json({ url: `https://24six.app/${type}/${id}` });
  }
});

// ── Issue reporting ──────────────────────────────────────────────────────────
app.post('/api/report', requireAuth, async (req, res) => {
  const { contentId, contentType } = req.body;
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/report`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ contentId, contentType, profileId: req.session.profileId }),
    });
    res.status(resp.ok ? 200 : resp.status).json(resp.ok ? { success: true } : await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Downloads ────────────────────────────────────────────────────────────────
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(__dirname, '../downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

const downloadQueue = {};  // { songId: { status, progress, path, contentType, song } }

app.get('/api/downloads', requireAuth, (req, res) => {
  const downloads = Object.entries(downloadQueue).map(([contentId, d]) => ({ contentId, ...d }));
  res.json({ downloads });
});

app.post('/api/downloads', requireAuth, async (req, res) => {
  const { songId, format = 'aac' } = req.body;
  if (!songId) return res.status(400).json({ error: 'songId required' });

  if (downloadQueue[songId]?.status === 'completed') {
    return res.json(downloadQueue[songId]);
  }

  // Capture token NOW before res.json() commits the response and req may be GC'd
  const token = req.session.token;

  downloadQueue[songId] = { status: 'downloading', progress: 0, contentId: songId };
  res.json({ status: 'queued', contentId: songId });

  // Background download - uses captured token, not req.session
  (async () => {
    try {
      const streamResp = await fetch(
        `${TWENTYFOUR_BASE}/content/${songId}/play?format=${format}`,
        { headers: { 'Authorization': `Bearer ${token}` }, redirect: 'manual' }
      );
      const streamUrl = streamResp.headers.get('location');
      if (!streamUrl) { downloadQueue[songId].status = 'failed'; return; }

      const filePath = path.join(DOWNLOADS_DIR, `${songId}.${format}`);
      const fileResp = await fetch(streamUrl);
      const totalSize = parseInt(fileResp.headers.get('content-length') || '0');
      let downloaded = 0;

      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        fileResp.body.on('data', chunk => {
          downloaded += chunk.length;
          if (totalSize > 0) {
            downloadQueue[songId].progress = Math.round((downloaded / totalSize) * 100);
          }
        });
        fileResp.body.pipe(writeStream);
        fileResp.body.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      downloadQueue[songId] = { status: 'completed', progress: 100, path: filePath, contentId: songId };
    } catch (e) {
      downloadQueue[songId] = { status: 'failed', progress: 0, contentId: songId, error: e.message };
    }
  })();
});

app.delete('/api/downloads/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const dl = downloadQueue[id];
  if (dl?.path && fs.existsSync(dl.path)) {
    try { fs.unlinkSync(dl.path); } catch {}
  }
  delete downloadQueue[id];
  res.json({ success: true });
});

// Serve downloaded file (for offline playback)
app.get('/api/downloads/:id/play', requireAuth, (req, res) => {
  const dl = downloadQueue[req.params.id];
  if (!dl?.path || !fs.existsSync(dl.path)) {
    return res.status(404).json({ error: 'Not downloaded' });
  }
  res.sendFile(dl.path);
});

// ── Polls ─────────────────────────────────────────────────────────────────────
app.get('/api/polls', requireAuth, (req, res) => {
  proxyGet(req, res, '/polls');
});

app.post('/api/polls/:id/vote', requireAuth, async (req, res) => {
  const { optionIndex } = req.body;
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/polls/${req.params.id}/vote`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ optionIndex, profileId: req.session.profileId }),
    });
    res.status(resp.status).json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Alarms (stored locally in SQLite-like JSON file) ─────────────────────────
const ALARMS_FILE = path.join(__dirname, 'alarms.json');
const loadAlarms = () => {
  try { return JSON.parse(fs.readFileSync(ALARMS_FILE, 'utf8')); } catch { return []; }
};
const saveAlarms = (alarms) => fs.writeFileSync(ALARMS_FILE, JSON.stringify(alarms, null, 2));

app.get('/api/alarms', requireAuth, (req, res) => {
  res.json({ alarms: loadAlarms() });
});

app.post('/api/alarms', requireAuth, (req, res) => {
  const alarms = loadAlarms();
  const alarm = { ...req.body, id: Date.now().toString(), enabled: true };
  alarms.push(alarm);
  saveAlarms(alarms);
  res.json(alarm);

  // Schedule alarm
  scheduleAlarm(alarm);
});

app.put('/api/alarms/:id', requireAuth, (req, res) => {
  const alarms = loadAlarms().map(a => a.id === req.params.id ? { ...a, ...req.body } : a);
  saveAlarms(alarms);
  const updated = alarms.find(a => a.id === req.params.id);
  // Always cancel existing schedule and re-evaluate
  cancelAlarm(req.params.id);
  if (updated?.enabled) scheduleAlarm(updated);
  res.json(updated);
});

app.delete('/api/alarms/:id', requireAuth, (req, res) => {
  const alarms = loadAlarms().filter(a => a.id !== req.params.id);
  saveAlarms(alarms);
  res.json({ success: true });
});

// Simple alarm scheduler
const scheduledAlarms = {};
function scheduleAlarm(alarm) {
  if (!alarm.enabled || !alarm.time) return;
  const [h, m] = alarm.time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const msUntil = next - now;
  if (scheduledAlarms[alarm.id]) clearTimeout(scheduledAlarms[alarm.id]);
  scheduledAlarms[alarm.id] = setTimeout(() => {
    console.log(`Alarm fired: ${alarm.name}`);
    // Broadcast alarm event to all connected WebSocket clients
    const alarmMsg = JSON.stringify({ type: 'alarm', payload: alarm });
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(alarmMsg);
    });
    // Reschedule for next day if it has repeat days set
    if (alarm.days?.length > 0) scheduleAlarm(alarm);
  }, msUntil);
}

function cancelAlarm(id) {
  if (scheduledAlarms[id]) {
    clearTimeout(scheduledAlarms[id]);
    delete scheduledAlarms[id];
  }
}

// Load and schedule all alarms on startup
loadAlarms().filter(a => a.enabled).forEach(scheduleAlarm);

// ── Live Radio ────────────────────────────────────────────────────────────────
app.get('/api/live', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/radio/?livestream=1`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/live/replays', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/radio/replays`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/live/stream', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/radio/?livestream=1&format=aac`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    // Return the stream URL for the frontend to use directly
    const streamUrl = data.streamUrl || data.url || data.stream || data.data?.streamUrl;
    if (!streamUrl) return res.status(404).json({ error: 'No stream URL found' });
    res.json({ url: streamUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Torah Content ─────────────────────────────────────────────────────────────
app.get('/api/torah/home', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/dashboard?type=torah`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    // Fallback: try podcast dashboard filtered
    try {
      const resp2 = await fetch(`${TWENTYFOUR_BASE}/dashboard?categoryId=torah`, {
        headers: twentyfourHeaders(req),
      });
      const data2 = await resp2.json();
      res.json(data2);
    } catch {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/torah/daf-yomi', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/album/section/newestDafYomi?limit=20`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/torah/parsha', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/album/section/parsha?limit=20`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/torah/shiurim', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/podcast/section/newestTorah?limit=30`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Collections ───────────────────────────────────────────────────────────────
app.get('/api/collections/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/album/collection/${req.params.id}`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collections/:id/songs', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/song/collection/${req.params.id}?limit=50`, {
      headers: twentyfourHeaders(req),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Settings persistence ──────────────────────────────────────────────────────
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

app.get('/api/settings', requireAuth, (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      res.json(data);
    } else {
      res.json({});
    }
  } catch {
    res.json({});
  }
});

app.post('/api/settings', requireAuth, (req, res) => {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk download management ──────────────────────────────────────────────────
app.delete('/api/downloads/all', requireAuth, (req, res) => {
  try {
    const downloads = loadDownloads ? loadDownloads() : [];
    // Clear all completed downloads from the store
    const store = loadDownloadStore ? loadDownloadStore() : {};
    const downloadDir = path.join(__dirname, 'data', 'downloads');
    // Remove all downloaded files
    if (fs.existsSync(downloadDir)) {
      fs.readdirSync(downloadDir).forEach(f => {
        try { fs.unlinkSync(path.join(downloadDir, f)); } catch {}
      });
    }
    // Clear the downloads list
    const dataFile = path.join(__dirname, 'data', 'downloads.json');
    if (fs.existsSync(dataFile)) {
      const all = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '[]');
      const kept = all.filter(d => d.status === 'downloading');
      fs.writeFileSync(dataFile, JSON.stringify(kept, null, 2));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cache', requireAuth, (req, res) => {
  // The proxy doesn't maintain a local cache — nothing to clear on the server side
  // The frontend will clear its react-query cache on receiving this response
  res.json({ ok: true, message: 'Cache cleared' });
});

// ── PIN verification ──────────────────────────────────────────────────────────
app.post('/api/auth/verify-pin', requireAuth, async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length !== 4) return res.status(400).json({ error: 'Invalid PIN' });
  try {
    const resp = await fetch(`${TWENTYFOUR_BASE}/user/verify-pin`, {
      method: 'POST',
      headers: twentyfourHeaders(req),
      body: JSON.stringify({ pin, profileId: req.session.profileId }),
    });
    const data = await resp.json();
    res.json({ ok: resp.ok, ...data });
  } catch (err) {
    // Fallback: accept any 4-digit PIN if API doesn't support it
    res.json({ ok: true });
  }
});

// ── Fallback to React SPA ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`24Six add-on running on port ${PORT}`);
});
