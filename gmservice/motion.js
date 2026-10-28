// Анимация при прокрутке и звуки для демо. Чистый JS, звуки синтезируются в браузере (Web Audio), файлов нет.
// Звук включается только после первого клика/нажатия (так требует браузер) и выключается кнопкой слева внизу.
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const read = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* без сохранения тоже работает */ } };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = document.createElement('style');
  css.textContent = `
  .rv { opacity:0; transform:translateY(28px); transition:opacity .8s ease-out, transform .8s cubic-bezier(.2,.7,.2,1); }
  .rv.in { opacity:1; transform:none; }
  #gm-progress { position:fixed; left:0; top:0; height:1px; width:100%; background:#fff; transform-origin:0 50%; transform:scaleX(0); z-index:120; pointer-events:none; }
  .nav { transition:box-shadow .2s ease-out; }
  .nav.scrolled { box-shadow:0 1px 0 #292d30; }
  .cubewrap { will-change:transform; }
  .gm-snd { position:fixed; left:16px; bottom:16px; z-index:60; cursor:pointer; background:#000; color:#a1a4a5; border:1px solid #292d30; border-radius:6px; padding:10px 12px; font:400 12px/1 'JetBrains Mono','Commit Mono',ui-monospace,monospace; transition:border-color .15s ease-out, color .15s ease-out; }
  .gm-snd:hover { border-color:#fff; color:#fff; }
  `;
  document.head.appendChild(css);

  // ---------- звук ----------
  let on = read('gm-sound', 'on') === 'on';
  let ac = null;
  const ensure = () => {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const unlocked = () => ac && ac.state === 'running';
  const env = (g, t, peak, attack, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const tone = (freq, dur, peak, type = 'sine', delay = 0, slideTo) => {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, peak, 0.004, dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const noise = (dur, peak, f0, f1, type = 'bandpass') => {
    const t = ac.currentTime, n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, peak, dur * 0.35, dur);
    s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + dur + 0.02);
  };
  const SOUNDS = {
    tick: () => tone(2400, 0.03, 0.025, 'sine'),
    hover: () => tone(1700, 0.025, 0.012, 'sine'),
    click: () => { tone(880, 0.05, 0.04, 'triangle'); tone(1320, 0.04, 0.02, 'sine', 0.02); },
    whoosh: () => noise(0.55, 0.07, 300, 2600),
    pop: () => { noise(0.22, 0.06, 4000, 900, 'highpass'); tone(520, 0.12, 0.03, 'sine', 0, 180); },
    chime: () => { tone(880, 0.7, 0.05, 'sine'); tone(1318, 0.8, 0.04, 'sine', 0.09); tone(1760, 0.9, 0.025, 'sine', 0.18); },
  };
  window.gmSound = (name) => { if (on && !reduce && unlocked() && SOUNDS[name]) { try { SOUNDS[name](); } catch (e) { /* звук не критичен */ } } };

  const btn = document.createElement('button');
  btn.className = 'gm-snd'; btn.type = 'button';
  const paint = () => { btn.textContent = on ? 'звук: вкл' : 'звук: выкл'; btn.setAttribute('aria-pressed', String(on)); };
  btn.onclick = () => { on = !on; write('gm-sound', on ? 'on' : 'off'); paint(); if (on) { ensure(); window.gmSound('click'); } };
  paint(); document.body.appendChild(btn);

  const unlock = () => { ensure(); removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); };
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);

  const HOVER = '.btn, .link, .nav nav a, .card, .filters button, .gs-panel button, .gs-toggle, select, input[type=text], input[type=tel], textarea';
  let lastEl = null, lastT = 0;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest(HOVER);
    if (!el || el === lastEl) return;
    lastEl = el;
    const now = performance.now();
    if (now - lastT > 90 && !el.classList.contains('card')) { lastT = now; window.gmSound('hover'); }
  });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget || !(e.relatedTarget.closest && e.relatedTarget.closest(HOVER))) lastEl = null; });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button, .btn, a.link')) { if (!e.target.closest('.gm-snd')) window.gmSound('click'); } });

  // ---------- анимация при прокрутке ----------
  const bar = document.createElement('div'); bar.id = 'gm-progress'; document.body.appendChild(bar);
  const nav = $('.nav'), cube = $('.cubewrap');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      if (nav) nav.classList.toggle('scrolled', scrollY > 8);
      if (cube && !reduce && scrollY < innerHeight * 1.2) cube.style.transform = `translateY(${(scrollY * 0.18).toFixed(1)}px)`;
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (reduce || !('IntersectionObserver' in window)) return;
  const groups = ['.hero .wrap > div:first-child > *', '.term', 'section h2', 'section .sub', '.grid', '.form', '.done'];
  const targets = new Set();
  $$('.hero .wrap > div:first-child > *').forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = `${i * 90}ms`; targets.add(el); });
  $$('.grid').forEach((grid) => [...grid.children].forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = `${i * 80}ms`; targets.add(el); }));
  ['.term', 'section h2', 'section .sub', '#request .card'].forEach((sel) => $$(sel).forEach((el) => { el.classList.add('rv'); targets.add(el); }));
  void groups;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in'); io.unobserve(en.target);
      if (en.target.tagName === 'H2') window.gmSound('tick');
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => io.observe(el));
  // после появления убираем задержку, чтобы она не мешала наведению на карточки
  document.addEventListener('transitionend', (e) => { if (e.target.classList && e.target.classList.contains('in') && e.propertyName === 'transform') e.target.style.transitionDelay = ''; });
})();
