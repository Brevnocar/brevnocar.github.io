// Выбор стиля прямо на сайте. Чистый JS, без библиотек. Выбор хранится в браузере (localStorage).
// Стили: «Лесенка» и «Частицы» — заставки при входе, «Волны» — название с рябью под курсором, «Скролл-текст» — буквы собираются при прокрутке.
(() => {
  const TITLE = 'G-M Service';
  const STYLES = [
    { id: 'stairs', name: 'Лесенка', note: 'Заставка-ступеньки при входе' },
    { id: 'particles', name: 'Частицы', note: 'Живые точки, реагируют на мышь' },
    { id: 'waves', name: 'Волны', note: 'Название «плывёт» под курсором' },
    { id: 'scroll', name: 'Скролл-текст', note: 'Буквы собираются, когда листаете' },
    { id: 'vanish', name: 'Исчезающий ввод', note: 'Текст рассыпается на частицы по Enter' },
  ];
  const $ = (s) => document.querySelector(s);
  const read = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* работает и без сохранения */ } };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let style = read('gm-style', 'stairs');
  if (!STYLES.some((s) => s.id === style)) style = 'stairs';
  let chosen = read('gm-style-chosen', '');

  const css = document.createElement('style');
  css.textContent = `
  /* Токены DESIGN.md: чёрный холст, рамки 1px #292d30, радиусы 6 и 16, кнопки прозрачные, без теней и цветных заливок */
  .gs-pick { position:fixed; z-index:60; right:16px; bottom:16px; font:14px/1.43 'Inter',system-ui,sans-serif; }
  .gs-toggle { cursor:pointer; background:#000; color:#fff; border:1px solid #292d30; border-radius:6px; padding:12px 16px; font:500 14px/1 inherit; transition:border-color .15s ease-out; }
  .gs-toggle:hover { border-color:#fff; }
  .gs-panel { display:none; width:min(320px, calc(100vw - 32px)); margin-bottom:8px; padding:16px; border-radius:16px; background:rgba(0,0,0,.95); border:1px solid #292d30; backdrop-filter:blur(25px); }
  .gs-pick.open .gs-panel { display:grid; gap:8px; }
  .gs-head { color:#a1a4a5; font:400 12px/1.33 'JetBrains Mono','Commit Mono',ui-monospace,monospace; margin-bottom:4px; }
  .gs-panel button { cursor:pointer; font:inherit; color:#f0f0f0; background:transparent; border:1px solid #292d30; border-radius:6px; padding:10px 12px; text-align:left; transition:border-color .15s ease-out; }
  .gs-panel button:hover { border-color:#6e727a; }
  .gs-panel button small { display:block; color:#a1a4a5; font-size:12px; margin-top:2px; }
  .gs-panel button.on { color:#fff; border-color:#fff; }
  .gs-panel .gs-ok { text-align:center; color:#fff; margin-top:4px; }
  .gs-panel .gs-ok:hover { border-color:#fff; }
  .gs-state { color:#a1a4a5; font:400 12px/1.33 'JetBrains Mono','Commit Mono',ui-monospace,monospace; }

  .gs-intro { position:fixed; inset:0; z-index:90; background:#000; transition:transform 1s cubic-bezier(.76,0,.24,1); }
  .gs-intro.out { transform:translateY(-101%); border-bottom:1px solid #292d30; }
  .gs-intro canvas { width:100%; height:100%; display:block; }
  .gs-intro .logo { position:absolute; inset:0; display:grid; place-content:center; text-align:center; pointer-events:none; }
  .gs-intro .logo b { font:400 clamp(40px,8vw,96px)/1 'Playfair Display',Georgia,serif; letter-spacing:-.01em; color:#fff; }
  .gs-intro .logo span { color:#a1a4a5; font:400 12px/1.33 'JetBrains Mono','Commit Mono',ui-monospace,monospace; margin-top:12px; }

  #gs-waves { display:none; position:relative; height:320px; margin:0 0 24px; padding:0; border-top:1px solid #292d30; border-bottom:1px solid #292d30; }
  #gs-waves canvas { width:100%; height:100%; display:block; cursor:crosshair; }
  body[data-style="waves"] #gs-waves { display:block; }

  #gs-scroll { display:none; height:210vh; position:relative; padding:0; }
  body[data-style="scroll"] #gs-scroll { display:block; }
  #gs-scroll .stick { position:sticky; top:0; height:100vh; display:grid; place-content:center; text-align:center; perspective:900px; overflow:hidden; }
  #gs-scroll .row { display:flex; justify-content:center; font:400 clamp(40px,9vw,128px)/1 'Playfair Display',Georgia,serif; letter-spacing:-.01em; white-space:pre; transform-style:preserve-3d; }
  #gs-scroll .row span { display:inline-block; will-change:transform; color:#fff; }
  #gs-scroll .hint { margin-top:24px; color:#a1a4a5; font:400 12px/1.33 'JetBrains Mono','Commit Mono',ui-monospace,monospace; }

  #gs-vanish { display:none; padding:0; margin:0 0 24px; }
  body[data-style="vanish"] #gs-vanish { display:block; }
  #gs-vanish .box { width:min(640px, calc(100% - 48px)); margin:0 auto; padding:48px 0; text-align:center; }
  #gs-vanish input { width:100%; background:#000; color:#fff; border:1px solid #292d30; border-radius:6px; padding:16px 20px; font:400 20px/1.4 'Inter',system-ui,sans-serif; outline:none; transition:border-color .15s ease-out; }
  #gs-vanish input:focus { border-color:#fff; }
  #gs-vanish input::placeholder { color:#6e727a; }
  #gs-vanish .hint { margin-top:12px; color:#a1a4a5; font:400 12px/1.33 'JetBrains Mono','Commit Mono',ui-monospace,monospace; }
  `;
  document.head.appendChild(css);

  // ---------- панель выбора ----------
  const pick = document.createElement('div');
  pick.className = 'gs-pick';
  pick.innerHTML = `<div class="gs-panel"><div class="gs-head">Выберите стиль сайта</div>
    ${STYLES.map((s) => `<button data-id="${s.id}">${s.name}<small>${s.note}</small></button>`).join('')}
    <button class="gs-ok" type="button">Мне нравится этот</button><div class="gs-state"></div></div>
    <button class="gs-toggle" type="button">Выбрать стиль</button>`;
  document.body.appendChild(pick);

  const paintPick = () => {
    pick.querySelectorAll('button[data-id]').forEach((b) => {
      b.classList.toggle('on', b.dataset.id === style);
      const s = STYLES.find((x) => x.id === b.dataset.id);
      b.firstChild.textContent = s.name + (s.id === chosen ? ' ✓' : '');
    });
    const c = STYLES.find((x) => x.id === chosen);
    pick.querySelector('.gs-state').textContent = c ? `Ваш выбор: ${c.name}` : 'Нажмите «Мне нравится», чтобы сохранить выбор';
  };

  // ---------- заставка «частицы» ----------
  let intro = null;
  const killIntro = () => { if (intro) { intro.stop(); intro.el.remove(); intro = null; } };
  const runParticles = () => {
    killIntro();
    if (reduce) return;
    const el = document.createElement('div');
    el.className = 'gs-intro';
    el.innerHTML = `<canvas></canvas><div class="logo"><b>${TITLE}</b><span>двигайте мышью</span></div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas');
    const g = cv.getContext('2d');
    const mouse = { x: -999, y: -999 };
    let dots = [], w = 0, h = 0, raf = 0;
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(150, Math.round((w * h) / 9000));
      dots = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .6, vy: (Math.random() - .5) * .6, r: 1.2 + Math.random() * 2 }));
    };
    const tick = () => {
      g.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y, dist = Math.hypot(dx, dy);
        if (dist < 140 && dist > .1) { const k = (1 - dist / 140) * 1.6; d.vx += dx / dist * k; d.vy += dy / dist * k; }
        d.vx *= .96; d.vy *= .96;
        d.x += d.vx + .05 * Math.sin(d.y / 60); d.y += d.vy;
        if (d.x < 0) d.x += w; if (d.x > w) d.x -= w; if (d.y < 0) d.y += h; if (d.y > h) d.y -= h;
      }
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
        if (d < 90) { g.strokeStyle = `rgba(240,240,240,${(1 - d / 90) * .22})`; g.beginPath(); g.moveTo(dots[i].x, dots[i].y); g.lineTo(dots[j].x, dots[j].y); g.stroke(); }
      }
      g.fillStyle = '#f0f0f0';
      for (const d of dots) { g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.2832); g.fill(); }
      raf = requestAnimationFrame(tick);
    };
    const move = (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    fit(); addEventListener('resize', fit); cv.addEventListener('pointermove', move); raf = requestAnimationFrame(tick);
    const t1 = setTimeout(() => el.classList.add('out'), 3000);
    const t2 = setTimeout(killIntro, 4100);
    intro = { el, stop() { cancelAnimationFrame(raf); removeEventListener('resize', fit); clearTimeout(t1); clearTimeout(t2); } };
  };

  // ---------- «Волны»: WebGL2, чистый JS ----------
  const wavesBox = document.createElement('section');
  wavesBox.id = 'gs-waves';
  wavesBox.innerHTML = '<canvas></canvas>';
  let wave = null;
  const VERT = '#version 300 es\nin vec2 p; out vec2 vUv; void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }';
  const SIM = `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D uS; uniform vec2 uT, uM; uniform float uF, uA;
  void main(){
    vec4 d = texture(uS, vUv);
    float s = texture(uS, vUv+vec2(uT.x,0.)).r + texture(uS, vUv-vec2(uT.x,0.)).r + texture(uS, vUv+vec2(0.,uT.y)).r + texture(uS, vUv-vec2(0.,uT.y)).r;
    float n = (s*.5 - d.g) * .985;
    n += uF * smoothstep(.04, 0., length((vUv-uM)*vec2(uA,1.)));
    o = vec4(n, d.r, 0., 1.);
  }`;
  const VIEW = `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D uS, uB; uniform vec2 uT;
  void main(){
    float l = texture(uS, vUv-vec2(uT.x,0.)).r, r = texture(uS, vUv+vec2(uT.x,0.)).r, dn = texture(uS, vUv-vec2(0.,uT.y)).r, u = texture(uS, vUv+vec2(0.,uT.y)).r;
    vec2 sl = vec2(r-l, u-dn);
    vec3 c = texture(uB, vUv + sl*.5).rgb;
    c += vec3(.94) * pow(clamp(length(sl)*6.,0.,1.),2.) * .16;
    o = vec4(c, 1.);
  }`;
  const stopWaves = () => { if (wave) { wave.stop(); wave = null; } };
  const startWaves = () => {
    stopWaves();
    const cv = wavesBox.querySelector('canvas');
    const gl = cv.getContext('webgl2', { antialias: false });
    if (!gl || !(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))) {
      wavesBox.innerHTML = `<div style="display:grid;place-content:center;height:100%;font:400 clamp(40px,8vw,96px)/1 'Playfair Display',Georgia,serif;color:#fff">${TITLE}</div>`;
      return;
    }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(2, Math.round(cv.clientWidth * dpr)), H = Math.max(2, Math.round(cv.clientHeight * dpr));
    cv.width = W; cv.height = H;
    const prog = (fs) => {
      const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
      return p;
    };
    const sim = prog(SIM), view = prog(VIEW);
    if (!gl.getProgramParameter(sim, gl.LINK_STATUS) || !gl.getProgramParameter(view, gl.LINK_STATUS)) return;
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const SW = 512, SH = Math.max(64, Math.round(SW * H / W));
    const mkTex = (w, h, fl) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (fl) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const mkFbo = (t) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
    let A = { t: mkTex(SW, SH, true) }, B = { t: mkTex(SW, SH, true) };
    A.f = mkFbo(A.t); B.f = mkFbo(B.t);

    // картинка с названием
    const base = document.createElement('canvas'); base.width = W; base.height = H;
    const g = base.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    let size = Math.min(H * .42, W * .2); g.font = `400 ${size}px "Playfair Display",Georgia,serif`;
    const tw = g.measureText(TITLE).width; if (tw > W * .86) size *= W * .86 / tw;
    g.font = `400 ${size}px "Playfair Display",Georgia,serif`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(TITLE, W / 2, H / 2);
    const bt = mkTex(W, H, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, base);

    const m = { x: -5, y: -5, px: -5, py: -5 };
    const move = (e) => { const r = cv.getBoundingClientRect(); m.x = (e.clientX - r.left) / r.width; m.y = 1 - (e.clientY - r.top) / r.height; if (m.px < -1) { m.px = m.x; m.py = m.y; } };
    const leave = () => { m.x = m.px = -5; m.y = m.py = -5; };
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerleave', leave);

    let raf = 0, dead = false;
    const u = (p, n) => gl.getUniformLocation(p, n);
    const frame = () => {
      if (dead) return;
      const speed = Math.min(Math.hypot(m.x - m.px, m.y - m.py) * 14, 1);
      m.px = m.x; m.py = m.y;
      gl.useProgram(sim);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.f); gl.viewport(0, 0, SW, SH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.uniform1i(u(sim, 'uS'), 0); gl.uniform2f(u(sim, 'uT'), 1 / SW, 1 / SH); gl.uniform2f(u(sim, 'uM'), m.x, m.y);
      gl.uniform1f(u(sim, 'uF'), reduce ? 0 : speed * .9); gl.uniform1f(u(sim, 'uA'), W / H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      [A, B] = [B, A];
      gl.useProgram(view);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(u(view, 'uS'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bt); gl.uniform1i(u(view, 'uB'), 1);
      gl.uniform2f(u(view, 'uT'), 1 / SW, 1 / SH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    wave = { stop() { dead = true; cancelAnimationFrame(raf); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerleave', leave); } };
  };

  // ---------- «Скролл-текст» ----------
  const scrollBox = document.createElement('section');
  scrollBox.id = 'gs-scroll';
  const LETTERS = TITLE.toUpperCase().split('');
  scrollBox.innerHTML = `<div class="stick"><div class="row">${LETTERS.map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div><div class="hint">листайте вниз — буквы собираются в слово</div></div>`;
  const spans = [...scrollBox.querySelectorAll('.row span')];
  const paintScroll = () => {
    if (style !== 'scroll') return;
    const r = scrollBox.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = reduce ? .5 : Math.max(0, Math.min(1, -r.top / Math.max(span, 1)));
    const a = 1 - Math.sin(p * Math.PI);               // 0 — буквы стоят ровно (середина), 1 — разлетелись (начало и конец)
    const c = (spans.length - 1) / 2;
    spans.forEach((s, i) => {
      const d = (i - c) / c, sg = i % 2 ? 1 : -1;
      s.style.transform = `translateY(${(a * d * d * 200 * sg).toFixed(1)}px) rotateX(${(a * 80 * sg).toFixed(1)}deg) rotateZ(${(a * d * 25).toFixed(1)}deg) scale(${(1 - a * .45).toFixed(3)})`;
      s.style.opacity = (1 - a * .65).toFixed(2);
    });
  };
  addEventListener('scroll', paintScroll, { passive: true });
  addEventListener('resize', () => { paintScroll(); if (style === 'waves') startWaves(); });

  // ---------- «Исчезающий ввод»: текст из поля рассыпается на частицы ----------
  const vanishOne = (el) => new Promise((resolve) => {
    const text = el.value;
    if (!text.trim()) { resolve(); return; }
    if (window.gmSound) window.gmSound('pop');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas');
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:80;pointer-events:none`;
    document.body.appendChild(cv);
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.scale(dpr, dpr);
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.fillStyle = cs.color; g.textBaseline = 'top';
    const px = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    const py = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    const maxW = r.width - px * 2;
    const lines = [];
    for (const para of text.split('\n')) {                 // переносим строки так же, как поле
      let cur = '';
      for (const word of para.split(' ')) {
        const t = cur ? cur + ' ' + word : word;
        if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = word; } else cur = t;
      }
      lines.push(cur);
    }
    const single = el.tagName === 'INPUT';
    lines.slice(0, single ? 1 : Math.floor((r.height - py) / lh)).forEach((l, i) => g.fillText(l, px, single ? (r.height - lh) / 2 : py + i * lh));
    const data = g.getImageData(0, 0, cv.width, cv.height).data;
    const step = Math.max(2, Math.round(Math.sqrt((cv.width * cv.height) / 9000)));
    const ps = [];
    for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step) {
      if (data[(y * cv.width + x) * 4 + 3] > 120) ps.push({ x: x / dpr, y: y / dpr, vx: 0.6 + Math.random() * 2.6, vy: (Math.random() - .5) * 2.2, s: 1 + Math.random() * 1.6, d: (x / cv.width) * 500 + Math.random() * 150 });
    }
    const keepColor = el.style.color, keepCaret = el.style.caretColor;
    el.style.color = 'transparent'; el.style.caretColor = 'transparent';
    const t0 = performance.now();
    const loop = (now) => {
      const t = now - t0;
      g.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      for (const p of ps) {
        const age = t - p.d;
        if (age < 0) { g.globalAlpha = 1; g.fillStyle = cs.color; g.fillRect(p.x, p.y, p.s, p.s); alive++; continue; }
        const k = age / 900;
        if (k >= 1) continue;
        alive++;
        g.globalAlpha = 1 - k; g.fillStyle = '#a1a4a5';
        g.fillRect(p.x + p.vx * age * .06 * (1 + k), p.y + p.vy * age * .05 + Math.sin(age / 90 + p.x) * 1.5, p.s, p.s);
      }
      if (alive) requestAnimationFrame(loop);
      else { cv.remove(); el.value = ''; el.style.color = keepColor; el.style.caretColor = keepCaret; resolve(); }
    };
    requestAnimationFrame(loop);
  });
  // форма заявки зовёт это перед показом «Заявка принята»
  window.gmVanish = async (sels) => {
    if (style !== 'vanish' || reduce) return;
    await Promise.all(sels.map((s) => vanishOne($(s))));
  };

  const vanishBox = document.createElement('section');
  vanishBox.id = 'gs-vanish';
  vanishBox.innerHTML = '<div class="box"><input type="text" maxlength="80" placeholder="Напишите что-нибудь и нажмите Enter" autocomplete="off"><div class="hint">текст рассыплется на частицы</div></div>';
  vanishBox.querySelector('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); vanishOne(e.target); } });

  // ---------- применение стиля ----------
  const anchor = $('#services');
  anchor.parentNode.insertBefore(wavesBox, anchor);
  anchor.parentNode.insertBefore(scrollBox, anchor);
  anchor.parentNode.insertBefore(vanishBox, anchor);

  const apply = (id, user) => {
    style = id; write('gm-style', id);
    document.body.dataset.style = id;
    killIntro(); stopWaves();
    if (user && window.gmSound) window.gmSound('whoosh');
    const pre = $('#pre');
    if (id === 'stairs') { if (window.gmStairs && (user || pre.classList.contains('run'))) { pre.className = 'run'; void pre.offsetWidth; window.gmStairs(); } }
    else { pre.className = 'gone'; }
    if (id === 'particles' && (user || !window.__gsFirst)) runParticles();
    if (id === 'waves') { startWaves(); if (user) wavesBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
    if (id === 'scroll') { paintScroll(); if (user) scrollBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    if (id === 'vanish' && user) { vanishBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); vanishBox.querySelector('input').focus({ preventScroll: true }); }
    paintPick();
  };

  pick.querySelector('.gs-toggle').onclick = () => pick.classList.toggle('open');
  pick.querySelectorAll('button[data-id]').forEach((b) => { b.onclick = () => apply(b.dataset.id, true); });
  pick.querySelector('.gs-ok').onclick = () => { chosen = style; write('gm-style-chosen', chosen); paintPick(); };
  const rp = $('#replay'); if (rp) rp.onclick = () => apply(style, true);

  window.__gsFirst = false;
  apply(style, false);
})();
