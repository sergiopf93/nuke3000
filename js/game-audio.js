// Local presentation only: never reads dice, mutates game state or broadcasts audio.
const GameAudio = (() => {
  const names = ['music_ambient_game_loop','dice_roll','shot_soldier','shot_mech','shot_scorpion','hit_flesh','hit_armor','unit_degrade','unit_fall','missile_launch','missile_intercept','missile_impact','nuclear_alert','nuclear_explosion','turn_notification','victory','defeat'];
  const storageKey = 'nuke-audio-v1';
  const defaults = {master:.8,music:.2,effects:1,muted:false};
  const prefs = {...defaults};
  const clamp = value => Math.max(0,Math.min(1,Number(value)));
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const key of ['master','music','effects']) if (Number.isFinite(saved?.[key])) prefs[key] = clamp(saved[key]);
    if (typeof saved?.muted === 'boolean') prefs.muted = saved.muted;
  } catch {}
  const buffers = new Map(), loading = new Map(), voices = new Set(), turns = new Set(), heard = new Set();
  let context, master, musicBus, effectsBus, envelope, music, playing = false, finished = false, generation = 0;
  const noop = () => {};
  const base = new URL('../assets/audio/',document.currentScript.src);
  function ramp(param,value,seconds=.08) {
    const now=context.currentTime;
    if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
    else {const value=param.value;param.cancelScheduledValues(now);param.setValueAtTime(value,now);}
    param.linearRampToValueAtTime(value,context.currentTime+seconds);
  }
  function mix() {
    if (!context) return;
    ramp(master.gain,prefs.muted?0:prefs.master);
    ramp(musicBus.gain,prefs.music); ramp(effectsBus.gain,prefs.effects);
  }
  function stopEffects() { for (const voice of [...voices]) voice.stop(); }
  function load(name) {
    if (buffers.has(name)) return Promise.resolve(buffers.get(name));
    if (loading.has(name)) return loading.get(name);
    const promise = (async()=>{
      for (const extension of ['mp3','ogg']) {
        try {
          const response = await fetch(new URL(name+'.'+extension,base));
          if (!response.ok) continue;
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          buffers.set(name,buffer); return buffer;
        } catch {}
      }
      return null;
    })();
    loading.set(name,promise);
    promise.then(buffer=>{if(!buffer)loading.delete(name);});
    return promise;
  }
  function startMusic() {
    if (!playing || finished || music || !context || context.state!=='running' || document.hidden) return;
    const buffer = buffers.get('music_ambient_game_loop'); if (!buffer) return;
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(envelope); envelope.gain.setValueAtTime(0,context.currentTime); ramp(envelope.gain,1,1.2);
    music = source; source.onended = ()=>{source.disconnect();if(music===source)music=null;}; source.start();
  }
  function unlock() {
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
        context = new Audio();
        master=context.createGain();musicBus=context.createGain();effectsBus=context.createGain();envelope=context.createGain();
        // Headroom plus compression keeps simultaneous impacts below the output ceiling.
        const compressor=context.createDynamicsCompressor();
        compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.15;
        envelope.connect(musicBus);musicBus.connect(master);effectsBus.connect(master);master.connect(compressor);compressor.connect(context.destination);
        master.gain.value=prefs.muted?0:prefs.master;musicBus.gain.value=prefs.music;effectsBus.gain.value=prefs.effects;
        context.onstatechange=()=>{if(context.state==='running')startMusic();else stopEffects();};
      }
      // Called synchronously by trusted clicks/keys; retry after an iOS interruption.
      if (!document.hidden && context.state!=='running') context.resume().then(startMusic).catch(noop);
      for (const name of names) load(name).then(()=>{if(name==='music_ambient_game_loop')startMusic();});
      startMusic();
    } catch { /* Audio is optional; gameplay must continue. */ }
  }
  function play(name,{signal,durationMs,gain=1,id}={}) {
    try {
      if(id){if(heard.has(id))return noop;heard.add(id);}
      // Never queue a late shot after decoding/resume, skip, mute or a hidden tab.
      if (!context || context.state!=='running' || document.hidden || prefs.muted || !prefs.master || !prefs.effects || signal?.aborted) return noop;
      const buffer=buffers.get(name);if(!buffer||name==='music_ambient_game_loop')return noop;
      const shots=[...voices].filter(v=>v.name.startsWith('shot_'));
      if(name.startsWith('shot_')&&shots.length>=2)shots[0].stop();
      if(voices.size>=6)voices.values().next().value.stop();
      const source=context.createBufferSource(),level=context.createGain();source.buffer=buffer;
      level.gain.value=.45*clamp(gain);source.connect(level);level.connect(effectsBus);
      let stopped=false;
      const cleanup=()=>{voices.delete(voice);signal?.removeEventListener('abort',stop);source.disconnect();level.disconnect();};
      const stop=()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}cleanup();};
      const voice={name,stop};source.onended=cleanup;voices.add(voice);signal?.addEventListener('abort',stop,{once:true});
      source.start();if(Number.isFinite(durationMs))source.stop(context.currentTime+Math.max(.01,durationMs/1000));
      return stop;
    } catch { return noop; }
  }
  function beginGame() {
    generation++;playing=true;finished=false;turns.clear();heard.clear();stopEffects();
    if(music){music.stop();music=null;}
    unlock();startMusic();
  }
  function turn(key) { if(!playing||finished||turns.has(key))return;turns.add(key);play('turn_notification'); }
  function finish(won) {
    if(finished)return;finished=true;playing=false;stopEffects();
    if(context&&music){const source=music,token=generation;ramp(envelope.gain,0,1.2);setTimeout(()=>{if(token===generation&&music===source){source.stop();music=null;}},1300);}
    play(won?'victory':'defeat');
  }
  function set(key,value) {
    if(!(key in defaults))return;
    prefs[key]=key==='muted'?!!value:clamp(value);
    try{localStorage.setItem(storageKey,JSON.stringify(prefs));}catch{}
    if(prefs.muted)stopEffects();mix();
  }
  function settings() {
    const section=document.createElement('fieldset');section.className='audio-settings';
    const legend=document.createElement('legend');legend.textContent='AUDIO';section.append(legend);
    for(const [key,text]of [['master','Volumen general'],['music','Música'],['effects','Efectos']]){
      const label=document.createElement('label'),title=document.createElement('span'),input=document.createElement('input'),output=document.createElement('output');
      input.type='range';input.min='0';input.max='100';input.step='1';input.value=String(Math.round(prefs[key]*100));input.id='audio-'+key;input.setAttribute('aria-label',text);
      title.textContent=text;output.htmlFor=input.id;output.textContent=input.value+' %';
      input.oninput=()=>{unlock();set(key,Number(input.value)/100);output.textContent=input.value+' %';};label.append(title,input,output);section.append(label);
    }
    const label=document.createElement('label'),mute=document.createElement('input');mute.type='checkbox';mute.id='audio-muted';mute.checked=prefs.muted;
    mute.onchange=()=>{unlock();set('muted',mute.checked);};label.append(mute,document.createTextNode('Silenciar todo'));section.append(label);
    const info=document.createElement('p');info.textContent='El audio se activa al tocar el juego. Si Safari lo pausa, toca de nuevo para reanudarlo. Al salir de la pestaña se pausa.';section.append(info);
    return section;
  }
  const gesture=event=>{if(event.isTrusted)unlock();};
  document.addEventListener('click',gesture,{capture:true});document.addEventListener('keydown',gesture,{capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(!context)return;
    if(document.hidden){stopEffects();context.suspend().catch(noop);}
    else if(playing&&!finished)context.resume().then(startMusic).catch(noop);
  });
  window.addEventListener('pagehide',()=>{stopEffects();if(context)context.suspend().catch(noop);});
  window.addEventListener('pageshow',()=>{if(context&&playing&&!document.hidden)context.resume().then(startMusic).catch(noop);});
  return {beginGame,play,turn,finish,unlock,settings};
})();
