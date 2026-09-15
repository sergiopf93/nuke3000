// ============================================================
//  NUKE 3000 — Online Multiplayer via Firebase
//  js/online.js  ·  v1.1
// ============================================================

const ONLINE = (() => {

  let _db = null;
  let _auth = null;
  let _roomId = null;
  let _roomCode = null;
  let _userId = null;
  let _unsubState = null;
  let _unsubActions = null;
  let _isHost = false;
  let _ready = false;
  let _roomUpdateCb = null; // callback for waiting room UI

  // ── Init ────────────────────────────────────────────────────
  function init(firebaseConfig) {
    if (_ready) return;
    firebase.initializeApp(firebaseConfig);
    _db   = firebase.firestore();
    _auth = firebase.auth();

    const savedRoom   = localStorage.getItem('nuke_roomId');
    const savedCode   = localStorage.getItem('nuke_roomCode');
    const savedUserId = localStorage.getItem('nuke_userId');

    firebase.auth().signInAnonymously().then(cred => {
      _userId = cred.user.uid;
      localStorage.setItem('nuke_userId', _userId);
      _ready = true;
      console.log('[ONLINE] Auth OK, uid:', _userId);

      if (savedRoom && savedCode && savedUserId === _userId) {
        console.log('[ONLINE] Auto-rejoining room:', savedCode);
        _roomId   = savedRoom;
        _roomCode = savedCode;
        _subscribeToRoom();
      }
    }).catch(err => {
      console.error('[ONLINE] Auth error:', err);
      if (typeof addLog === 'function') addLog('⚠ Firebase: ' + err.message, 'sys');
    });
  }

  // ── Create Room ─────────────────────────────────────────────
  async function createRoom() {
    if (!_ready) throw new Error('Firebase no inicializado');

    const code = _generateCode();
    const roomRef = _db.collection('rooms').doc();
    _roomId   = roomRef.id;
    _roomCode = code;
    _isHost   = true;

    const meta = {
      code,
      host: _userId,
      status: 'waiting',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      players: {
        [_userId]: {
          name: G.pname || 'COMANDANTE',
          faction: G.pf || null,
        }
      },
      playerOrder: [_userId],
    };

    await roomRef.set({ meta, state: null });
    _saveLocal();
    _subscribeToRoom();
    console.log('[ONLINE] Room created:', _roomId, code);
  }

  // ── Join Room ───────────────────────────────────────────────
  async function joinRoom(code) {
    if (!_ready) throw new Error('Firebase no inicializado');
    code = code.toUpperCase();

    const snap = await _db.collection('rooms')
      .where('meta.code', '==', code)
      .where('meta.status', 'in', ['waiting', 'setup'])
      .limit(1)
      .get();

    if (snap.empty) throw new Error('Sala no encontrada o ya iniciada');

    // Check faction not already taken
    const roomData = snap.docs[0].data();
    const takenFactions = Object.values(roomData.meta.players || {}).map(p => p.faction);
    if (G.pf && takenFactions.includes(G.pf)) {
      throw new Error('Facción ya ocupada en esta sala');
    }

    _roomId   = snap.docs[0].id;
    _roomCode = code;
    _isHost   = false;

    await _db.collection('rooms').doc(_roomId).update({
      [`meta.players.${_userId}`]: {
        name: G.pname || 'COMANDANTE',
        faction: G.pf || null,
      },
      'meta.playerOrder': firebase.firestore.FieldValue.arrayUnion(_userId),
    });

    _saveLocal();
    _subscribeToRoom();
    console.log('[ONLINE] Joined room:', _roomId);
  }

  // ── Leave Room ──────────────────────────────────────────────
  async function leaveRoom() {
    if (!_roomId) return;
    try {
      await _db.collection('rooms').doc(_roomId).update({
        [`meta.players.${_userId}`]: firebase.firestore.FieldValue.delete(),
        'meta.playerOrder': firebase.firestore.FieldValue.arrayRemove(_userId),
      });
    } catch(e) { console.warn('[ONLINE] leaveRoom:', e); }
    _cleanup();
  }

  // ── Get players snapshot ────────────────────────────────────
  async function getPlayersInRoom() {
    if (!_roomId) return {};
    const snap = await _db.collection('rooms').doc(_roomId).get();
    return snap.exists ? (snap.data().meta.players || {}) : {};
  }

  // ── Register waiting room callback ──────────────────────────
  function onRoomUpdate(cb) {
    _roomUpdateCb = cb;
  }

  // ── Signal game start (host) ────────────────────────────────
  async function signalGameStart(players) {
    if (!_isHost || !_roomId) return;
    await _db.collection('rooms').doc(_roomId).update({
      'meta.status': 'playing',
      'meta.players': players || {},
    });
    await _db.collection('rooms').doc(_roomId).collection('actions').add({
      type: 'GAME_START',
      payload: { playerCount: Object.keys(players || {}).length },
      playerId: _userId,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ── Signal game end ─────────────────────────────────────────
  async function signalGameEnd() {
    if (!_roomId) return;
    await _db.collection('rooms').doc(_roomId).update({ 'meta.status': 'finished' });
  }

  // ── Push action ─────────────────────────────────────────────
  async function pushAction(type, payload = {}) {
    if (!_roomId) return;
    try {
      await _db.collection('rooms').doc(_roomId)
               .collection('actions').add({
        type, payload,
        playerId: _userId,
        ts: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await _syncState();
    } catch(e) {
      console.error('[ONLINE] pushAction error:', e);
    }
  }

  // ── Sync full G state ───────────────────────────────────────
  async function _syncState() {
    if (!_roomId) return;
    try {
      await _db.collection('rooms').doc(_roomId).update({
        state: _serializeG(),
        'meta.lastUpdate': firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch(e) { console.error('[ONLINE] _syncState error:', e); }
  }

  // ── Subscribe to room ───────────────────────────────────────
  function _subscribeToRoom() {
    if (_unsubState)   { _unsubState();   _unsubState   = null; }
    if (_unsubActions) { _unsubActions(); _unsubActions = null; }

    _unsubState = _db.collection('rooms').doc(_roomId)
      .onSnapshot(snap => {
        if (!snap.exists) { _handleRoomDeleted(); return; }
        const data = snap.data();
        // Fire waiting room callback
        if (_roomUpdateCb && data.meta) _roomUpdateCb(data.meta);
        // Apply remote game state if not our turn
        if (data.state && typeof G_step !== 'undefined' && !G_step.isMyTurn) {
          _applyRemoteState(data.state);
        }
      }, err => console.error('[ONLINE] state listener:', err));

    _unsubActions = _db.collection('rooms').doc(_roomId)
      .collection('actions')
      .orderBy('ts', 'asc')
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const action = change.doc.data();
            if (action.playerId !== _userId) {
              _handleRemoteAction(action);
            }
          }
        });
      }, err => console.error('[ONLINE] actions listener:', err));
  }

  // ── Handle remote action ────────────────────────────────────
  function _handleRemoteAction(action) {
    console.log('[ONLINE] Remote action:', action.type);
    const { type, payload } = action;
    switch(type) {
      case 'GAME_START':
        // Guest launches game
        if (typeof _launchOnlineGame === 'function') {
          _launchOnlineGame({ players: payload.players || {} });
        }
        break;
      case 'END_PHASE':
        if (typeof endPhaseForFaction === 'function') endPhaseForFaction();
        break;
      case 'PLACE_REINF':
        if (G.territories[payload.terId]) {
          G.territories[payload.terId].soldiers += payload.count;
          if (G.factions[payload.fk]) G.factions[payload.fk].pendingSoldiers -= payload.count;
        }
        if (typeof updateMap === 'function') updateMap();
        if (typeof refreshCards === 'function') refreshCards();
        break;
      case 'ATTACK':
      case 'FIRE_MISSILE':
      case 'BUILD_NUCLEAR':
      case 'FULL_STATE_SYNC':
        if (payload.G) _applyRemoteState(payload.G);
        if (payload.logMsg && typeof addLog === 'function') addLog(payload.logMsg, 'combat');
        break;
      case 'MOVE':
        _applyMove(payload);
        if (typeof updateMap === 'function') updateMap();
        break;
      default:
        console.warn('[ONLINE] Unknown action type:', type);
    }
  }

  // ── Apply remote G ──────────────────────────────────────────
  function _applyRemoteState(remoteG) {
    if (!remoteG) return;
    const view = { vx: G.vx, vy: G.vy, vscale: G.vscale };
    Object.assign(G, remoteG);
    Object.assign(G, view);
    if (typeof updateMap === 'function') updateMap();
    if (typeof refreshCards === 'function') refreshCards();
    if (typeof updatePhaseBanner === 'function') updatePhaseBanner(G_step.currentFk);
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

  function _handleRoomDeleted() {
    if (typeof addLog === 'function') addLog('⚠ La sala fue eliminada.', 'sys');
    _cleanup();
  }

  // ── Helpers ─────────────────────────────────────────────────
  function _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  }

  function _serializeG() {
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

  function _saveLocal() {
    localStorage.setItem('nuke_roomId',   _roomId);
    localStorage.setItem('nuke_roomCode', _roomCode);
  }

  function _cleanup() {
    if (_unsubState)   { _unsubState();   _unsubState   = null; }
    if (_unsubActions) { _unsubActions(); _unsubActions = null; }
    localStorage.removeItem('nuke_roomId');
    localStorage.removeItem('nuke_roomCode');
    _roomId = null; _roomCode = null; _isHost = false;
    _roomUpdateCb = null;
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    init, createRoom, joinRoom, leaveRoom,
    pushAction, signalGameStart, signalGameEnd,
    onRoomUpdate, getPlayersInRoom,
    syncState: _syncState,
    isOnline:    () => !!_roomId,
    isHost:      () => _isHost,
    isMyTurn:    () => !_roomId || (typeof G_step !== 'undefined' && G_step.currentFk === G.pf),
    getRoomCode: () => _roomCode,
    getUserId:   () => _userId,
  };

})();
