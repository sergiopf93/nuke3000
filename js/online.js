// ============================================================
//  NUKE 3000 — Online Multiplayer via Firebase
//  js/online.js  ·  v2.1
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

      // Reconnect if same user was in a room
      if (savedRoom && savedCode && savedUserId === _userId) {
        _roomId   = savedRoom;
        _roomCode = savedCode;
        console.log('[ONLINE] Reconnecting to room:', savedCode);
        _reconnectToRoom();
      }
    }).catch(err => {
      console.error('[ONLINE] Auth error:', err);
      if (typeof addLog === 'function') addLog('⚠ Firebase: ' + err.message, 'sys');
    });
  }

  // ── Reconnect: restore full game state from Firestore ─────
  async function _reconnectToRoom() {
    try {
      const snap = await _db.collection('rooms').doc(_roomId).get();
      if (!snap.exists) {
        console.warn('[ONLINE] Room no longer exists');
        _cleanup();
        return;
      }
      const data = snap.data();
      const meta = data.meta || {};

      // Determine if we're host
      _isHost = meta.host === _userId;

      // Find our player entry to restore G.pf and G.pname
      const myEntry = meta.players && meta.players[_userId];
      if (!myEntry) {
        console.warn('[ONLINE] Player not found in room');
        _cleanup();
        return;
      }

      // Restore G from saved state
      if (data.state) {
        const view = { vx: G.vx, vy: G.vy, vscale: G.vscale };
        Object.assign(G, data.state);
        Object.assign(G, view);
      }

      // Restore player identity
      G.pf    = myEntry.faction;
      G.pname = myEntry.name || 'COMANDANTE';
      G.playerCount = Object.keys(meta.players || {}).length;

      // Restore _onlinePlayerFactions
      if (typeof _onlinePlayerFactions !== 'undefined') {
        _onlinePlayerFactions = new Set(
          Object.values(meta.players || {}).map(p => p.faction).filter(Boolean)
        );
      }

      // Subscribe to future actions
      _subscribeToRoom();

      // Restore UI based on game status
      if (meta.status === 'playing' || meta.status === 'setup') {
        _restoreGameUI(meta, data.state);
      } else {
        // Still in lobby/waiting — go back to lobby
        _cleanup();
      }
    } catch(e) {
      console.error('[ONLINE] Reconnect error:', e);
      _cleanup();
    }
  }

  // ── Restore game UI after reconnect ──────────────────────
  function _restoreGameUI(meta, state) {
    if (!state || !G.pf) {
      console.warn('[ONLINE] Cannot restore — missing state or faction');
      return;
    }

    // Hide lobby, show game
    const lobby = document.getElementById('lobby');
    const hdr   = document.getElementById('hdr');
    const main  = document.getElementById('main');
    if (lobby) lobby.style.display = 'none';
    if (hdr)   hdr.style.display   = 'flex';
    if (main)  main.style.display  = 'grid';

    // Update room bar
    const rcode = document.getElementById('rcode');
    if (rcode) rcode.textContent = _roomCode;

    // Reinitialize map and UI
    if (typeof buildMap === 'function') buildMap();
    if (typeof updateMap === 'function') updateMap();
    if (typeof refreshCards === 'function') refreshCards();
    if (typeof setupPanZoom === 'function') setupPanZoom();

    // Restore step engine state
    if (state.phase && state.setup && state.setup.order) {
      if (typeof G_step !== 'undefined') {
        G_step.phase     = state.phase;
        G_step.idx       = 0;
        G_step.currentFk = state.currentFaction || state.setup.order[0];
        G_step.isMyTurn  = G_step.currentFk === G.pf;
      }

      // If still in setup
      if (state.setup._inSetup) {
        if (typeof showSetupPanel === 'function') {
          // Resume setup from current step
          if (typeof runSetupStep === 'function') {
            runSetupStep(state.setup._stepIdx || 0);
          }
        }
      } else {
        // Game in progress — resume phase
        if (typeof startPhase === 'function') {
          startPhase(state.phase || 'prep', G_step.currentFk);
        }
        if (typeof updatePhaseBanner === 'function') {
          updatePhaseBanner(G_step.currentFk);
        }
      }
    }

    if (typeof addLog === 'function') addLog('🔄 Reconectado a la sala ' + _roomCode, 'sys');
    if (typeof updateFactionPanel === 'function') updateFactionPanel();
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
  async function signalGameStart(players, totalPlayerCount) {
    if (!_isHost || !_roomId) return;
    await _db.collection('rooms').doc(_roomId).update({
      'meta.status': 'playing',
      'meta.players': players || {},
      'meta.totalPlayerCount': totalPlayerCount || Object.keys(players || {}).length,
    });
    await _pushActionRaw('GAME_START', {
      players: players || {},
      totalPlayerCount: totalPlayerCount || Object.keys(players || {}).length,
    });
  }

  // ── Signal game end ───────────────────────────────────────
  async function signalGameEnd() {
    if (!_roomId) return;
    await _db.collection('rooms').doc(_roomId).update({ 'meta.status': 'finished' });
  }

  // ── Push action ───────────────────────────────────────────
  async function pushAction(type, payload = {}) {
    if (!_roomId) return;
    await _pushActionRaw(type, payload);
  }

  // ── Push action + full G state ────────────────────────────
  async function pushActionWithState(type, payload = {}) {
    if (!_roomId) return;
    const serialized = _serializeG();
    if (serialized) payload._G = serialized;
    // Also save state to room doc for reconnects
    try {
      await _db.collection('rooms').doc(_roomId).update({ state: serialized });
    } catch(e) { /* non-critical */ }
    await _pushActionRaw(type, payload);
  }

  async function _pushActionRaw(type, payload = {}) {
    try {
      await _db.collection('rooms').doc(_roomId)
        .collection('actions').add({
          type,
          payload,
          playerId: _userId,
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

    _unsubRoom = _db.collection('rooms').doc(_roomId)
      .onSnapshot(snap => {
        if (!snap.exists) { _handleRoomDeleted(); return; }
        const data = snap.data();
        if (_roomUpdateCb && data.meta) _roomUpdateCb(data.meta);
      }, err => console.error('[ONLINE] room listener:', err));

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

  // ── Handle remote action ──────────────────────────────────
  function _handleRemoteAction(action) {
    const { type, payload } = action;
    console.log('[ONLINE] Remote:', type);

    // Apply full G state first if present
    if (payload && payload._G) {
      _applyRemoteG(payload._G);
    }

    switch(type) {

      case 'GAME_START':
        if (typeof _launchOnlineGame === 'function') {
          _launchOnlineGame({
            players: payload.players || {},
            totalPlayerCount: payload.totalPlayerCount,
          });
        }
        break;

      // ── Setup phase ──
      case 'SETUP_ROLL':
        if (typeof _onRemoteRoll === 'function') _onRemoteRoll(payload.fk, payload.roll);
        break;

      case 'SETUP_NEXT_STEP':
        if (payload.order) G.setup.order = payload.order;
        if (typeof nextSetupStep === 'function') nextSetupStep();
        break;

      case 'SETUP_SYNC': {
        // G already applied — advance UI
        const sub = payload.subtype;
        if (typeof updateMap === 'function') updateMap();
        if (typeof refreshCards === 'function') refreshCards();

        if (sub === 'CLAIM') {
          // Small delay so map renders before next prompt
          setTimeout(() => {
            if (typeof setupStep_Claim_Next === 'function') setupStep_Claim_Next();
          }, 100);
        } else if (sub === 'AUTOCLAIM') {
          if (typeof nextSetupStep === 'function') nextSetupStep();
        } else if (sub === 'SOLDIER_PARTIAL') {
          setTimeout(() => {
            if (typeof setupStep_Soldiers_ForFaction === 'function') setupStep_Soldiers_ForFaction(payload.fk);
          }, 100);
        } else if (sub === 'SOLDIER_DONE') {
          setTimeout(() => {
            if (typeof setupStep_Soldiers_Next === 'function') setupStep_Soldiers_Next();
          }, 100);
        } else if (sub === 'NUCLEAR_PARTIAL') {
          setTimeout(() => {
            if (typeof setupStep_Nuclear_ForFaction === 'function') setupStep_Nuclear_ForFaction(payload.fk);
          }, 100);
        } else if (sub === 'NUCLEAR_DONE') {
          setTimeout(() => {
            if (typeof setupStep_Nuclear_Next === 'function') setupStep_Nuclear_Next();
          }, 100);
        }
        break;
      }

      // ── Game phase ──
      case 'END_PHASE':
        if (typeof endPhaseForFaction === 'function') endPhaseForFaction();
        break;

      case 'NEXT_STEP':
        if (typeof nextStep === 'function') nextStep();
        break;

      case 'FULL_SYNC':
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
        round:          G.round,
        phase:          G.phase,
        currentFaction: G.currentFaction,
        territories:    G.territories,
        factions:       G.factions,
        setup:          G.setup,
        playerCount:    G.playerCount,
        eliminatedArmies: G.eliminatedArmies,
      }));
    } catch(e) {
      console.error('[ONLINE] serialize error:', e);
      return null;
    }
  }

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
