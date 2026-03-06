# 24Six for Home Assistant — Installation Guide

## Overview

This installs 24Six as a Home Assistant add-on with:
- A sidebar panel (full app)
- A Lovelace card (player widget for dashboards)

---

## Step 1: Copy the Add-on to HAOS

You need to place the add-on folder in Home Assistant's add-on directory. The easiest way is via SSH or Samba share.

### Via SSH Add-on:
1. Install the **SSH & Web Terminal** add-on from the HA add-on store
2. Connect and run:
```bash
cd /addons
mkdir -p twentyfour_six
```
3. Copy the `twentyfour-six-addon/` folder contents into `/addons/twentyfour_six/`

### Via Samba Add-on:
1. Install the **Samba share** add-on
2. Map the `addons` share on your computer
3. Create folder `addons/twentyfour_six/`
4. Copy all files from `twentyfour-six-addon/` into it

The final structure should look like:
```
/addons/twentyfour_six/
├── config.yaml
├── Dockerfile
├── run.sh
├── backend/
│   ├── package.json
│   └── server.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        └── ... (all React source files)
```

---

## Step 2: Build the Frontend

The React frontend must be built before the Docker image is built. Do this from your computer (requires Node.js 18+):

```bash
cd twentyfour-six-addon/frontend
npm install
npm run build
```

This creates `frontend/dist/` — make sure this folder is included when you copy to HAOS.

Alternatively, build on HAOS via SSH:
```bash
# Install Node on the HA host (Alpine-based)
apk add --no-cache nodejs npm
cd /addons/twentyfour_six/frontend
npm install
npm run build
```

---

## Step 3: Install the Add-on in Home Assistant

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click the three-dot menu (top right) → **Reload**
3. You should now see **"Local add-ons"** section with **24Six** listed
4. Click **Install** and wait for the Docker build to complete (~2-5 minutes)
5. Click **Start**
6. Enable **"Show in sidebar"** toggle on the add-on page

---

## Step 4: Install the Lovelace Player Card

1. Copy `24six-player-card.js` to your HA config folder:
   ```
   /config/www/twentyfour-six/24six-player-card.js
   ```

2. In Home Assistant go to **Settings → Dashboards → Resources** (or **⋮ → Manage resources** in dashboard edit mode)

3. Add resource:
   - URL: `/local/twentyfour-six/24six-player-card.js`
   - Type: `JavaScript module`

4. Add the card to any dashboard by editing a dashboard and adding a **Manual card**:
   ```yaml
   type: custom:twentyfour-six-card
   ```

---

## Step 5: First Login

1. Click **24Six** in the HA sidebar
2. Sign in with your 24Six account (email + password)
3. The app will load your profile and homepage automatically

---

## Usage

### Sidebar App
Full 24Six experience: browse, search, library, artist/album pages, queue management.

### Player Card
Displays on any dashboard:
- Shows current song + artwork
- Play/pause, previous, next
- Progress scrubbing
- Volume control
- Shuffle and repeat toggles
- Speaker selector (all your HA media_player entities)
- "Open 24Six App" link

### Speaker Selection
- **"This Device"** — plays audio in your browser
- **Any HA media_player** — streams directly to that speaker via HA
- Speaker grouping is available in the speaker panel (sidebar app)

---

## Updating

To update the app code:
1. Edit files in `/addons/twentyfour_six/`
2. Rebuild frontend if you changed React code: `npm run build` in `/addons/twentyfour_six/frontend/`
3. Restart the add-on in HA Settings → Add-ons → 24Six → Restart

---

## Troubleshooting

**Add-on not appearing in store:**
- Go to Settings → Add-ons → three-dot menu → Reload

**WebSocket errors in player card:**
- Ensure the add-on is running
- Check the add-on log (Settings → Add-ons → 24Six → Log tab)

**Login fails:**
- Verify your 24Six credentials work in the native app
- Check the add-on log for error details

**No speakers listed:**
- The add-on uses the Supervisor token to call the HA API
- Ensure `homeassistant_api: true` is in config.yaml (it is by default)
- Verify your media_player entities are set up in HA

**Audio plays in browser but not on speaker:**
- Make sure your WiiM / speaker entity is online in HA
- Check the HA media_player entity state

---

## Architecture Notes

```
HAOS
└── Add-on: twentyfour_six (port 8484, ingress)
    ├── Node.js backend
    │   ├── Serves React frontend (static)
    │   ├── Proxies 24Six API v3 (auth, music, streams)
    │   ├── WebSocket /ws/player (real-time state sync)
    │   └── HA API bridge (speakers, playback control)
    └── React frontend
        ├── Full 24Six app UI
        └── Zustand state (player, auth, speakers)

HA Dashboard
└── custom:twentyfour-six-card
    ├── Connects to add-on WebSocket
    ├── Shows player state
    └── Sends playback commands
```
