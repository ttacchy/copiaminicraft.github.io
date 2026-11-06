(function () {
  var T = 32, WW = 256, WH = 80;
  var box = document.getElementById('w'), cv = document.getElementById('c'), ctx = cv.getContext('2d');
  var W = 0, H = 0;
  var map = new Uint8Array(WW * WH);
  var seed = Math.random() * 1000;

  function get(x, y) { if (x < 0 || x >= WW) return 8; if (y < 0) return 0; if (y >= WH) return 8; return map[y * WW + x]; }
  function set(x, y, v) { if (x >= 0 && x < WW && y >= 0 && y < WH) map[y * WW + x] = v; }
  function hash(i) { var s = Math.sin(i * 127.1 + seed) * 43758.5453; return s - Math.floor(s); }
  function noise(x) {
    var i = Math.floor(x), f = x - i, a = hash(i), b = hash(i + 1), s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  }

  // ---------- mundo ----------
  var heights = [];
  function gen() {
    var x, y;
    for (x = 0; x < WW; x++) {
      var h = Math.floor(34 + noise(x / 28) * 14 + noise(x / 10) * 5 + noise(x / 4) * 1.5);
      heights[x] = h;
      for (y = 0; y < WH; y++) {
        var id = 0;
        if (y === WH - 1) id = 8;
        else if (y === h) id = 1;
        else if (y > h && y <= h + 3 + Math.floor(hash(x * 3.1) * 2)) id = 2;
        else if (y > h) id = (y > h + 6 && Math.random() < 0.05) ? 7 : 3;
        set(x, y, id);
      }
    }
    // cavernas
    for (var c = 0; c < 18; c++) {
      var cx = Math.random() * WW, cy = heights[Math.floor(cx)] + 8 + Math.random() * 20, a = Math.random() * 6.28;
      for (var s = 0; s < 60; s++) {
        a += (Math.random() - 0.5) * 0.8; cx += Math.cos(a) * 1.2; cy += Math.sin(a) * 0.8;
        var rad = 1 + Math.random() * 1.2;
        for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) {
          var tx = Math.floor(cx) + dx, ty = Math.floor(cy) + dy;
          if (dx * dx + dy * dy <= rad * rad && tx >= 0 && tx < WW && ty > heights[tx] + 3 && ty < WH - 1) set(tx, ty, 0);
        }
      }
    }
    // árvores
    for (x = 4; x < WW - 4; x += 5 + Math.floor(Math.random() * 5)) {
      if (Math.abs(x - WW / 2) < 4) continue;
      var gh = heights[x];
      if (get(x, gh) !== 1) continue;
      var th = 4 + Math.floor(Math.random() * 2);
      for (var i = 1; i <= th; i++) set(x, gh - i, 4);
      for (var ly = -2; ly <= 1; ly++) for (var lx = -2; lx <= 2; lx++) {
        if (Math.abs(lx) === 2 && ly < -1) continue;
        if (get(x + lx, gh - th + ly) === 0) set(x + lx, gh - th + ly, 5);
      }
    }
  }

  // ---------- texturas ----------
  var PAL = {
    1: ['#866043', '#6f4e34', '#9a7150'], 2: ['#866043', '#6f4e34', '#9a7150'],
    3: ['#8a8a8a', '#777777', '#9c9c9c'], 4: ['#6b4f2a', '#5a4122', '#7a5c32'],
    5: ['#2f7d2f', '#276827', '#3f9a3f'], 6: ['#b8905a', '#a98350', '#c79f68'],
    7: ['#8a8a8a', '#777777', '#9c9c9c'], 8: ['#3a3a3a', '#222222', '#555555']
  };
  function mkTex(id) {
    var c = document.createElement('canvas'); c.width = c.height = 16;
    var g = c.getContext('2d'), s = id * 977 + 13, P = PAL[id], x, y;
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
      var r = rnd();
      g.fillStyle = r < 0.6 ? P[0] : r < 0.8 ? P[1] : P[2];
      g.fillRect(x, y, 1, 1);
    }
    if (id === 1) {
      for (x = 0; x < 16; x++) {
        var d = 3 + Math.floor(rnd() * 2);
        for (y = 0; y < d; y++) { g.fillStyle = rnd() < 0.5 ? '#5fa83a' : '#4f9430'; g.fillRect(x, y, 1, 1); }
      }
    }
    if (id === 4) { g.fillStyle = '#4a361c'; for (x = 2; x < 16; x += 5) g.fillRect(x, 0, 1, 16); }
    if (id === 6) {
      g.fillStyle = '#8d6b3d';
      [3, 7, 11, 15].forEach(function (yy) { g.fillRect(0, yy, 16, 1); });
      g.fillRect(5, 0, 1, 3); g.fillRect(11, 4, 1, 3); g.fillRect(4, 8, 1, 3); g.fillRect(10, 12, 1, 3);
    }
    if (id === 7) {
      g.fillStyle = '#1c1c1c';
      for (var i = 0; i < 5; i++) g.fillRect(1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 12), 3, 3);
    }
    return c;
  }
  var tex = {};
  for (var t = 1; t <= 8; t++) tex[t] = mkTex(t);

  // ---------- jogador ----------
  var p = { x: 0, y: 0, w: 24, h: 56, vx: 0, vy: 0, ground: false, face: 1, walk: 0 };
  var keys = { l: false, r: false, j: false };
  var hotbar = [2, 3, 4, 6, 5, 1, 7], sel = 0;
  var mouse = { x: 0, y: 0 }, action = null, cd = 0, touchMode = 'mine';
  var time = 0.2, elapsed = 0, cam = { x: 0, y: 0 };

  function hit() {
    var x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 0.01) / T);
    var y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 0.01) / T);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (get(x, y)) return { x: x, y: y };
    return null;
  }

  function update(dt) {
    var dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    p.vx = dir * 210;
    if (dir) p.face = dir;
    if (keys.j && p.ground) { p.vy = -520; p.ground = false; }
    p.vy = Math.min(900, p.vy + 1800 * dt);

    p.x += p.vx * dt;
    var h = hit();
    if (h) { if (p.vx > 0) p.x = h.x * T - p.w; else p.x = (h.x + 1) * T; }

    p.y += p.vy * dt;
    p.ground = false;
    h = hit();
    if (h) {
      if (p.vy > 0) { p.y = h.y * T - p.h; p.ground = true; } else p.y = (h.y + 1) * T;
      p.vy = 0;
    }
    if (dir && p.ground) p.walk += dt * 10;

    time = (time + dt / 300) % 1;
    elapsed += dt;
    cd -= dt;
    if (action && cd <= 0) { doAction(action); cd = action === 'mine' ? 0.14 : 0.2; }

    cam.x = Math.max(0, Math.min(WW * T - W, p.x + p.w / 2 - W / 2));
    cam.y = Math.max(0, Math.min(WH * T - H, p.y + p.h / 2 - H / 2));
    if (WW * T < W) cam.x = 0;
    if (WH * T < H) cam.y = 0;
  }

  function target() {
    var tx = Math.floor((mouse.x + cam.x) / T), ty = Math.floor((mouse.y + cam.y) / T);
    var dx = (tx + 0.5) * T - (p.x + p.w / 2), dy = (ty + 0.5) * T - (p.y + p.h / 2);
    return { x: tx, y: ty, ok: dx * dx + dy * dy <= 5.5 * T * 5.5 * T };
  }

  function doAction(a) {
    var t = target();
    if (!t.ok) return;
    var id = get(t.x, t.y);
    if (a === 'mine') {
      if (id && id !== 8) set(t.x, t.y, 0);
    } else if (id === 0) {
      var overlap = t.x * T < p.x + p.w && (t.x + 1) * T > p.x && t.y * T < p.y + p.h && (t.y + 1) * T > p.y;
      var support = get(t.x + 1, t.y) || get(t.x - 1, t.y) || get(t.x, t.y + 1) || get(t.x, t.y - 1);
      if (!overlap && support) set(t.x, t.y, hotbar[sel]);
    }
  }

  // ---------- desenho ----------
  function mix(a, b, k) { return Math.round(a + (b - a) * k); }

  function drawPlayer() {
    var x = Math.floor(p.x - cam.x), y = Math.floor(p.y - cam.y);
    var sw = Math.sin(p.walk) * 4;
    ctx.fillStyle = '#3a3aa8';
    ctx.fillRect(x + 4 + sw, y + 38, 8, 18);
    ctx.fillRect(x + 12 - sw, y + 38, 8, 18);
    ctx.fillStyle = '#00a8a8'; ctx.fillRect(x + 4, y + 18, 16, 20);
    ctx.fillStyle = '#c8946a'; ctx.fillRect(x + 1, y + 18, 3, 16); ctx.fillRect(x + 20, y + 18, 3, 16);
    ctx.fillRect(x + 2, y, 20, 18);
    ctx.fillStyle = '#4a2f1a'; ctx.fillRect(x + 2, y, 20, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + (p.face > 0 ? 13 : 5), y + 8, 6, 3);
    ctx.fillStyle = '#2b3f9a';
    ctx.fillRect(x + (p.face > 0 ? 16 : 5), y + 8, 3, 3);
  }

  function draw() {
    var day = Math.max(0, Math.min(1, Math.sin(time * 6.2832) * 1.6 + 0.5));
    ctx.fillStyle = 'rgb(' + mix(10, 135, day) + ',' + mix(14, 206, day) + ',' + mix(38, 235, day) + ')';
    ctx.fillRect(0, 0, W, H);

    var a = time * 6.2832;
    var sx = W / 2 - Math.cos(a) * W * 0.42, sy = H * 0.45 - Math.sin(a) * H * 0.38;
    var mx = W / 2 + Math.cos(a) * W * 0.42, my = H * 0.45 + Math.sin(a) * H * 0.38;
    ctx.fillStyle = '#ffe566'; ctx.fillRect(sx - 20, sy - 20, 40, 40);
    ctx.fillStyle = '#e8eaf2'; ctx.fillRect(mx - 14, my - 14, 28, 28);

    var cx = Math.floor(cam.x), cy = Math.floor(cam.y);
    var x0 = Math.floor(cx / T), x1 = Math.floor((cx + W) / T), y0 = Math.floor(cy / T), y1 = Math.floor((cy + H) / T);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var id = get(x, y);
      if (id && x >= 0 && x < WW && y >= 0 && y < WH) ctx.drawImage(tex[id], x * T - cx, y * T - cy, T, T);
    }

    var t = target();
    ctx.strokeStyle = t.ok ? 'rgba(255,255,255,.9)' : 'rgba(255,80,80,.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x * T - cx + 1, t.y * T - cy + 1, T - 2, T - 2);

    drawPlayer();

    ctx.fillStyle = 'rgba(6,10,40,' + (0.6 * (1 - day)).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);

    // barra de itens
    var S = 44, G = 4, total = hotbar.length * (S + G) - G, bx = Math.floor(W / 2 - total / 2), by = H - S - 12;
    for (var i = 0; i < hotbar.length; i++) {
      var sx2 = bx + i * (S + G);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sx2, by, S, S);
      ctx.drawImage(tex[hotbar[i]], sx2 + 6, by + 6, 32, 32);
      ctx.strokeStyle = i === sel ? '#ffffff' : 'rgba(255,255,255,.25)';
      ctx.lineWidth = i === sel ? 3 : 1;
      ctx.strokeRect(sx2 + 1, by + 1, S - 2, S - 2);
      ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), sx2 + 4, by + 12);
    }

    if (elapsed < 25) {
      ctx.globalAlpha = Math.min(1, (25 - elapsed) / 4);
      ctx.fillStyle = '#fff'; ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText('A D mover · Espaço pular · clique esquerdo quebra · clique direito constrói · 1 a 7 escolhe o bloco', 14, 26);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- entradas ----------
  function resize() {
    W = cv.width = box.clientWidth;
    H = cv.height = box.clientHeight;
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);

  function setMouse(e) {
    var r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  }
  function hotbarAt() {
    var S = 44, G = 4, total = hotbar.length * (S + G) - G, bx = W / 2 - total / 2, by = H - S - 12;
    if (mouse.y < by || mouse.y > by + S) return -1;
    var i = Math.floor((mouse.x - bx) / (S + G));
    return (i >= 0 && i < hotbar.length && mouse.x - bx - i * (S + G) <= S) ? i : -1;
  }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); setMouse(e);
    var hb = hotbarAt();
    if (hb >= 0) { sel = hb; return; }
    if (e.pointerType === 'mouse') action = e.button === 2 ? 'place' : 'mine';
    else action = touchMode;
    cd = 0;
  });
  cv.addEventListener('pointermove', setMouse);
  window.addEventListener('pointerup', function () { action = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    sel = (sel + (e.deltaY > 0 ? 1 : -1) + hotbar.length) % hotbar.length;
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') keys.l = true;
    else if (k === 'd' || k === 'arrowright') keys.r = true;
    else if (k === 'w' || k === ' ' || k === 'arrowup') { keys.j = true; e.preventDefault(); }
    else if (k >= '1' && k <= '7') sel = parseInt(k, 10) - 1;
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') keys.l = false;
    else if (k === 'd' || k === 'arrowright') keys.r = false;
    else if (k === 'w' || k === ' ' || k === 'arrowup') keys.j = false;
  });

  function hold(id, key) {
    var b = document.getElementById(id);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); keys[key] = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      b.addEventListener(ev, function () { keys[key] = false; });
    });
  }
  hold('bl', 'l'); hold('br', 'r'); hold('bj', 'j');
  var bm = document.getElementById('bm');
  bm.addEventListener('click', function () {
    touchMode = touchMode === 'mine' ? 'place' : 'mine';
    bm.textContent = touchMode === 'mine' ? 'Quebrar' : 'Construir';
  });

  // ---------- início ----------
  gen();
  p.x = (WW / 2) * T;
  p.y = heights[WW / 2] * T - p.h - 1;
  mouse.x = W / 2; mouse.y = H / 2;
  resize();
  requestAnimationFrame(frame);
})();
