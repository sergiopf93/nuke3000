// ============================================================
//  NUKE 3000 — Online Multiplayer via Firebase
//  js/online.js  ·  v1.0
//
//  Architecture:
//    Firestore: rooms/{roomId}
//      - meta: { host, players, factions, status, createdAt }
//      - state: serialized G object (written on each action)
//      - actions: subcollection { type, payload, playerId, ts }
//
//  Usage:
//    ONLINE.createRoom()  — host creates a room, gets a code
//    ONLINE.joinRoom(code) — guest joins by 6-char code
//    ONLINE.pushAction(type, payload) — send an action
//    ONLINE.isOnline()   — true if in an online room
//    ONLINE.isMyTurn()   — true if it's this player's turn
// ============================================================

const ONLINE = (() => {

  // ── Firebase SDK (loaded via CDN in index.html) ────────────
  // Requires these scripts BEFORE online.js:
  //   <script type="module" src="js/online.js"></script>
  // We use the compat SDK so no bundler is needed.

  let _db = null;           // Firestore instance
  let _auth = null;         // Firebase Auth (anonymous)
  let _roomId = null;       // current room document ID
  let _roomCode = null;     // 6-char human-readable code
  let _userId = null;       // this player's uid (anonymous auth)
  let _unsubState = null;   // onSnapshot unsubscribe for state
  let _unsubActions = null; // onSnapshot unsubscribe for actions
  let _lastActionTs = null; // track processed actions
  let _isHost = false;      // did this player create the room?
  let _ready = false;       // firebase initialized?

  // ── Init ────────────────────────────────────────────────────
  function init(firebaseConfig) {
    if (_ready) return;
    firebase.initializeApp(firebaseConfig);
    _db   = firebase.firestore();
    _auth = firebase.auth();

    // Reconnect from localStorage on page load
    const savedRoom   = localStorage.getItem('nuke_roomId');
    const savedCode   = localStorage.getItem('nuke_roomCode');
    const savedUserId = localStorage.getItem('nuke_userId');

    firebase.auth().signInAnonymously().then(cred => {
      _userId = cred.user.uid;
      localStorage.setItem('nuke_userId', _userId);
      _ready = true;
      console.log('[ONLINE] Auth OK, uid:', _userId);

      // Auto-rejoin if we were in a room
      if (savedRoom && savedCode && savedUserId === _userId) {
        console.log('[ONLINE] Auto-rejoining room:', savedCode);
        _roomId   = savedRoom;
        _roomCode = savedCode;
        _subscribeToRoom();
        _showOnlineBanner('RECONECTANDO · ' + savedCode + '...');
      }
    }).catch(err => {
      console.error('[ONLINE] Auth error:', err);
      showOnlineError('Error de autenticación Firebase: ' + err.message);
    });
  }

  // ── Create Room (host) ─────────────────────────────────────
  async function createRoom() {
    if (!_ready) { showOnlineError('Firebase no inicializado'); return; }

    const code = _generateCode();
    const roomRef = _db.collection('rooms').doc();
    _roomId   = roomRef.id;
    _roomCode = code;
    _isHost   = true;

    const meta = {
      code,
      host: _userId,
      status: 'waiting',    // waiting | setup | playing | finished
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      players: {
        [_userId]: {
          name: G.pname || 'COMANDANTE',
          faction: G.pf  || null,
          ready: false,
        }
      },
      playerOrder: [_userId],
    };

    try {
      await roomRef.set({ meta, state: null });
      _saveLocal();
      _subscribeToRoom();
      _showOnlineBanner('SALA CREADA · CÓDIGO: ' + code);
      console.log('[ONLINE] Room created:', _roomId, code);

      // Show code to user prominently
      _showRoomCodeModal(code);
    } catch(e) {
      showOnlineError('Error creando sala: ' + e.message);
    }
  }

  // ── Join Room (guest) ──────────────────────────────────────
  async function joinRoom(code) {
    if (!_ready) { showOnlineError('Firebase no inicializado'); return; }
    if (!code || code.length !== 6) { showOnlineError('Código inválido (6 caracteres)'); return; }

    code = code.toUpperCase();
    try {
      const snap = await _db.collection('rooms')
        .where('meta.code', '==', code)
        .where('meta.status', 'in', ['waiting', 'setup'])
        .limit(1)
        .get();

      if (snap.empty) { showOnlineError('Sala no encontrada o ya iniciada'); return; }

      const roomDoc = snap.docs[0];
      _roomId   = roomDoc.id;
      _roomCode = code;
      _isHost   = false;

      // Add ourselves to the room
      await _db.collection('rooms').doc(_roomId).update({
        [`meta.players.${_userId}`]: {
          name: G.pname || 'COMANDANTE',
          faction: G.pf || null,
          ready: false,
        },
        'meta.playerOrder': firebase.firestore.FieldValue.arrayUnion(_userId),
      });

      _saveLocal();
      _subscribeToRoom();
      _showOnlineBanner('CONECTADO · SALA ' + code);
      console.log('[ONLINE] Joined room:', _roomId);
    } catch(e) {
      showOnlineError('Error uniéndose a sala: ' + e.message);
    }
  }

  // ── Push Action ────────────────────────────────────────────
  // type: string  e.g. 'PLACE_SOLDIER', 'ATTACK', 'END_PHASE'
  // payload: any serializable object
  async function pushAction(type, payload = {}) {
    if (!_roomId) return; // offline, nothing to do

    const action = {
      type,
      payload,
      playerId: _userId,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      // 1. Write action to subcollection
      await _db.collection('rooms').doc(_roomId)
               .collection('actions').add(action);

      // 2. Also sync full G state so latecomers / reconnects get it
      await _syncState();
    } catch(e) {
      console.error('[ONLINE] pushAction error:', e);
    }
  }

  // ── Sync full G state to Firestore ────────────────────────
  async function _syncState() {
    if (!_roomId) return;
    try {
      await _db.collection('rooms').doc(_roomId).update({
        state: _serializeG(),
        'meta.lastUpdate': firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch(e) {
      console.error('[ONLINE] _syncState error:', e);
    }
  }

  // ── Subscribe to room changes ──────────────────────────────
  function _subscribeToRoom() {
    // Unsubscribe previous listeners
    if (_unsubState)   { _unsubState();   _unsubState   = null; }
    if (_unsubActions) { _unsubActions(); _unsubActions = null; }

    // 1. Listen to main doc (state + meta)
    _unsubState = _db.collection('rooms').doc(_roomId)
      .onSnapshot(snap => {
        if (!snap.exists) { _handleRoomDeleted(); return; }
        const data = snap.data();
        _handleMetaUpdate(data.meta);
        if (data.state && !G_step.isMyTurn) {
          _applyRemoteState(data.state);
        }
      }, err => console.error('[ONLINE] state listener error:', err));

    // 2. Listen to new actions (ordered by server timestamp)
    _unsubActions = _db.collection('rooms').doc(_roomId)
      .collection('actions')
      .orderBy('ts', 'asc')
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const action = change.doc.data();
            // Only process actions from OTHER players
            if (action.playerId !== _userId) {
              _handleRemoteAction(action);
            }
          }
        });
      }, err => console.error('[ONLINE] actions listener error:', err));
  }

  // ── Handle remote action ───────────────────────────────────
  function _handleRemoteAction(action) {
    console.log('[ONLINE] Remote action:', action.type, action.payload);
    const { type, payload } = action;

    // These are the action types the game can emit.
    // We apply them to local G and refresh UI.
    switch(type) {

      case 'END_PHASE':
        // Remote player ended their phase → advance our local engine
        if (typeof endPhaseForFaction === 'function') endPhaseForFaction();
        break;

      case 'PLACE_REINF':
        // { terId, count }
        if (G.territories[payload.terId]) {
          G.territories[payload.terId].soldiers += payload.count;
          G.factions[payload.fk].pendingSoldiers -= payload.count;
        }
        if (typeof updateMap === 'function') updateMap();
        if (typeof refreshCards === 'function') refreshCards();
        break;

      case 'UPGRADE':
        // { fk, terId, from, to, count }
        _applyUpgrade(payload);
        if (typeof updateMap === 'function') updateMap();
        break;

      case 'MOVE':
        // { fk, srcId, dstId, units }
        _applyMove(payload);
        if (typeof updateMap === 'function') updateMap();
        break;

      case 'ATTACK':
        // Full G state comes with this — apply it
        if (payload.G) _applyRemoteState(payload.G);
        if (typeof updateMap === 'function') updateMap();
        if (typeof refreshCards === 'function') refreshCards();
        if (typeof addLog === 'function') addLog(payload.logMsg || '⚔ Combate remoto', 'combat');
        break;

      case 'FIRE_MISSILE':
        // { srcFk, tgtId, hit, intercepted }
        if (typeof addLog === 'function') {
          const msg = payload.intercepted ? `🛡 Misil interceptado en ${payload.tgtId}` :
                      payload.hit ? `💥 Misil impacta ${payload.tgtId}` :
                      `🚀 Misil falla en ${payload.tgtId}`;
          addLog(msg, 'combat');
        }
        if (payload.G) _applyRemoteState(payload.G);
        break;

      case 'BUILD_NUCLEAR':
        // { fk, terId }
        if (G.territories[payload.terId]) G.territories[payload.terId].hasNuclear = true;
        if (G.factions[payload.fk]) G.factions[payload.fk].plutonium -= 5;
        if (typeof updateMap === 'function') updateMap();
        break;

      case 'SETUP_CLAIM':
        // { fk, terId }
        if (typeof doClaimTerritory === 'function') doClaimTerritory(payload.fk, payload.terId);
        break;

      case 'SETUP_PLACE_SOLDIER':
        // { fk, terId, count }
        if (G.territories[payload.terId]) G.territories[payload.terId].soldiers += payload.count;
        if (G.setup.soldiersLeft) G.setup.soldiersLeft[payload.fk] -= payload.count;
        if (typeof updateMap === 'function') updateMap();
        break;

      case 'FULL_STATE_SYNC':
        // Host pushes full G — apply unconditionally
        _applyRemoteState(payload.G);
        break;

      case 'PLAYER_READY':
        // { fk }
        if (typeof addLog === 'function') addLog(`${payload.name} listo.`, 'sys');
        break;

      case 'GAME_START':
        // Host signals game start — apply initial G
        if (payload.G) _applyRemoteState(payload.G);
        if (typeof startSetupPhase === 'function') startSetupPhase();
        break;

      default:
        console.warn('[ONLINE] Unknown action type:', type);
    }
  }

  // ── Apply remote G state ───────────────────────────────────
  function _applyRemoteState(remoteG) {
    if (!remoteG) return;
    // Deep merge — only update what came in, keep local view state
    const viewState = { vx: G.vx, vy: G.vy, vscale: G.vscale };
    Object.assign(G, remoteG);
    Object.assign(G, viewState); // preserve pan/zoom
    if (typeof updateMap === 'function') updateMap();
    if (typeof refreshCards === 'function') refreshCards();
    if (typeof updatePhaseBanner === 'function') updatePhaseBanner(G_step.currentFk);
  }

  // ── Handle meta update (players joining, status changes) ───
  function _handleMetaUpdate(meta) {
    if (!meta) return;
    const playerCount = Object.keys(meta.players || {}).length;
    _updateRoomBar(meta.code, playerCount, meta.status);

    if (meta.status === 'finished') {
      _cleanup();
    }
  }

  function _handleRoomDeleted() {
    showOnlineError('La sala fue eliminada.');
    _cleanup();
  }

  // ── Helpers ────────────────────────────────────────────────
  function _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  }

  function _serializeG() {
    // Serialize only the parts of G that matter for network sync.
    // Strip circular refs and view state.
    return JSON.parse(JSON.stringify({
      round: G.round,
      phase: G.phase,
      currentFaction: G.currentFaction,
      territories: G.territories,
      factions: G.factions,
      setup: G.setup,
      eliminatedArmies: G.eliminatedArmies,
    }));
  }

  function _applyUpgrade(payload) {
    const { fk, terId, from, to, count } = payload;
    const t = G.territories[terId];
    const f = G.factions[fk];
    if (!t || !f) return;
    t[from]  = (t[from]  || 0) - count * (to === 'scorpions' ? 2 : 3);
    t[to]    = (t[to]    || 0) + count;
    // Pu cost already deducted on remote — apply from state sync
  }

  function _applyMove(payload) {
    const { srcId, dstId, units } = payload;
    const src = G.territories[srcId];
    const dst = G.territories[dstId];
    if (!src || !dst) return;
    Object.entries(units).forEach(([unit, count]) => {
      src[unit] = Math.max(0, (src[unit]||0) - count);
      dst[unit] = (dst[unit]||0) + count;
    });
  }

  function _saveLocal() {
    localStorage.setItem('nuke_roomId',   _roomId);
    localStorage.setItem('nuke_roomCode', _roomCode);
  }

  function _cleanup() {
    if (_unsubState)   { _unsubState();   _unsubState   = null; }
    if (_unsubActions) { _unsubActions(); _unsubActions = null; }
    localStorage.removeItem('nuke_roomId');
    localStorage.removeItem('nuke_roomCode');
    _roomId   = null;
    _roomCode = null;
    _isHost   = false;
  }

  // ── UI helpers ─────────────────────────────────────────────
  function _showOnlineBanner(msg) {
    const el = document.getElementById('rcode');
    if (el) el.textContent = msg;
  }

  function _updateRoomBar(code, players, status) {
    const el = document.getElementById('rcode');
    const statusLabel = { waiting:'ESPERANDO', setup:'SETUP', playing:'EN JUEGO', finished:'TERMINADA' };
    if (el) el.textContent = `${code} · ${players}J · ${statusLabel[status]||status}`;
  }

  function _showRoomCodeModal(code) {
    // Create a temporary overlay showing the room code
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);
      display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;font-family:Orbitron,sans-serif;max-width:400px;padding:40px;">
        <div style="font-size:11px;letter-spacing:4px;color:#888;margin-bottom:12px;">SALA CREADA</div>
        <div style="font-size:52px;letter-spacing:12px;color:#C8A800;text-shadow:0 0 30px #C8A800aa;margin-bottom:16px;">${code}</div>
        <div style="font-size:11px;color:#666;margin-bottom:24px;line-height:1.8;">
          Comparte este código con los otros jugadores.<br>
          Ellos entran con UNIRSE A SALA → introducen el código.
        </div>
        <button onclick="this.parentElement.parentElement.remove()"
          style="background:#0a0a0d;border:1px solid #C8A800;color:#C8A800;
            padding:10px 32px;font-family:Orbitron,sans-serif;font-size:11px;
            letter-spacing:3px;cursor:pointer;">
          CONTINUAR
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function showOnlineError(msg) {
    console.error('[ONLINE]', msg);
    // Reuse existing addLog if available, else alert
    if (typeof addLog === 'function') {
      addLog('⚠ ONLINE: ' + msg, 'sys');
    } else {
      alert('ONLINE ERROR: ' + msg);
    }
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init,
    createRoom,
    joinRoom,
    pushAction,
    syncState: _syncState,

    isOnline:  () => !!_roomId,
    isHost:    () => _isHost,
    isMyTurn:  () => {
      if (!_roomId) return true; // offline = always your turn
      return G_step && G_step.currentFk === G.pf;
    },
    getRoomCode: () => _roomCode,
    getUserId:   () => _userId,

    // Call this when host wants to start the game
    signalGameStart: async () => {
      if (!_isHost || !_roomId) return;
      await _db.collection('rooms').doc(_roomId).update({ 'meta.status': 'setup' });
      await _db.collection('rooms').doc(_roomId).collection('actions').add({
        type: 'GAME_START',
        payload: { G: _serializeG() },
        playerId: _userId,
        ts: firebase.firestore.FieldValue.serverTimestamp(),
      });
    },

    // Call when game ends
    signalGameEnd: async () => {
      if (!_roomId) return;
      await _db.collection('rooms').doc(_roomId).update({ 'meta.status': 'finished' });
    },
  };

})();
