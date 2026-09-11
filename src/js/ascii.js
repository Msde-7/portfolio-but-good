// Constellation. Fixed points of faint light that never move on their own.
// The pointer links nearby points with short runs of glyphs and the web
// dissolves behind it. No input means no frames.
(() => {
  'use strict';

  // Grey ramp, dimmest first. The last two are reached only under the pointer.
  const TONES = ['#141414', '#171717', '#1b1b1b', '#1f1f1f', '#242424', '#2a2a2a'];
  const LINK_TOP = 3;

  // glyph, resting tone, weight
  const STAR_TABLE = [
    ['.', 1, 41], ["'", 1, 13], [',', 1, 12], ['`', 1, 11],
    [':', 2, 9], ['+', 2, 8], ['o', 2, 2], ['*', 3, 4]
  ];

  const SEED = 0x5eed17;
  const EASE_TAU = 0.1;
  const SETTLE_PX = 0.4;
  const AMP_SETTLE = 0.012;
  const LINK_FADE = 1.6;
  const LINK_MIN = 0.3;
  const NEIGHBOURS = 3;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const hash = (a, b, c) => {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  // Smooth value noise, used to gather the field into drifts and voids
  const vnoise = (x, y, size) => {
    const fx = x / size;
    const fy = y / size;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    let tx = fx - x0;
    let ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const top = lerp(hash(x0, y0, 11), hash(x0 + 1, y0, 11), tx);
    const bot = lerp(hash(x0, y0 + 1, 11), hash(x0 + 1, y0 + 1, 11), tx);
    return lerp(top, bot, ty);
  };

  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const segDist = (qx, qy, ax, ay, bx, by) => {
    const vx = bx - ax;
    const vy = by - ay;
    const len = vx * vx + vy * vy;
    const t = len > 0 ? clamp(((qx - ax) * vx + (qy - ay) * vy) / len, 0, 1) : 0;
    const dx = qx - (ax + vx * t);
    const dy = qy - (ay + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  };

  const linkGlyph = (dx, dy) => {
    let a = Math.atan2(dy, dx);
    if (a < 0) a += Math.PI;
    const P = Math.PI;
    if (a < P / 8 || a >= (7 * P) / 8) return '-';
    if (a < (3 * P) / 8) return '\\';
    if (a < (5 * P) / 8) return '|';
    return '/';
  };

  // Bridson poisson disk, so the sky spaces itself instead of clumping
  const poisson = (w, h, r, rnd) => {
    const cell = r / Math.SQRT2;
    const gw = Math.max(1, Math.ceil(w / cell));
    const gh = Math.max(1, Math.ceil(h / cell));
    const grid = new Int32Array(gw * gh).fill(-1);
    const xs = [];
    const ys = [];
    const active = [];
    const r2 = r * r;

    const add = (x, y) => {
      const i = xs.length;
      xs.push(x);
      ys.push(y);
      grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = i;
      active.push(i);
    };

    const fits = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      const cx = (x / cell) | 0;
      const cy = (y / cell) | 0;
      const j0 = Math.max(0, cy - 2);
      const j1 = Math.min(gh - 1, cy + 2);
      const i0 = Math.max(0, cx - 2);
      const i1 = Math.min(gw - 1, cx + 2);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const k = grid[j * gw + i];
          if (k >= 0) {
            const dx = xs[k] - x;
            const dy = ys[k] - y;
            if (dx * dx + dy * dy < r2) return false;
          }
        }
      }
      return true;
    };

    add(rnd() * w, rnd() * h);
    while (active.length) {
      const ai = (rnd() * active.length) | 0;
      const k = active[ai];
      let placed = false;
      for (let t = 0; t < 14; t++) {
        const ang = rnd() * 6.283185307;
        const rad = r * (1 + rnd());
        const x = xs[k] + Math.cos(ang) * rad;
        const y = ys[k] + Math.sin(ang) * rad;
        if (fits(x, y)) {
          add(x, y);
          placed = true;
          break;
        }
      }
      if (!placed) {
        active[ai] = active[active.length - 1];
        active.pop();
      }
    }
    return { xs: xs, ys: ys };
  };

  const boot = () => {
    const pre = document.getElementById('ascii-bg');
    if (!pre) return;

    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let calm = !!(mq && mq.matches);

    pre.textContent = '';
    pre.setAttribute('aria-hidden', 'true');
    pre.style.pointerEvents = 'none';

    const gauge = document.createElement('span');
    gauge.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:pre;font:inherit';

    const fieldWrap = document.createElement('div');
    fieldWrap.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0';
    const webWrap = document.createElement('div');
    webWrap.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0';
    pre.appendChild(fieldWrap);
    pre.appendChild(webWrap);

    const webLayers = [];
    const webWrote = [];
    for (let i = 0; i < TONES.length; i++) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;font:inherit;margin:0;padding:0;color:' + TONES[i];
      webWrap.appendChild(el);
      webLayers.push(el);
      webWrote.push('');
    }

    let ready = false;
    let cw = 0;
    let ch = 0;
    let cwE = 0;
    let chE = 0;
    let stepX = 1;
    let stepY = 1;
    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    let stars = null;
    let edges = null;
    let rIn = 0;
    let rStar = 0;

    let tx = 0;
    let ty = 0;
    let tAmp = 0;
    let cx = 0;
    let cy = 0;
    let amp = 0;
    let raf = 0;
    let lastT = 0;
    let webOn = false;

    const measure = () => {
      pre.appendChild(gauge);
      gauge.textContent = 'M'.repeat(60);
      const w = gauge.getBoundingClientRect().width / 60;
      const cs = getComputedStyle(pre);
      pre.removeChild(gauge);
      let h = parseFloat(cs.lineHeight);
      if (!(h > 0)) h = (parseFloat(cs.fontSize) || 16) * 1.2;
      return { cw: w, ch: h };
    };

    const gx = (c) => offX + (c * stepX + 0.5) * cw;
    const gy = (r) => offY + (r * stepY + 0.5) * ch;

    const clearWeb = () => {
      if (!webOn) return;
      for (let i = 0; i < webLayers.length; i++) {
        if (webWrote[i] !== '') {
          webLayers[i].textContent = '';
          webWrote[i] = '';
        }
      }
      webOn = false;
    };

    const build = () => {
      const m = measure();
      const vw = pre.clientWidth || window.innerWidth;
      const vh = pre.clientHeight || window.innerHeight;
      if (!(m.cw > 1) || !(m.ch > 1) || !(vw > 8) || !(vh > 8)) {
        ready = false;
        return;
      }
      cw = m.cw;
      ch = m.ch;

      // Small glyphs get a coarser lattice so the sky reads the same on a phone
      stepX = Math.max(1, Math.round(17 / cw));
      stepY = Math.max(1, Math.round(19 / ch));
      cwE = cw * stepX;
      chE = ch * stepY;
      cols = Math.ceil(vw / cwE) + 1;
      rows = Math.ceil(vh / chE) + 1;
      const charCols = cols * stepX;
      const charRows = rows * stepY;
      offX = (vw - cols * cwE) / 2;
      offY = (vh - rows * chE) / 2;

      const dmin = Math.max(clamp(Math.sqrt(vw * vh) / 10.5, 68, 128), 3.5 * Math.max(cwE, chE));
      const rOut = dmin * 1.65;
      rIn = dmin * 0.5;
      rStar = dmin;

      const rnd = rng(SEED);
      const raw = poisson(vw, vh, dmin * 0.84, rnd);
      const seen = new Set();
      stars = [];
      for (let i = 0; i < raw.xs.length; i++) {
        const n = vnoise(raw.xs[i], raw.ys[i], dmin * 2.6);
        if (rnd() >= 0.4 + 0.62 * n) continue;
        const c = clamp(Math.round((raw.xs[i] - offX - 0.5 * cw) / cwE), 0, cols - 1);
        const r = clamp(Math.round((raw.ys[i] - offY - 0.5 * ch) / chE), 0, rows - 1);
        const key = r * cols + c;
        if (seen.has(key)) continue;
        seen.add(key);
        let pick = rnd() * 100;
        let sel = STAR_TABLE[0];
        for (let k = 0; k < STAR_TABLE.length; k++) {
          pick -= STAR_TABLE[k][2];
          if (pick <= 0) {
            sel = STAR_TABLE[k];
            break;
          }
        }
        stars.push({ c: c, r: r, x: gx(c), y: gy(r), g: sel[0], tone: sel[1] });
      }

      // Resting field, written once and never touched again
      const grids = [];
      for (let t = 0; t < TONES.length; t++) grids.push(null);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!grids[s.tone]) {
          const g = new Array(charRows);
          for (let r = 0; r < charRows; r++) g[r] = new Array(charCols).fill(' ');
          grids[s.tone] = g;
        }
        grids[s.tone][s.r * stepY][s.c * stepX] = s.g;
      }
      while (fieldWrap.firstChild) fieldWrap.removeChild(fieldWrap.firstChild);
      for (let t = 0; t < grids.length; t++) {
        if (!grids[t]) continue;
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;font:inherit;margin:0;padding:0;color:' + TONES[t];
        const lines = new Array(charRows);
        for (let r = 0; r < charRows; r++) lines[r] = grids[t][r].join('');
        el.textContent = lines.join('\n');
        fieldWrap.appendChild(el);
      }
      fieldWrap.style.transform = 'translate(' + offX.toFixed(2) + 'px,' + offY.toFixed(2) + 'px)';

      // Link graph. Each point keeps its nearest few within reach.
      const linkMax = dmin * 1.75;
      const pairs = new Set();
      edges = [];
      for (let i = 0; i < stars.length; i++) {
        const near = [];
        for (let j = 0; j < stars.length; j++) {
          if (j === i) continue;
          const dx = stars[j].x - stars[i].x;
          const dy = stars[j].y - stars[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= linkMax) near.push({ j: j, d: d });
        }
        near.sort((a, b) => a.d - b.d);
        for (let k = 0; k < Math.min(NEIGHBOURS, near.length); k++) {
          const a = Math.min(i, near[k].j);
          const b = Math.max(i, near[k].j);
          const key = a * 100000 + b;
          if (pairs.has(key)) continue;
          pairs.add(key);
          const A = stars[a];
          const B = stars[b];
          const n = Math.max(Math.abs(B.c - A.c), Math.abs(B.r - A.r));
          if (n < 2) continue;
          const run = [];
          for (let q = 1; q < n; q++) {
            const t = q / n;
            run.push([Math.round(A.c + (B.c - A.c) * t), Math.round(A.r + (B.r - A.r) * t)]);
          }
          if (!run.length) continue;
          edges.push({
            ax: A.x,
            ay: A.y,
            bx: B.x,
            by: B.y,
            g: linkGlyph(B.x - A.x, B.y - A.y),
            run: run,
            // Small per link spread so the web does not bloom all at once
            reach: rOut * (0.86 + 0.28 * hash(a, b, 7))
          });
        }
      }

      webWrap.style.transform = '';
      webOn = false;
      for (let i = 0; i < webLayers.length; i++) {
        webLayers[i].textContent = '';
        webWrote[i] = '';
      }
      ready = true;
      draw();
    };

    const draw = () => {
      if (!ready) return;
      if (amp <= 0.004) {
        clearWeb();
        return;
      }

      const hits = new Map();
      const put = (c, r, g, tone) => {
        const key = r * cols + c;
        const packed = (tone << 8) | g.charCodeAt(0);
        const prev = hits.get(key);
        if (prev === undefined || tone > prev >> 8) hits.set(key, packed);
      };

      let lc0 = 1e9;
      let lr0 = 1e9;
      let lc1 = -1e9;
      let lr1 = -1e9;
      const mark = (c, r) => {
        if (c < lc0) lc0 = c;
        if (c > lc1) lc1 = c;
        if (r < lr0) lr0 = r;
        if (r > lr1) lr1 = r;
      };

      for (let e = 0; e < edges.length; e++) {
        const ed = edges[e];
        const d = segDist(cx, cy, ed.ax, ed.ay, ed.bx, ed.by);
        if (d >= ed.reach) continue;
        let s = amp * smooth(ed.reach, rIn, d);
        if (calm) s = s >= 0.5 ? 1 : 0;
        if (s <= 0) continue;
        const run = ed.run;
        const n = run.length;
        for (let q = 0; q < n; q++) {
          const i = Math.min(q, n - 1 - q);
          const level = s * 4 - i * LINK_FADE;
          if (level < LINK_MIN) continue;
          put(run[q][0], run[q][1], ed.g, Math.min(LINK_TOP, Math.floor(level)));
          mark(run[q][0], run[q][1]);
        }
      }

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const dx = s.x - cx;
        const dy = s.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= rStar) continue;
        const f = amp * smooth(rStar, rStar * 0.22, d);
        let bump;
        if (calm) bump = f >= 0.8 ? 2 : f >= 0.4 ? 1 : 0;
        else bump = f * 2.2 >= 1 ? Math.min(2, Math.floor(f * 2.2)) : 0;
        if (!bump) continue;
        put(s.c, s.r, s.g, Math.min(TONES.length - 1, s.tone + bump));
        mark(s.c, s.r);
      }

      if (!hits.size) {
        clearWeb();
        return;
      }

      const bw = (lc1 - lc0 + 1) * stepX;
      const bh = (lr1 - lr0 + 1) * stepY;
      const used = [];
      for (let t = 0; t < TONES.length; t++) used.push(null);
      hits.forEach((v, key) => {
        const tone = v >> 8;
        if (!used[tone]) {
          const g = new Array(bh);
          for (let r = 0; r < bh; r++) g[r] = new Array(bw).fill(' ');
          used[tone] = g;
        }
        const c = key % cols;
        const r = (key - c) / cols;
        used[tone][(r - lr0) * stepY][(c - lc0) * stepX] = String.fromCharCode(v & 255);
      });

      webWrap.style.transform =
        'translate(' + (offX + lc0 * cwE).toFixed(2) + 'px,' + (offY + lr0 * chE).toFixed(2) + 'px)';
      for (let t = 0; t < TONES.length; t++) {
        let text = '';
        if (used[t]) {
          const lines = new Array(bh);
          for (let r = 0; r < bh; r++) lines[r] = used[t][r].join('');
          text = lines.join('\n');
        }
        if (webWrote[t] !== text) {
          webLayers[t].textContent = text;
          webWrote[t] = text;
        }
      }
      webOn = true;
    };

    // Lives only while something is still easing, then it is gone
    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
      lastT = now;
      const k = 1 - Math.exp(-dt / EASE_TAU);
      let moving = false;

      const dx = tx - cx;
      const dy = ty - cy;
      if (dx > SETTLE_PX || dx < -SETTLE_PX) {
        cx += dx * k;
        moving = true;
      } else cx = tx;
      if (dy > SETTLE_PX || dy < -SETTLE_PX) {
        cy += dy * k;
        moving = true;
      } else cy = ty;

      const da = tAmp - amp;
      if (da > AMP_SETTLE || da < -AMP_SETTLE) {
        amp += da * k;
        moving = true;
      } else amp = tAmp;

      draw();
      raf = moving ? requestAnimationFrame(frame) : 0;
    };

    const kick = () => {
      if (!ready) return;
      if (calm) {
        cx = tx;
        cy = ty;
        amp = tAmp;
        draw();
        return;
      }
      if (!raf) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const aim = (x, y) => {
      const box = pre.getBoundingClientRect();
      tx = x - box.left;
      ty = y - box.top;
      tAmp = 1;
      // A first touch starts where it landed instead of sliding in from a corner
      if (amp === 0 && !raf) {
        cx = tx;
        cy = ty;
      }
    };

    const onPointer = (e) => {
      aim(e.clientX, e.clientY);
      kick();
    };

    const onTouch = (e) => {
      const p = e.touches && e.touches[0];
      if (!p) return;
      aim(p.clientX, p.clientY);
      kick();
    };

    const onLeave = () => {
      tAmp = 0;
      kick();
    };

    let resizeT = 0;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        stop();
        build();
      }, 150);
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onLeave, { passive: true });
    window.addEventListener('touchcancel', onLeave, { passive: true });
    window.addEventListener('blur', onLeave, { passive: true });
    document.addEventListener('mouseleave', onLeave, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    if (mq && mq.addEventListener) {
      mq.addEventListener('change', (e) => {
        calm = e.matches;
        stop();
        cx = tx;
        cy = ty;
        amp = tAmp;
        draw();
      });
    }

    build();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        stop();
        build();
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
