'use strict';
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8484;
const HA_TOKEN = process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN || '';
const BASE = 'https://24six.app/api/v3';
const DATA_FILE = '/data/auth.json';

const PLATFORM_HEADERS = {
  'X-PLATFORM-KEY': 'production-android-44fd2f70',
  'X-PLATFORM-DEVICE': 'android',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// ── Persist auth to /data ──────────────────────────────────────────────────
function loadAuth() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return null; }
}
function saveAuth(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch(e) { console.error('saveAuth:', e.message); }
}
function clearAuth() {
  try { fs.unlinkSync(DATA_FILE); } catch {}
}

// In-memory cache of current auth (loaded at startup)
let auth = loadAuth();

function apiHeaders() {
  if (!auth?.token) return PLATFORM_HEADERS;
  return { ...PLATFORM_HEADERS, 'Authorization': `Bearer ${auth.token}` };
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!auth?.token) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ── Setup status ────────────────────────────────────────────────────────────
app.get('/api/setup/status', (req, res) => {
  if (!auth?.token) return res.json({ configured: false });
  res.json({ configured: true, profile: auth.profile });
});

// ── Login: get profiles ─────────────────────────────────────────────────────
app.post('/api/setup/profiles', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  try {
    const resp = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: PLATFORM_HEADERS,
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.token) return res.status(401).json({ error: data.message || 'Login failed' });

    // Fetch profile list
    const pResp = await fetch(`${BASE}/profile-list`, {
      headers: { ...PLATFORM_HEADERS, 'Authorization': `Bearer ${data.token}` },
    });
    const pData = await pResp.json();
    const profiles = Array.isArray(pData) ? pData : (pData.profiles || pData.data || []);

    // Save temp token + profiles for profile selection step
    auth = { token: data.token, profiles };
    res.json({ profiles });
  } catch (err) {
    console.error('profiles error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Select profile ──────────────────────────────────────────────────────────
app.post('/api/setup/save', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'Missing profileId' });
  try {
    const profile = (auth?.profiles || []).find(p => p.id == profileId) || { id: profileId };
    auth = { token: auth.token, profile, profileId };
    saveAuth(auth);
    res.json({ ok: true, profile });
  } catch (err) {
    console.error('save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Logout ──────────────────────────────────────────────────────────────────
app.post('/api/setup/reset', (req, res) => {
  auth = null;
  clearAuth();
  res.json({ ok: true });
});

// ── Home sections ───────────────────────────────────────────────────────────
app.get('/api/browse/home', requireAuth, async (req, res) => {
  try {
    const [banners, newReleases, presents, myPlaylists, featuredPlaylists,
           newAlbums, newSingles, stories, newArtists, recent, categories, artists, female] = await Promise.allSettled([
      fetch(`${BASE}/music/banner`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/collection?type=new`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/collection?type=artist`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/playlist?my=1`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/playlist?type=featured`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/collection?type=album`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/collection?type=single&sort=new`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/story`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/artist?type=new`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/content/recent`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/category`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/artist`, { headers: apiHeaders() }).then(r => r.json()),
      fetch(`${BASE}/music/collection?type=female`, { headers: apiHeaders() }).then(r => r.json()),
    ]);

    const val = r => r.status === 'fulfilled' ? r.value : null;
    const items = d => Array.isArray(d) ? d : (d?.data || d?.items || d?.content || d?.collections || d?.playlists || d?.artists || d?.banners || []);

    const sections = [
      { id: 'banners',           title: null,                    type: 'banner',     items: items(val(banners)) },
      { id: 'newReleases',       title: 'Featured New Releases', type: 'collection', items: items(val(newReleases)) },
      { id: 'presents',          title: '24Six Presents',        type: 'collection', items: items(val(presents)) },
      { id: 'myPlaylists',       title: 'My Playlists',          type: 'playlist',   items: items(val(myPlaylists)) },
      { id: 'featuredPlaylists', title: '24Six Playlists',       type: 'playlist',   items: items(val(featuredPlaylists)) },
      { id: 'newAlbums',         title: 'New Albums',            type: 'collection', items: items(val(newAlbums)) },
      { id: 'newSingles',        title: 'New Singles',           type: 'collection', items: items(val(newSingles)) },
      { id: 'stories',           title: 'New Stories',           type: 'story',      items: items(val(stories)) },
      { id: 'newArtists',        title: 'Discover New Artists',  type: 'artist',     items: items(val(newArtists)) },
      { id: 'recent',            title: 'Recently Listened',     type: 'content',    items: items(val(recent)) },
      { id: 'categories',        title: 'Categories',            type: 'category',   items: items(val(categories)) },
      { id: 'artists',           title: 'Browse Artists',        type: 'artist',     items: items(val(artists)) },
      { id: 'female',            title: "Women's Music",         type: 'collection', items: items(val(female)) },
    ].filter(s => s.items.length > 0);

    // Per-category rows
    const cats = items(val(categories)).slice(0, 8);
    const catRows = await Promise.allSettled(
      cats.map(c => fetch(`${BASE}/music/category/${c.id}`, { headers: apiHeaders() })
        .then(r => r.json())
        .then(d => ({ id: `cat_${c.id}`, title: c.name || c.title, type: 'collection', items: items(d) }))
      )
    );
    catRows.forEach(r => { if (r.status === 'fulfilled' && r.value.items.length) sections.push(r.value); });

    res.json({ sections });
  } catch (err) {
    console.error('home error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Search ──────────────────────────────────────────────────────────────────
app.get('/api/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ results: [] });
  try {
    const resp = await fetch(`${BASE}/music/search?q=${encodeURIComponent(q)}`, { headers: apiHeaders() });
    const data = await resp.json();
    res.json({ results: data.results || data.data || data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Album ───────────────────────────────────────────────────────────────────
app.get('/api/albums/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/collection/${req.params.id}`, { headers: apiHeaders() });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/albums/:id/songs', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/content?collection_id=${req.params.id}`, { headers: apiHeaders() });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Artist ──────────────────────────────────────────────────────────────────
app.get('/api/artists/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/artist/${req.params.id}`, { headers: apiHeaders() });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Playlist ─────────────────────────────────────────────────────────────────
app.get('/api/playlists/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/playlist/${req.params.id}`, { headers: apiHeaders() });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/playlists/:id/songs', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/content?playlist_id=${req.params.id}`, { headers: apiHeaders() });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Library / Favorites ─────────────────────────────────────────────────────
app.get('/api/library/favorites', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/content?my=1`, { headers: apiHeaders() });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/library/favorites/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/content/${req.params.id}/favorite`, {
      method: 'POST', headers: apiHeaders(),
    });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/library/favorites/:id', requireAuth, async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/music/content/${req.params.id}/favorite`, {
      method: 'DELETE', headers: apiHeaders(),
    });
    res.json(await resp.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Audio stream (Range-aware) ───────────────────────────────────────────────
app.get('/api/audio/:id', requireAuth, async (req, res) => {
  try {
    const streamResp = await fetch(`${BASE}/content/${req.params.id}/play?format=aac`, {
      headers: apiHeaders(), redirect: 'manual',
    });
    const url = streamResp.headers.get('location');
    if (!url) return res.status(502).json({ error: 'No stream URL' });

    const range = req.headers.range;
    const cdnResp = await fetch(url, { headers: range ? { Range: range } : {} });
    res.status(range ? 206 : 200);
    cdnResp.headers.forEach((v, k) => {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(k)) {
        res.setHeader(k, v);
      }
    });
    cdnResp.body.pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── HA Speakers ─────────────────────────────────────────────────────────────
app.get('/api/ha/speakers', requireAuth, async (req, res) => {
  try {
    const resp = await fetch('http://supervisor/core/api/states', {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    const states = await resp.json();
    const speakers = states
      .filter(s => s.entity_id.startsWith('media_player.') &&
        ['idle', 'paused', 'playing', 'standby', 'off'].includes(s.state))
      .map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
      }));
    res.json({ speakers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ha/play', requireAuth, async (req, res) => {
  const { entity_id, content_id } = req.body;
  try {
    const streamResp = await fetch(`${BASE}/content/${content_id}/play?format=aac`, {
      headers: apiHeaders(), redirect: 'manual',
    });
    const url = streamResp.headers.get('location');
    if (!url) return res.status(502).json({ error: 'No stream URL' });

    await fetch('http://supervisor/core/api/services/media_player/play_media', {
      method: 'POST',
      headers: { Authorization: `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id, media_content_id: url, media_content_type: 'music' }),
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SPA fallback — MUST BE LAST ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

server.listen(PORT, '0.0.0.0', () => console.log(`24Six running on port ${PORT}`));
