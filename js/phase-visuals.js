// Receives authoritative values only. This registry never owns game state or decisions.
const PhaseVisuals = (() => {
  const presentations = new Map();
  let remoteQueue = Promise.resolve();

  function settle(presentation) {
    return Promise.resolve(presentation).catch(error => {
      console.warn('[NUKE presentation]', error);
      return {status:'cancelled'};
    });
  }

  function dispatch(packet) {
    if (packet.kind === 'dice') {
      if (typeof DiceSequence === 'undefined') return Promise.resolve();
      return DiceSequence.play({...packet.data,container:packet.container});
    }
    if (typeof BattleScene === 'undefined') return Promise.resolve();
    if (packet.kind === 'missile') return BattleScene.presentMissile(packet.data);
    if (packet.kind === 'nuclear') return BattleScene.effect('nuclear',packet.data);
    return Promise.resolve();
  }

  function play(packet, broadcast = false) {
    if (presentations.has(packet.id)) return presentations.get(packet.id);
    const serializable = {id:packet.id,kind:packet.kind,data:packet.data};
    if (broadcast && typeof ONLINE !== 'undefined' && ONLINE.isOnline()) {
      Promise.resolve(ONLINE.pushAction('PRESENTATION_EVENT',serializable)).catch(error => {
        console.warn('[NUKE presentation delivery]',error);
      });
    }
    const promise = settle(Promise.resolve().then(()=>dispatch(packet)));
    presentations.set(packet.id,promise);
    if(presentations.size > 128) presentations.delete(presentations.keys().next().value);
    return promise;
  }

  function dice(id,dice,cause,container,broadcast=false,options={}) {
    return play({id,kind:'dice',data:{id,dice,cause,...options},container},broadcast);
  }

  function missile(type,event,extra={}) {
    return play({id:event.id+':'+event.revision+':'+type,kind:'missile',
      data:{type,event:JSON.parse(JSON.stringify(event)),...extra}},true);
  }

  function nuclear(id,data) {
    return play({id,kind:'nuclear',data},true);
  }

  function receive(packet) {
    if(!packet || !['dice','missile','nuclear'].includes(packet.kind) || typeof packet.id!=='string')return;
    // State snapshots continue immediately; only visual events wait for earlier visual events.
    remoteQueue=remoteQueue.then(()=>play(packet)).catch(error=>console.warn('[NUKE remote presentation]',error));
    return remoteQueue;
  }

  return {settle,play,dice,missile,nuclear,receive};
})();
