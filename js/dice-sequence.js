// Shared presentation of authoritative dice. No random values or domain callbacks.
const DiceSequence = (() => {
  const active = new Set();
  const storageKey = 'nuke-animation-mode';
  let currentMode = 'normal';
  try { const stored = localStorage.getItem(storageKey); if (['normal','fast','minimal'].includes(stored)) currentMode = stored; } catch {}
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = () => currentMode;
  const duration = (ms, speed = currentMode) => reduced() || document.hidden || speed === 'minimal' ? 0 : speed === 'fast' ? ms / 3 : ms;
  const attackPace = 2 / 3;
  const attackDuration = (ms,speed=currentMode) => duration(ms*attackPace,speed);
  function element(tag, className, text) {
    const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el;
  }
  function normalizeDice(dice = []) {
    return dice.map((input, index) => {
      const kind = String(input.kind || 'd' + (input.sides || 6)).toLowerCase();
      if (!['d6','d12','d20'].includes(kind)) throw new TypeError('Tipo de dado no admitido');
      const value = Number(input.value ?? input.effective ?? input.raw);
      const raw = Number(input.raw ?? value), bonus = Number(input.bonus ?? 0), effective = Number(input.effective ?? value - bonus);
      if (![value,raw,bonus,effective].every(Number.isFinite)) throw new TypeError('Resultado de dado no válido');
      return {kind,value,raw,bonus,effective,label:String(input.label || kind.toUpperCase()),side:String(input.side || ''),index};
    });
  }
  function settleAll(status) { for (const session of [...active]) session.finish(status); }
  function setMode(value) {
    if (!['normal','fast','minimal'].includes(value)) return;
    currentMode = value; try { localStorage.setItem(storageKey,value); } catch {}
    document.querySelectorAll('[data-dice-mode]').forEach(select => { select.value = value; });
    if (!duration(1)) settleAll('skipped');
    document.dispatchEvent(new CustomEvent('dice-sequence-mode',{detail:{mode:value}}));
  }
  function settings() {
    if(document.getElementById('animation-settings'))return;
    const dialog=element('dialog');dialog.id='animation-settings';
    const title=element('h2',null,'AJUSTES DE PARTIDA'),label=element('label',null,'Animaciones '),select=element('select');
    select.dataset.diceMode='';select.setAttribute('aria-label','Animaciones de partida');
    for(const [value,text] of [['normal','Cinemática'],['fast','Rápida'],['minimal','Sin animación']]){const option=element('option',null,text);option.value=value;option.selected=value===currentMode;select.append(option);}
    select.onchange=()=>setMode(select.value);label.append(select);
    const info=element('p',null,'Se aplica a esta partida y se recuerda como preferencia para las siguientes. Se respeta la reducción de movimiento del dispositivo.');
    const close=element('button',null,'GUARDAR Y CERRAR');close.onclick=()=>dialog.close();
    dialog.append(title,label,info);if(typeof GameAudio!=='undefined')dialog.append(GameAudio.settings());dialog.append(close);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
  }
  function beginGame(){try{const saved=localStorage.getItem(storageKey);if(['normal','fast','minimal'].includes(saved))currentMode=saved;}catch{}}
  function controls({onSkip} = {}) {
    const bar = element('div','ds-controls');
    const button = element('button',null,'OMITIR'); button.type = 'button'; button.dataset.diceSkip = '';
    button.setAttribute('aria-label','Omitir animación');
    button.onclick = () => { if (onSkip) onSkip(); else settleAll('skipped'); };
    bar.append(button); return bar;
  }

function diceFace(type,value,side){
 const accent=['def','defender'].includes(side)?'#8fd4ed':'#efcc83';
 const ink='#f8f4e8';
 let facets,outline;
 if(type==='d6'){
  outline='M23 13 L79 13 Q87 13 87 22 L87 79 Q87 87 79 87 L22 87 Q14 87 14 79 L14 21 Q14 13 23 13 Z';
  facets='<path d="M18 21 L33 17 L81 17 L81 72 L70 83 L19 83Z" fill="#213747"/><path d="M18 21 L33 17 L33 69 L19 83Z" fill="#f2e8c2" opacity=".13"/><path d="M33 69 L81 72 L70 83 L19 83Z" fill="#030812" opacity=".27"/>';
 }else if(type==='d12'){
  outline='M50 3 L72 9 L90 26 L96 49 L88 74 L69 91 L48 97 L27 90 L10 73 L4 50 L11 26 L29 10Z';
  facets='<path d="M50 3 L71 11 L83 35 L68 65 L42 82 L14 72 L6 50 L27 18Z" fill="#213747"/><path d="M27 18 L50 3 L71 11 L83 35 L68 65 L42 82 L14 72Z" fill="none" stroke="#ebf1ef" stroke-opacity=".26" stroke-width="1.6"/><path d="M14 72 L42 82 L48 97 L27 90Z M68 65 L83 35 L96 49 L88 74 L69 91Z" fill="#050c15" opacity=".38"/>';
 }else{
  outline='M50 3 L81 12 L97 44 L84 79 L51 97 L17 81 L3 45 L20 14Z';
  facets='<path d="M50 3 L81 12 L97 44 L51 77 L3 45 L20 14Z" fill="#213747"/><path d="M50 3 L51 77 L20 14Z M81 12 L51 77 L97 44Z" fill="#fff" opacity=".095"/><path d="M51 77 L84 79 L51 97 L17 81 L3 45Z" fill="#050b14" opacity=".35"/><path d="M50 3 L51 77 L3 45 M51 77 L97 44" fill="none" stroke="#fff" stroke-opacity=".29" stroke-width="1.7"/>';
 }
 return `<svg viewBox="0 0 100 100" class="die-svg" aria-hidden="true" focusable="false"><path d="${outline}" fill="#111b27" stroke="${accent}" stroke-width="4"/>${facets}<path d="${outline}" fill="none" stroke="${accent}" stroke-opacity=".52" stroke-width="2"/><text class="ds-face" x="50" y="59" text-anchor="middle" fill="${ink}" font-size="${type==='d20'?'34':'37'}" font-family="system-ui, sans-serif" font-weight="900" stroke="#08101a" stroke-width="2.3" paint-order="stroke" dominant-baseline="middle">${value}</text></svg>`;
}

  function play({id,dice = [],cause = 'TIRADA',container,signal,speed,pace=1,controls:showControls = true} = {}) {
    let values;
    try { values = normalizeDice(dice); } catch { return Promise.resolve({status:'cancelled',reason:'cancelled'}); }
    if (typeof container === 'string') container = document.querySelector(container);
    const automatic = !container;
    let overlay;
    if (automatic) {
      overlay = element('section','ds-overlay'); overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-label',cause);
      container = element('div','ds-overlay-panel'); overlay.append(container); document.body.append(overlay);
    }
    const previous = [...active].filter(s => s.container === container); previous.forEach(s => s.finish('cancelled'));
    container.querySelectorAll(':scope > .dice-sequence').forEach(el => el.remove());
    const root = element('section','dice-sequence'); root.dataset.cause = cause;
    const heading = element('div','ds-cause',cause); root.append(heading);
    const field = element('div','ds-field'); root.append(field);
    const items = values.map((die,index) => {
      const tile = element('div','ds-tile'); tile.dataset.side = die.side;
      const label = element('span','ds-label',die.label), body = element('div','ds-die ds-' + die.kind);
      Object.assign(body.dataset,{kind:die.kind,value:String(die.value),side:die.side,index:String(index)});
      body.innerHTML = diceFace(die.kind,'…',die.side);
      const face = body.querySelector('.ds-face');
      tile.append(body,label); field.append(tile); return {die,tile,body,face};
    });
    const summary = element('p','ds-summary'); summary.setAttribute('aria-live','polite'); root.append(summary);
    const details=element('details','ds-details'),toggle=element('summary',null,'Detalle de tirada'),math=element('div','ds-math');
    math.textContent=values.map(d=>d.label+' · '+d.kind.toUpperCase()+': natural '+d.raw+', mínimo aplicado '+d.effective+', bono '+d.bonus+', total '+d.value).join(' · ');
    details.append(toggle,math);root.append(details);
    container.append(root);
    return new Promise(resolve => {
      let done = false, timer = null, stopAudio = () => {};
      const animations = [];
      const reveal = () => {
        root.dataset.state = 'result';
        for (const item of items) {
          const {die,tile,face} = item; face.textContent = String(die.value);
          tile.setAttribute('aria-label',die.label + ' ' + die.kind.toUpperCase() + ': bruto ' + die.raw + ', efectivo ' + die.effective + ', bonificación ' + die.bonus + ', total ' + die.value);
        }
        summary.textContent = values.length ? 'Tirada resuelta' : 'Sin dados';
      };
      const session = {container,finish(status = 'completed') {
        if (done) return; done = true; clearTimeout(timer); stopAudio(); signal?.removeEventListener('abort',abort);
        animations.forEach(a => a.cancel()); reveal(); active.delete(session); root.querySelector('.ds-controls')?.remove();
        if (automatic) overlay.remove();
        resolve({status,reason:status});
      }};
      const abort = () => session.finish('cancelled');
      if (showControls) root.append(controls({onSkip:() => session.finish('skipped')}));
      active.add(session); signal?.addEventListener('abort',abort,{once:true});
      const rollTime = duration(2000*pace,speed), holdTime = duration(700*pace,speed);
      root.dataset.state = 'rolling';
      if (signal?.aborted) { session.finish('cancelled'); return; }
      if (!rollTime || !values.length) { session.finish('completed'); return; }
      if(typeof GameAudio!=='undefined')stopAudio=GameAudio.play('dice_roll',{id:id?String(id)+':dice':undefined,signal,durationMs:rollTime});
      items.forEach(({body},index) => {
        if (!body.animate) return;
        try { animations.push(body.animate([
          {transform:'translate(' + (-65 + index * 6) + 'px,-65px) rotate(-40deg) scale(.65)',opacity:.2},
          {transform:'translate(22px,-22px) rotate(180deg) scale(1.1)',opacity:1,offset:.3},
          {transform:'translate(-8px,0) rotate(390deg)',offset:.58},
          {transform:'translate(6px,-16px) rotate(430deg)',offset:.78},
          {transform:'translate(0,0) rotate(720deg) scale(1)'}
        ],{duration:rollTime,easing:'cubic-bezier(.15,.65,.35,1)'})); } catch {}
      });
      // Finite fallback is independent of animation.finished and remains valid without WAAPI.
      timer = setTimeout(() => { reveal(); timer = setTimeout(() => session.finish('completed'),holdTime); },rollTime);
    });
  }
  document.addEventListener('visibilitychange',() => { if (document.hidden) settleAll('cancelled'); });
  return {play,normalizeDice,controls,settings,beginGame,duration,attackDuration,attackPace,mode,setMode,skip:() => settleAll('skipped'),cancelAll:() => settleAll('cancelled')};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DiceSequence;
