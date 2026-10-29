// NUKE 3000 — Service Worker (PWA)
const CACHE = 'nuke3000-v10-audio';
const ASSETS = [
  '/nuke3000/',
  '/nuke3000/index.html',
  '/nuke3000/css/game.css',
  '/nuke3000/css/mobile-ux.css',
  '/nuke3000/css/visual-system.css',
  '/nuke3000/assets/fonts/orbitron-700.ttf',
  '/nuke3000/assets/fonts/rajdhani-400.ttf',
  '/nuke3000/assets/fonts/rajdhani-600.ttf',
  '/nuke3000/assets/fonts/rajdhani-700.ttf',
  '/nuke3000/js/assets.js',
  '/nuke3000/js/data.js',
  '/nuke3000/js/setup.js',
  '/nuke3000/js/map.js',
  '/nuke3000/js/battle.js',
  '/nuke3000/js/rules-v4.js',
  '/nuke3000/js/v4-game.js',
  '/nuke3000/js/battle-scene.js',
  '/nuke3000/js/dice-sequence.js',
  '/nuke3000/js/game-audio.js',
  '/nuke3000/assets/audio/defeat.mp3',
  '/nuke3000/assets/audio/defeat.ogg',
  '/nuke3000/assets/audio/dice_roll.mp3',
  '/nuke3000/assets/audio/dice_roll.ogg',
  '/nuke3000/assets/audio/hit_armor.mp3',
  '/nuke3000/assets/audio/hit_armor.ogg',
  '/nuke3000/assets/audio/hit_flesh.mp3',
  '/nuke3000/assets/audio/hit_flesh.ogg',
  '/nuke3000/assets/audio/missile_impact.mp3',
  '/nuke3000/assets/audio/missile_impact.ogg',
  '/nuke3000/assets/audio/missile_intercept.mp3',
  '/nuke3000/assets/audio/missile_intercept.ogg',
  '/nuke3000/assets/audio/missile_launch.mp3',
  '/nuke3000/assets/audio/missile_launch.ogg',
  '/nuke3000/assets/audio/music_ambient_game_loop.mp3',
  '/nuke3000/assets/audio/music_ambient_game_loop.ogg',
  '/nuke3000/assets/audio/nuclear_alert.mp3',
  '/nuke3000/assets/audio/nuclear_alert.ogg',
  '/nuke3000/assets/audio/nuclear_explosion.mp3',
  '/nuke3000/assets/audio/nuclear_explosion.ogg',
  '/nuke3000/assets/audio/shot_mech.mp3',
  '/nuke3000/assets/audio/shot_mech.ogg',
  '/nuke3000/assets/audio/shot_scorpion.mp3',
  '/nuke3000/assets/audio/shot_scorpion.ogg',
  '/nuke3000/assets/audio/shot_soldier.mp3',
  '/nuke3000/assets/audio/shot_soldier.ogg',
  '/nuke3000/assets/audio/turn_notification.mp3',
  '/nuke3000/assets/audio/turn_notification.ogg',
  '/nuke3000/assets/audio/unit_degrade.mp3',
  '/nuke3000/assets/audio/unit_degrade.ogg',
  '/nuke3000/assets/audio/unit_fall.mp3',
  '/nuke3000/assets/audio/unit_fall.ogg',
  '/nuke3000/assets/audio/victory.mp3',
  '/nuke3000/assets/audio/victory.ogg',
  '/nuke3000/js/phase-visuals.js',
  '/nuke3000/css/dice-sequence.css',
  '/nuke3000/assets/cinematic/soldier.png',
  '/nuke3000/assets/cinematic/mech.png',
  '/nuke3000/assets/cinematic/aircraft.png',
  '/nuke3000/assets/cinematic/scorpion.png',
  '/nuke3000/assets/cinematic/missile.png',
  '/nuke3000/assets/cinematic/nuclear_base.png',
  '/nuke3000/assets/cinematic/dice_d6.png',
  '/nuke3000/assets/cinematic/dice_d12.png',
  '/nuke3000/assets/cinematic/dice_d20.png',
  '/nuke3000/css/battle-scene.css',
  '/nuke3000/js/engine.js',
  '/nuke3000/js/combat.js',
  '/nuke3000/js/ui.js',
  '/nuke3000/js/mobile-ux.js',
  '/nuke3000/js/online.js',
  '/nuke3000/js/firebase-config.js',
  '/nuke3000/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    // Bypass the HTTP cache as well as replacing the previous Cache Storage version.
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async()=>{
    const old=(await caches.keys()).filter(k=>k.startsWith('nuke3000-')&&k!==CACHE);
    await Promise.all(old.map(k=>caches.delete(k)));
    await self.clients.claim();
    // A page opened through the previous cache has already loaded old scripts.
    // Reload once after the new cache is ready. Do not await navigation inside
    // activation: the navigation itself waits for this worker to become active.
    if(old.length)for(const client of await self.clients.matchAll({type:'window'})){
      if(client.url.startsWith(self.registration.scope))client.navigate(client.url).catch(()=>{});
    }
  })());
});

self.addEventListener('fetch', e => {
  // Network first for Firebase, cache first for local assets
  if (e.request.url.includes('firebase') || e.request.url.includes('googleapis')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
