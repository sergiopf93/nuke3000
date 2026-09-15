// ============================================================
//  NUKE 3000 — Online Multiplayer via Firebase
//  js/online.js  ·  v2.0
// ============================================================

const ONLINE = (() => {

  let _db = null;
  let _auth = null;
  let _roomId = null;
  let _roomCode = null;
  let _userId = null;
  let _unsubRoom = null;
  let _unsubActions = null;
  let _isHost = false;
  let _ready = false;
  let _roomUpdateCb = null;
  let _lastActionSeq = -1; // track processed actions

  // ── Init ──────────────────────────────────────────────────
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
      console.log('[ONLINE] Auth OK uid:', _userId);
      if (savedRoom && savedCode && savedUserId === _userId) {
        _roomId   = savedRoom;
        _roomCode = savedCode;
        _subscribeToRoom();
      }
    }).catch(err => {
      console.error('[ONLINE] Auth error:', err);
      if (typeof addLog === 'function') addLog('⚠ Firebase: ' + err.message, 'sys');
    });
  }

  // ── Create Room ───────────────────────────────────────────
  async function createRoom() {
    if (!_ready) throw new Error('Firebase no inicializado');
    const code = _generateCode();
    const roomRef = _db.collection('rooms').doc();
    _roomId   = roomRef.id;
    _roomCode = code;
    _isHost   = true;

    await roomRef.set({
      meta: {
        code,
        host: _userId,
        status: 'waiting',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        players: {
          [_userId]: { name: G.pname || 'COMANDANTE', faction: G.pf || null }
        },
        playerOrder: [_userId],
      },
      state: null,
      actionSeq: 0,
    });
    _saveLocal();
    _subscribeToRoom();
    console.log('[ONLINE] Room created:', _roomId, code);
  }

  // ── Join Room ─────────────────────────────────────────────
  async function joinRoom(code) {
    if (!_ready) throw new Error('Firebase no inicializado');
    code = code.toUpperCase();
    const snap = await _db.collection('rooms')
      .where('meta.code', '==', code)
      .where('meta.status', 'in', ['waiting', 'setup'])
      .limit(1).get();
    if (snap.empty) throw new Error('Sala no encontrada o ya iniciada');
    _roomId   = snap.docs[0].id;
    _roomCode = code;
    _isHost   = false;
    await _db.collection('rooms').doc(_roomId).update({
      [`meta.players.${_userId}`]: { name: G.pname || 'COMANDANTE', faction: null },
      'meta.playerOrder': firebase.firestore.FieldValue.arrayUnion(_userId),
    });
    _saveLocal();
    _subscribeToRoom();
  }

  // ── Leave Room ────────────────────────────────────────────
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

  // ── Update my faction ─────────────────────────────────────
  async function updateMyFaction(faction) {
    if (!_roomId) return;
    G.pf = faction;
    await _db.collection('rooms').doc(_roomId).update({
      [`meta.players.${_userId}.faction`]: faction,
    });
  }

  // ── Get players ───────────────────────────────────────────
  async function getPlayersInRoom() {
    if (!_roomId) return {};
    const snap = await _db.collection('rooms').doc(_roomId).get();
    return snap.exists ? (snap.data().meta.players || {}) : {};
  }

  // ── Room update callback ──────────────────────────────────
  function onRoomUpdate(cb) { _roomUpdateCb = cb; }

  // ── Signal game start ─────────────────────────────────────
  async function signalGameStart(players) {
    if (!_isHost || !_roomId) return;
    await _db.collection('rooms').doc(_roomId).update({
      'meta.status': 'playing',
      'meta.players': players || {},
    });
    // Push GAME_START action
    await _pushActionRaw('GAME_START', { playerCount: Object.keys(players || {}).length });
  }

  // ── Signal game end ───────────────────────────────────────
  async function signalGameEnd() {
    if (!_roomId) return;
    await _db.collection('rooms').doc(_roomId).update({ 'meta.status': 'finished' });
  }

  // ── Push action (public) ──────────────────────────────────
  async function pushAction(type, payload = {}) {
    if (!_roomId) return;
    await _pushActionRaw(type, payload);
  }

  // ── Push action + sync state ──────────────────────────────
  async function pushActionWithState(type, payload = {}) {
    if (!_roomId) return;
    payload._G = _serializeG();
    await _pushActionRaw(type, payload);
  }

  async function _pushActionRaw(type, payload = {}) {
    try {
      const seq = Date.now(); // use timestamp as seq
      await _db.collection('rooms').doc(_roomId)
        .collection('actions').add({
          type,
          payload,
          playerId: _userId,
          seq,
          ts: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch(e) {
      console.error('[ONLINE] pushAction error:', e);
    }
  }

  // ── Subscribe to room ─────────────────────────────────────
  function _subscribeToRoom() {
    if (_unsubRoom)    { _unsubRoom();    _unsubRoom    = null; }
    if (_unsubActions) { _unsubActions(); _unsubActions = null; }

    // Listen to room doc (meta + state)
    _unsubRoom = _db.collection('rooms').doc(_roomId)
      .onSnapshot(snap => {
        if (!snap.exists) { _handleRoomDeleted(); return; }
        const data = snap.data();
        if (_roomUpdateCb && data.meta) _roomUpdateCb(data.meta);
      }, err => console.error('[ONLINE] room listener:', err));

    // Listen to actions ordered by seq
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
      }, err => console.error('[ONLINE] actions listener:', err));
  }

  // ── Handle remote action ──────────────────────────────────
  function _handleRemoteAction(action) {
    const { type, payload } = action;
    console.log('[ONLINE] Remote:', type);

    // If action carries full G state, apply it first
    if (payload && payload._G) {
      _applyRemoteG(payload._G);
    }

    switch(type) {

      // ── Waiting room ──
      case 'GAME_START':
        if (typeof _launchOnlineGame === 'function') {
          _launchOnlineGame({ players: payload.players || {} });
        }
        break;

      // ── Setup phase ──
      case 'SETUP_ROLL':
        // Another player rolled their die
        if (typeof _onRemoteRoll === 'function') {
          _onRemoteRoll(payload.fk, payload.roll);
        }
        break;

      case 'SETUP_CLAIM':
        if (typeof doClaimTerritory === 'function') {
          doClaimTerritory(payload.fk, payload.terId);
        }
        break;

      case 'SETUP_SOLDIER':
        if (typeof doPlaceSoldier === 'function') {
          doPlaceSoldier(payload.fk, payload.terId, payload.qty);
        }
        break;

      case 'SETUP_NUCLEAR':
        if (typeof doPlaceNuclear === 'function') {
          doPlaceNuclear(payload.fk, payload.terId);
        }
        break;

      case 'SETUP_AUTOCLAIM':
        if (typeof autoClaimAll === 'function') autoClaimAll();
        break;

      case 'SETUP_AUTODISTRIBUTE':
        if (typeof autoDistributeAll === 'function') autoDistributeAll();
        break;

      case 'SETUP_AUTONUKES':
        if (typeof autoPlaceNukes === 'function') autoPlaceNukes();
        break;

      // ── Game phase ──
      case 'END_PHASE':
        // Remote player ended their phase — we just received their G state
        // via payload._G already applied. Now advance our local engine.
        if (typeof endPhaseForFaction === 'function') endPhaseForFaction();
        break;

      case 'PLACE_REINF':
        if (G.territories[payload.terId]) {
          G.territories[payload.terId].soldiers += payload.qty;
          if (G.factions[payload.fk]) G.factions[payload.fk].pendingSoldiers -= payload.qty;
        }
        if (typeof updateMap === 'function') updateMap();
        if (typeof refreshCards === 'function') refreshCards();
        break;

      case 'NEXT_STEP':
        // Remote player clicked "Siguiente"
        if (typeof nextStep === 'function') nextStep();
        break;

      case 'FULL_SYNC':
        // Full state sync — already applied via payload._G above
        if (typeof updateMap === 'function') updateMap();
        if (typeof refreshCards === 'function') refreshCards();
        if (typeof addLog === 'function' && payload.logMsg) addLog(payload.logMsg, payload.logType || 'sys');
        break;

      default:
        console.warn('[ONLINE] Unknown action type:', type);
    }
  }

  // ── Apply remote G ────────────────────────────────────────
  function _applyRemoteG(remoteG) {
    if (!remoteG) return;
    const view = { vx: G.vx, vy: G.vy, vscale: G.vscale, dragging: false };
    // Merge selectively — preserve view state
    Object.assign(G, remoteG);
    Object.assign(G, view);
    if (typeof updateMap === 'function') updateMap();
    if (typeof refreshCards === 'function') refreshCards();
    if (typeof updatePhaseBanner === 'function' && typeof G_step !== 'undefined') {
      updatePhaseBanner(G_step.currentFk);
    }
  }

  function _handleRoomDeleted() {
    if (typeof addLog === 'function') addLog('⚠ La sala fue eliminada.', 'sys');
    _cleanup();
  }

  // ── Serialize G ───────────────────────────────────────────
  function _serializeG() {
    try {
      return JSON.parse(JSON.stringify({
        round:            G.round,
        phase:            G.phase,
        currentFaction:   G.currentFaction,
        territories:      G.territories,
        factions:         G.factions,
        setup:            G.setup,
        eliminatedArmies: G.eliminatedArmies,
      }));
    } catch(e) {
      console.error('[ONLINE] serialize error:', e);
      return null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  }

  function _saveLocal() {
    localStorage.setItem('nuke_roomId',   _roomId);
    localStorage.setItem('nuke_roomCode', _roomCode);
    localStorage.setItem('nuke_userId',   _userId);
  }

  function _cleanup() {
    if (_unsubRoom)    { _unsubRoom();    _unsubRoom    = null; }
    if (_unsubActions) { _unsubActions(); _unsubActions = null; }
    localStorage.removeItem('nuke_roomId');
    localStorage.removeItem('nuke_roomCode');
    _roomId = null; _roomCode = null; _isHost = false; _roomUpdateCb = null;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    createRoom,
    joinRoom,
    leaveRoom,
    updateMyFaction,
    getPlayersInRoom,
    onRoomUpdate,
    signalGameStart,
    signalGameEnd,
    pushAction,
    pushActionWithState,

    isOnline:    () => !!_roomId,
    isHost:      () => _isHost,
    isMyTurn:    () => {
      if (!_roomId) return true;
      if (typeof G_step === 'undefined') return true;
      return G_step.currentFk === G.pf;
    },
    getRoomCode: () => _roomCode,
    getUserId:   () => _userId,
  };

})();
