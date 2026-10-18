/* Le 68: page-local behaviour. The engine is untouched; everything here
   reads scroll and pointer itself.
   - the window: pointer lean on the hero planes
   - the curtain: parts as its chapter passes, closes again at the end
   - the coaster: chapter list, plus a wine ring for every chapter reached
   - the swirl: the signature move */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var win = document.querySelector('.win');
  var curtain = document.querySelector('.curtain');
  var inside = document.querySelector('.inside');

  /* ---------------- hero pointer lean ---------------- */
  var pm = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer && !reduce && win) {
    window.addEventListener('pointermove', function (e) {
      pm.tx = (e.clientX / innerWidth) * 2 - 1;
      pm.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------------- curtain open / close ---------------- */
  function sectionP(el) {
    var r = el.getBoundingClientRect();
    return clamp((innerHeight - r.top) / (r.height + innerHeight), 0, 1);
  }

  function frameLayout() {
    if (curtain && !reduce) {
      var p = sectionP(curtain);
      var h = curtain.offsetHeight, vh = innerHeight;
      // p at which the section fully covers the screen, then parts across it
      var covered = vh / (h + vh);
      curtain.style.setProperty('--open', smooth(covered - 0.04, covered + (h - vh) / (h + vh) * 0.95, p).toFixed(4));
    }
    if (inside && !reduce) {
      var r = inside.getBoundingClientRect();
      var enter = clamp((innerHeight - r.top) / innerHeight, 0, 1);
      inside.style.setProperty('--close', smooth(0.15, 0.85, enter).toFixed(4));
    }
    if (win && finePointer && !reduce) {
      pm.x = lerp(pm.x, pm.tx, 0.06); pm.y = lerp(pm.y, pm.ty, 0.06);
      win.style.setProperty('--mx', pm.x.toFixed(4));
      win.style.setProperty('--my', pm.y.toFixed(4));
    }
  }
  if (reduce && inside) inside.style.setProperty('--close', '1');

  /* ---------------- the coaster ---------------- */
  var disc = document.querySelector('.coaster__disc');
  var menu = document.getElementById('coaster-menu');
  var stains = document.querySelector('.coaster__stains');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  var links = Array.prototype.slice.call(menu.querySelectorAll('li a'));

  function setMenu(open) {
    menu.hidden = !open;
    disc.setAttribute('aria-expanded', String(open));
    if (open) { var cur = menu.querySelector('[aria-current="true"]') || links[0]; cur.focus({ preventScroll: true }); }
  }
  disc.addEventListener('click', function () { setMenu(menu.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); disc.focus(); } });
  document.addEventListener('pointerdown', function (e) { if (!menu.hidden && !e.target.closest('.coaster')) setMenu(false); });
  links.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  menu.querySelector('.coaster__book').addEventListener('click', function () { setMenu(false); });

  // One ring per chapter: a stain, not a circle. Seeded so it is the same ring
  // every visit.
  var seed = 68;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  var ringPaths = chapters.map(function (_, i) {
    var cx = 60 + (rnd() - 0.5) * 30, cy = 60 + (rnd() - 0.5) * 30, r = 22 + rnd() * 14;
    var pts = [], n = 40, wob = 0.6 + rnd() * 1.4, ph = rnd() * 6.28;
    for (var k = 0; k <= n; k++) {
      var a = (k / n) * Math.PI * 2;
      var rr = r + Math.sin(a * 3 + ph) * wob + Math.sin(a * 7 + ph * 2) * wob * 0.4;
      pts.push((k ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ',' + (cy + Math.sin(a) * rr).toFixed(2));
    }
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pts.join(' ') + 'Z');
    path.setAttribute('stroke-width', (1.1 + rnd() * 1.6).toFixed(2));
    var len = 2 * Math.PI * r, gap = len * (0.08 + rnd() * 0.22);
    path.setAttribute('stroke-dasharray', (len - gap).toFixed(1) + ' ' + gap.toFixed(1));
    path.setAttribute('stroke-dashoffset', (rnd() * len).toFixed(1));
    stains.appendChild(path);
    return path;
  });

  var currentChapter = -1;
  function chapterTick() {
    var mid = innerHeight * 0.5, cur = 0;
    chapters.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      if (r.top < mid) { cur = i; ringPaths[i].classList.add('on'); }
    });
    if (cur !== currentChapter) {
      currentChapter = cur;
      links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
  }

  /* ---------------- the swirl ---------------- */
  var verre = document.querySelector('.verre');
  var verreAct = document.getElementById('verre');
  var glassBox = document.querySelector('.verre__glass');
  var canvas = document.querySelector('.verre__wine');
  var aromaLayer = document.querySelector('.verre__aromas');
  var btn = document.querySelector('.swirl-btn');
  var ctx = canvas.getContext('2d');

  // Outer edge of the bowl, measured off assets/glass.jpg: [y, half-width],
  // both as fractions of the image box. Inner wall sits a hair inside.
  var PROFILE = [[.118,.147],[.125,.151],[.143,.161],[.156,.167],[.179,.178],[.223,.197],[.268,.216],[.312,.228],[.335,.2305],[.357,.229],[.38,.223],[.402,.214],[.425,.198],[.446,.176],[.46,.157],[.473,.134],[.487,.106],[.5,.076],[.512,.048],[.521,.026]];
  var WALL = 0.0065, CX = 0.4995;
  function hwAt(y) {
    if (y <= PROFILE[0][0] || y >= PROFILE[PROFILE.length - 1][0]) return 0;
    for (var i = 1; i < PROFILE.length; i++) {
      if (y <= PROFILE[i][0]) {
        var a = PROFILE[i - 1], b = PROFILE[i], t = (y - a[0]) / (b[0] - a[0]);
        t = (1 - Math.cos(t * Math.PI)) / 2;
        return Math.max(0, lerp(a[1], b[1], t) - WALL);
      }
    }
    return 0;
  }

  var WINES = [
    { top: [238, 214, 140, .62], deep: [196, 160, 62, .78], disc: [248, 232, 176, .55], level: .395, notes: ['lemon', 'green apple', 'white flowers', 'wet stone'] },
    { top: [132, 14, 32, .95], deep: [52, 3, 12, 1], disc: [158, 34, 52, .9], level: .37, notes: ['cherry', 'raspberry', 'violet', 'forest floor'] },
    { top: [92, 8, 34, .97], deep: [28, 2, 12, 1], disc: [120, 26, 56, .92], level: .37, notes: ['blackberry', 'black pepper', 'olive', 'smoke'] }
  ];
  var col = { top: WINES[0].top.slice(), deep: WINES[0].deep.slice(), disc: WINES[0].disc.slice(), level: WINES[0].level };
  var wineIdx = 0;

  var S = {
    w: 0, h: 0, dpr: 1,
    phase: 0, omega: 0, omegaIn: 0, amp: 0, film: 0, climb: 0,
    held: false, heldUntil: 0, lastAngle: null, lastT: 0,
    legs: [], aromaClock: 0, noteI: 0, scrollV: 0, lastY: scrollY
  };

  function size() {
    var r = glassBox.getBoundingClientRect();
    S.dpr = Math.min(devicePixelRatio || 1, 2);
    S.w = r.width; S.h = r.height;
    canvas.width = Math.round(r.width * S.dpr); canvas.height = Math.round(r.height * S.dpr);
  }

  function rgba(c) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + c[3].toFixed(3) + ')'; }

  function bowlPath(c) {
    var W = S.w, H = S.h, y, steps = 60, y0 = PROFILE[0][0] + 0.004, y1 = PROFILE[PROFILE.length - 1][0] - 0.002;
    c.beginPath();
    for (var i = 0; i <= steps; i++) { y = lerp(y0, y1, i / steps); c.lineTo((CX - hwAt(y)) * W, y * H); }
    for (i = steps; i >= 0; i--) { y = lerp(y0, y1, i / steps); c.lineTo((CX + hwAt(y)) * W, y * H); }
    c.closePath();
  }

  function draw(t) {
    var W = S.w, H = S.h;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!W) return;

    var level = col.level - S.amp * 0.012;          // spinning wine climbs the wall
    var slope = S.amp * 0.62 * Math.sin(S.phase);   // tilt of the surface, dy per dx (box fractions)
    var hwL = hwAt(level) + 0.01;

    ctx.save();
    bowlPath(ctx); ctx.clip();

    // the film the swirl leaves on the wall above the wine
    if (S.film > 0.01) {
      var fy = level - 0.02 - S.climb * 0.11;
      var fg = ctx.createLinearGradient(0, fy * H, 0, level * H);
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(1, rgba([col.top[0], col.top[1], col.top[2], col.top[3] * 0.2 * S.film]));
      ctx.fillStyle = fg; ctx.fillRect(0, fy * H, W, (level - fy) * H + 2);
    }

    // body of the wine
    var surf = function (x) {
      return level + slope * (x - CX) + Math.sin(x * 38 + t * 0.003) * 0.0015 * (1 + S.amp * 4);
    };
    ctx.beginPath();
    var xs = CX - 0.26, xe = CX + 0.26, n = 40, k, x;
    ctx.moveTo(xs * W, H);
    for (k = 0; k <= n; k++) { x = lerp(xs, xe, k / n); ctx.lineTo(x * W, surf(x) * H); }
    ctx.lineTo(xe * W, H); ctx.closePath();
    var g = ctx.createLinearGradient(0, (level - 0.04) * H, 0, 0.53 * H);
    g.addColorStop(0, rgba(col.top)); g.addColorStop(1, rgba(col.deep));
    ctx.fillStyle = g; ctx.fill();

    // light through the wine from the left, the way the bar lights it
    var rg = ctx.createRadialGradient((CX - 0.11) * W, (level + 0.06) * H, 2, (CX - 0.11) * W, (level + 0.06) * H, 0.2 * W);
    rg.addColorStop(0, rgba([col.disc[0], col.disc[1], col.disc[2], 0.32]));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // the surface: a thin tilted disc seen from just above
    ctx.save();
    ctx.translate(CX * W, surf(CX) * H);
    ctx.rotate(Math.atan2(slope * H, W));
    ctx.beginPath();
    ctx.ellipse(0, 0, hwL * W, Math.max(1.5, (0.011 + S.amp * 0.008) * H), 0, 0, Math.PI * 2);
    var dg = ctx.createLinearGradient(-hwL * W, 0, hwL * W, 0);
    dg.addColorStop(0, rgba(col.disc)); dg.addColorStop(0.5, rgba([col.disc[0] * 0.8, col.disc[1] * 0.8, col.disc[2] * 0.8, col.disc[3]])); dg.addColorStop(1, rgba([col.top[0], col.top[1], col.top[2], col.top[3]]));
    ctx.fillStyle = dg; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,240,220,' + (0.25 + S.amp * 0.2).toFixed(3) + ')'; ctx.stroke();
    ctx.restore();

    // legs: tears running back down the wall
    for (var i = 0; i < S.legs.length; i++) {
      var L = S.legs[i];
      var yy = L.y, side = L.side, xw = CX + side * (hwAt(yy) - 0.004);
      var lg = ctx.createLinearGradient(0, (yy - L.len) * H, 0, yy * H);
      lg.addColorStop(0, 'rgba(0,0,0,0)');
      lg.addColorStop(1, rgba([col.top[0], col.top[1], col.top[2], 0.55 * L.a]));
      ctx.strokeStyle = lg; ctx.lineWidth = L.wd; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var s = 0; s <= 6; s++) {
        var sy = yy - L.len + (L.len * s) / 6;
        ctx.lineTo((CX + side * (hwAt(sy) - 0.004)) * W, sy * H);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(xw * W, yy * H, L.wd * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = rgba([col.top[0], col.top[1], col.top[2], 0.7 * L.a]); ctx.fill();
    }
    ctx.restore();
  }

  function spawnAroma() {
    var notes = WINES[wineIdx].notes;
    var word = notes[S.noteI++ % notes.length];
    var el = document.createElement('span');
    el.className = 'aroma'; el.textContent = word;
    aromaLayer.appendChild(el);
    // lift off the rim and float out to one side, staying inside the stage
    var side = S.noteI % 2 ? 1 : -1;
    var x0 = (CX + side * (0.04 + Math.random() * 0.08)) * S.w, y0 = (0.13 + Math.random() * 0.03) * S.h;
    var dx = side * (0.22 + Math.random() * 0.16) * S.w, dy = (0.03 + Math.random() * 0.07) * S.h;
    var bw = el.offsetWidth / 2;
    var a = el.animate([
      { transform: 'translate(' + (x0 - bw) + 'px,' + y0 + 'px)', opacity: 0 },
      { transform: 'translate(' + (x0 - bw + dx * 0.45) + 'px,' + (y0 - dy * 0.6) + 'px)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + (x0 - bw + dx) + 'px,' + (y0 - dy) + 'px)', opacity: 0 }
    ], { duration: 3000, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    a.onfinish = function () { el.remove(); };
  }

  // input: circle the glass with the mouse
  if (finePointer && !reduce) {
    verre.addEventListener('pointermove', function (e) {
      var r = glassBox.getBoundingClientRect();
      var cx = r.left + r.width * CX, cy = r.top + r.height * 0.32;
      var dx = e.clientX - cx, dy = e.clientY - cy;
      if (Math.hypot(dx, dy) > Math.max(r.height * 0.75, 260)) { S.lastAngle = null; return; }
      var ang = Math.atan2(dy, dx), now = performance.now();
      if (S.lastAngle !== null) {
        var d = ang - S.lastAngle;
        if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
        var dt = Math.max(8, now - S.lastT) / 1000;
        S.omegaIn = clamp(S.omegaIn + (d / dt) * 0.35, -14, 14);
      }
      S.lastAngle = ang; S.lastT = now;
    }, { passive: true });
    verre.addEventListener('pointerleave', function () { S.lastAngle = null; });
  }
  // input: the button, held (touch, mouse) or pressed (keyboard)
  function hold(on) { S.held = on; btn.classList.toggle('is-held', on); }
  btn.addEventListener('pointerdown', function (e) { e.preventDefault(); hold(true); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { btn.addEventListener(ev, function () { hold(false); }); });
  btn.addEventListener('click', function (e) { if (e.detail === 0) S.heldUntil = performance.now() + 1600; });
  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  var live = false, lastT = performance.now();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { live = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(verreAct);
  } else live = true;

  function pickWine() {
    var p = parseFloat(getComputedStyle(verreAct).getPropertyValue('--sc-p')) || 0;
    var idx = p < 0.43 ? 0 : p < 0.72 ? 1 : 2;
    if (idx !== wineIdx) { wineIdx = idx; S.noteI = 0; }
  }

  function swirlFrame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000);
    pickWine();
    var w = WINES[wineIdx], blend = 1 - Math.exp(-dt * 3.2);
    for (var k = 0; k < 4; k++) {
      col.top[k] = lerp(col.top[k], w.top[k], blend);
      col.deep[k] = lerp(col.deep[k], w.deep[k], blend);
      col.disc[k] = lerp(col.disc[k], w.disc[k], blend);
    }
    col.level = lerp(col.level, w.level, blend);

    if (reduce) { draw(now); return; }

    var held = S.held || now < S.heldUntil;
    S.omegaIn *= Math.exp(-dt * 3.5);
    var target = S.omegaIn + (held ? 8.5 : 0) + S.scrollV;
    S.omega = lerp(S.omega, target, 1 - Math.exp(-dt * 2.4));
    var ampT = clamp(Math.abs(S.omega) / 8, 0, 1);
    var prevAmp = S.amp;
    S.amp = lerp(S.amp, ampT, 1 - Math.exp(-dt * (ampT > S.amp ? 3 : 1.4)));
    S.phase += S.omega * dt;
    S.climb = Math.max(S.climb * Math.exp(-dt * 0.25), S.amp);
    S.film = Math.max(S.film * Math.exp(-dt * 0.35), S.amp);

    // as the swirl settles, the legs start to run
    if (S.film > 0.25 && S.amp < prevAmp && S.legs.length < 14 && Math.random() < dt * 6 * S.film) {
      S.legs.push({ side: Math.random() < 0.5 ? -1 : 1, y: col.level - 0.02 - Math.random() * S.climb * 0.1, len: 0.012 + Math.random() * 0.03, v: 0.004 + Math.random() * 0.01, wd: 1 + Math.random() * 1.6, a: 0.5 + Math.random() * 0.5 });
    }
    for (var i = S.legs.length - 1; i >= 0; i--) {
      var L = S.legs[i];
      L.y += L.v * dt; L.len += L.v * dt * 0.6;
      if (L.y > col.level + 0.004) S.legs.splice(i, 1);
    }

    S.aromaClock += dt * S.amp;
    if (S.amp > 0.3 && S.aromaClock > 0.42) { S.aromaClock = 0; spawnAroma(); }

    draw(now);
  }

  /* ---------------- one loop for everything ---------------- */
  function tick(now) {
    frameLayout();
    var y = scrollY; S.scrollV = lerp(S.scrollV, clamp((y - S.lastY) * 0.15, -5, 5), 0.2); S.lastY = y;
    if (live) swirlFrame(now);
    lastT = now;
    requestAnimationFrame(tick);
  }

  function boot() { size(); chapterTick(); requestAnimationFrame(tick); }
  addEventListener('resize', size);
  addEventListener('scroll', chapterTick, { passive: true });
  var crystal = document.querySelector('.verre__crystal');
  if (crystal.complete) boot(); else crystal.addEventListener('load', boot);
})();
