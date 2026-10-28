// Shared presentation of authoritative dice. No random values or domain callbacks.
const DiceSequence = (() => {
  const active = new Set();
  const storageKey = 'nuke-animation-mode';
  let currentMode = 'normal';
  try { const stored = localStorage.getItem(storageKey); if (['normal','fast','minimal'].includes(stored)) currentMode = stored; } catch {}
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = () => currentMode;
  const duration = (ms, speed = currentMode) => reduced() || document.hidden || speed === 'minimal' ? 0 : speed === 'fast' ? ms / 3 : ms;
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
  function controls({onSkip} = {}) {
    const bar = element('div','ds-controls'), label = element('label',null,'Animación '), select = element('select');
    select.dataset.diceMode = ''; select.setAttribute('aria-label','Velocidad de animación');
    for (const [value,text] of [['normal','Cinemática'],['fast','Rápida'],['minimal','Mínima']]) {
      const option = element('option',null,text); option.value = value; option.selected = currentMode === value; select.append(option);
    }
    select.onchange = () => setMode(select.value); label.append(select);
    const button = element('button',null,'OMITIR ANIMACIÓN'); button.type = 'button'; button.dataset.diceSkip = '';
    button.onclick = () => { if (onSkip) onSkip(); else settleAll('skipped'); };
    bar.append(label,button); return bar;
  }
  function play({dice = [],cause = 'TIRADA',container,signal,speed,controls:showControls = true} = {}) {
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
      const image = element('img'); image.src = 'assets/cinematic/dice_' + die.kind + '.png'; image.alt = ''; image.draggable = false;
      const face = element('strong','ds-face','…'); body.append(image,face);
      const math = element('span','ds-math',''); math.setAttribute('aria-hidden','true');
      tile.append(label,body,math); field.append(tile); return {die,tile,body,face,math};
    });
    const summary = element('p','ds-summary'); summary.setAttribute('aria-live','polite'); root.append(summary);
    container.append(root);
    return new Promise(resolve => {
      let done = false, timer = null;
      const animations = [];
      const reveal = () => {
        root.dataset.state = 'result';
        for (const item of items) {
          const {die,tile,face,math} = item; face.textContent = String(die.value);
          math.textContent = die.raw + (die.effective !== die.raw ? ' → ' + die.effective : '') + (die.bonus ? ' + ' + die.bonus : '') + ' = ' + die.value;
          tile.setAttribute('aria-label',die.label + ' ' + die.kind.toUpperCase() + ': bruto ' + die.raw + ', efectivo ' + die.effective + ', bonificación ' + die.bonus + ', total ' + die.value);
        }
        summary.textContent = values.map(d => d.label + ': ' + d.value).join(' · ') || 'Sin dados';
      };
      const session = {container,finish(status = 'completed') {
        if (done) return; done = true; clearTimeout(timer); signal?.removeEventListener('abort',abort);
        animations.forEach(a => a.cancel()); reveal(); active.delete(session);
        if (automatic) overlay.remove();
        resolve({status,reason:status});
      }};
      const abort = () => session.finish('cancelled');
      if (showControls) root.append(controls({onSkip:() => session.finish('skipped')}));
      active.add(session); signal?.addEventListener('abort',abort,{once:true});
      const rollTime = duration(2000,speed), holdTime = duration(700,speed);
      root.dataset.state = 'rolling';
      if (signal?.aborted) { session.finish('cancelled'); return; }
      if (!rollTime || !values.length) { session.finish('completed'); return; }
      items.forEach(({body},index) => {
        if (!body.animate) return;
        try { animations.push(body.animate([
          {transform:'translate(' + (-65 + index * 6) + 'px,-65px) rotate(-40deg) rotateY(0deg) scale(.65)',opacity:.2},
          {transform:'translate(22px,-22px) rotate(180deg) rotateY(240deg) scale(1.1)',opacity:1,offset:.3},
          {transform:'translate(-8px,0) rotate(390deg) rotateY(480deg)',offset:.58},
          {transform:'translate(6px,-16px) rotate(430deg) rotateY(600deg)',offset:.78},
          {transform:'translate(0,0) rotate(720deg) rotateY(720deg) scale(1)'}
        ],{duration:rollTime,easing:'cubic-bezier(.15,.65,.35,1)'})); } catch {}
      });
      // Finite fallback is independent of animation.finished and remains valid without WAAPI.
      timer = setTimeout(() => { reveal(); timer = setTimeout(() => session.finish('completed'),holdTime); },rollTime);
    });
  }
  document.addEventListener('visibilitychange',() => { if (document.hidden) settleAll('cancelled'); });
  return {play,normalizeDice,controls,duration,mode,setMode,skip:() => settleAll('skipped'),cancelAll:() => settleAll('cancelled')};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DiceSequence;
