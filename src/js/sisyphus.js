// Sisyphus under the Camus quote. A wireframe figure leans into a boulder and
// walks it up the hill, it slips near the top and drags him back down, he looks
// up for a moment, and it starts again.
(() => {
  'use strict';

  const canvas = document.getElementById('sisyphus-canvas');
  if (!canvas || !window.THREE) return;

  const SLOPE = (20 * Math.PI) / 180;
  const TAN = Math.tan(SLOPE);
  const U = { x: Math.cos(SLOPE), y: Math.sin(SLOPE) };
  const N = { x: -Math.sin(SLOPE), y: Math.cos(SLOPE) };

  const CLIMB = 6;
  const REACH = 2;
  const R = 0.7;
  const CREST = 8.6;
  const THIGH = 0.52;
  const SHIN = 0.52;
  const UPPER = 0.31;
  const FORE = 0.31;
  const TORSO = 0.6;
  const STRIDE = 0.45;
  const CYCLE = 13;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  const crestX = CREST * U.x;
  const crestY = CREST * U.y;

  // Valley floor, then the slope, then the flat top he never reaches
  function ground(x) {
    if (x < -1) return -TAN;
    if (x > crestX) return crestY;
    return x * TAN;
  }

  const slopeAt = (x) => (x < -1 || x > crestX ? 0 : SLOPE);

  function timeline(t) {
    const tt = t % CYCLE;
    if (tt < 9.2) return { s: CLIMB * smooth(tt / 9.2), phase: 'push' };
    if (tt < 9.9) return { s: CLIMB, phase: 'strain' };
    if (tt < 12.2) return { s: CLIMB * (1 - smooth((tt - 9.9) / 2.3)), phase: 'slide' };
    return { s: 0, phase: 'rest' };
  }

  // Two bone reach in the side plane, bend picks which way the middle joint folds
  function reach(ax, ay, tx, ty, l1, l2, bend) {
    const dx = tx - ax;
    const dy = ty - ay;
    const d = clamp(Math.hypot(dx, dy), 1e-4, l1 + l2 - 1e-4);
    const base = Math.atan2(dy, dx);
    const open = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const a1 = base + bend * open;
    const jx = ax + l1 * Math.cos(a1);
    const jy = ay + l1 * Math.sin(a1);
    return [a1, Math.atan2(ty - jy, tx - jx), jx, jy];
  }

  /* Scene ---------------------------------------------------------------- */

  let renderer, scene, camera;
  let rig, torso, head, boulder, dustGeo;
  const legs = [];
  const arms = [];
  const camTarget = new THREE.Vector3();
  const state = { s: 0, gait: 0, lean: 1, look: 0, drive: 1, relax: 0 };

  const lineMat = (hex) => new THREE.LineBasicMaterial({ color: hex });
  const edges = (geometry, material) => new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), material);

  // A limb segment that starts at its joint and points along +x
  function bone(length, r0, r1, material) {
    const g = new THREE.CylinderGeometry(r1, r0, length, 5, 1);
    g.rotateZ(-Math.PI / 2);
    g.translate(length / 2, 0, 0);
    const pivot = new THREE.Group();
    pivot.add(edges(g, material));
    return pivot;
  }

  function buildHill() {
    const xs = [];
    for (let x = -9; x <= 15; x += 0.5) xs.push(x);
    xs.push(-1, crestX);
    xs.sort((a, b) => a - b);

    const depth = [-1.8, -0.9, 0, 0.9, 1.8];
    const pos = [];
    const col = [];
    // Lines fade out toward the edges of the shot
    const shade = (x) => 0.06 + 0.22 * (1 - smooth(clamp(Math.abs(x - 3.5) / 11, 0, 1)));
    const seg = (x1, z1, x2, z2) => {
      pos.push(x1, ground(x1), z1, x2, ground(x2), z2);
      const c1 = shade(x1);
      const c2 = shade(x2);
      col.push(c1, c1, c1, c2, c2, c2);
    };
    for (const z of depth) {
      for (let i = 0; i < xs.length - 1; i++) seg(xs[i], z, xs[i + 1], z);
    }
    for (let x = -9; x <= 15; x += 0.75) seg(x, depth[0], x, depth[depth.length - 1]);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true }));
  }

  // Two faint ridgelines far behind the hill
  function buildRidges() {
    const group = new THREE.Group();
    [[-20, 0x1a1a1a, 0], [-32, 0x111111, 2.1]].forEach(([z, color, seed]) => {
      const pts = [];
      for (let x = -30; x <= 40; x += 1.4) {
        const h = 3.2 + 1.5 * Math.sin(x * 0.29 + seed) + 0.8 * Math.sin(x * 0.83 + seed * 3) + 0.35 * Math.sin(x * 2.1);
        pts.push(new THREE.Vector3(x, h - 1.5, z));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color)));
    });
    return group;
  }

  function buildFigure() {
    rig = new THREE.Group();
    const near = lineMat(0xe5e5e5);
    const back = lineMat(0x737373);

    const torsoGeo = new THREE.CylinderGeometry(0.2, 0.14, TORSO, 4, 1);
    torsoGeo.rotateY(Math.PI / 4);
    torsoGeo.translate(0, TORSO / 2, 0);
    torso = edges(torsoGeo, near);
    rig.add(torso);

    head = edges(new THREE.IcosahedronGeometry(0.15, 0), near);
    rig.add(head);

    [[-1, back], [1, near]].forEach(([side, mat]) => {
      const footGeo = new THREE.BoxGeometry(0.22, 0.06, 0.09);
      footGeo.translate(0.05, -0.03, 0);
      const foot = edges(footGeo, mat);
      const leg = { z: 0.11 * side, thigh: bone(THIGH, 0.075, 0.055, mat), shin: bone(SHIN, 0.055, 0.04, mat), foot };
      const arm = { z: 0.18 * side, upper: bone(UPPER, 0.05, 0.04, mat), fore: bone(FORE, 0.04, 0.03, mat) };
      rig.add(leg.thigh, leg.shin, leg.foot, arm.upper, arm.fore);
      legs.push(leg);
      arms.push(arm);
    });
    return rig;
  }

  /* Dust ----------------------------------------------------------------- */

  const DUST = 60;
  const dustPos = new Float32Array(DUST * 3);
  const dustCol = new Float32Array(DUST * 3);
  const dustVel = new Float32Array(DUST * 3);
  const dustAge = new Float32Array(DUST).fill(1);
  let dustNext = 0;

  function buildDust() {
    for (let i = 0; i < DUST; i++) dustPos[i * 3 + 1] = -100;
    dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
    return new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true }));
  }

  function kick(x, y, z) {
    const i = dustNext;
    dustNext = (dustNext + 1) % DUST;
    dustPos[i * 3] = x;
    dustPos[i * 3 + 1] = y;
    dustPos[i * 3 + 2] = z;
    dustVel[i * 3] = 0.3 + Math.random() * 0.6;
    dustVel[i * 3 + 1] = 0.3 + Math.random() * 0.7;
    dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
    dustAge[i] = 0;
  }

  function settleDust(dt) {
    for (let i = 0; i < DUST; i++) {
      const o = i * 3;
      if (dustAge[i] >= 1) {
        dustPos[o + 1] = -100;
        continue;
      }
      dustAge[i] = Math.min(1, dustAge[i] + dt / 0.9);
      dustVel[o + 1] -= 1.6 * dt;
      dustPos[o] += dustVel[o] * dt;
      dustPos[o + 1] += dustVel[o + 1] * dt;
      dustPos[o + 2] += dustVel[o + 2] * dt;
      const c = 0.6 * (1 - dustAge[i]);
      dustCol[o] = dustCol[o + 1] = dustCol[o + 2] = c;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
  }

  /* Pose ----------------------------------------------------------------- */

  function pose(t, dt) {
    const { s, phase } = timeline(t);
    const ds = s - state.s;
    state.s = s;

    const rx = s * U.x;
    const ry = s * U.y;
    rig.position.set(rx, ry, 0);

    if (phase === 'push' && ds > 0) state.gait = (state.gait + ds / (STRIDE / 0.6)) % 1;

    const k = 1 - Math.exp(-dt * 5);
    const lean = { push: 1.0, strain: 1.08, slide: 0.55, rest: 0.22 }[phase];
    state.lean += (lean - state.lean) * k;
    state.look += ((phase === 'rest' ? 0.5 : 0) - state.look) * k;
    const pushing = phase === 'push' || phase === 'strain';
    state.drive += ((pushing ? 1 : 0) - state.drive) * k;
    state.relax += ((phase === 'rest' ? 1 : 0) - state.relax) * k;

    const shake = phase === 'strain' ? Math.sin(t * 70) * 0.012 : 0;
    const bob = -Math.abs(Math.sin(state.gait * Math.PI * 2)) * 0.03 * state.drive;
    // Hips drop a little into the push and rise when he stands
    const hx = -0.04 + shake;
    const hy = 0.97 - 0.09 * state.drive + bob;

    torso.position.set(hx, hy, 0);
    torso.rotation.z = -state.lean;
    const sx = hx + TORSO * Math.sin(state.lean);
    const sy = hy + TORSO * Math.cos(state.lean);
    const tilt = state.lean * 0.8 - state.look;
    head.position.set(sx + 0.21 * Math.sin(tilt), sy + 0.21 * Math.cos(tilt), 0);
    head.rotation.z = -tilt;

    // The boulder rides the slope ahead of him and rolls as it goes
    const along = s + REACH;
    const cx = along * U.x + R * N.x;
    const cy = along * U.y + R * N.y;
    boulder.position.set(cx, cy, 0);
    boulder.rotation.z = -along / R;

    const lx = cx - rx;
    const ly = cy - ry;
    const dx = sx - lx;
    const dy = sy - ly;
    const d = Math.hypot(dx, dy) || 1;
    // Palms on the stone, or hanging loose while he stops to look up
    const palmX = lx + (dx / d) * (R + 0.02);
    const palmY = ly + (dy / d) * (R + 0.02);
    const handX = palmX + (sx + 0.12 - palmX) * state.relax;
    const handY = palmY + (sy - 0.58 - palmY) * state.relax;

    for (const arm of arms) {
      const [a1, a2, ex, ey] = reach(sx, sy, handX, handY, UPPER, FORE, -1);
      arm.upper.position.set(sx, sy, arm.z);
      arm.upper.rotation.z = a1;
      arm.fore.position.set(ex, ey, arm.z);
      arm.fore.rotation.z = a2;
    }

    legs.forEach((leg, i) => {
      const ph = (state.gait + i * 0.5) % 1;
      let off;
      let lift = 0;
      if (ph < 0.6) {
        off = STRIDE / 2 - STRIDE * (ph / 0.6);
      } else {
        const q = (ph - 0.6) / 0.4;
        off = -STRIDE / 2 + STRIDE * smooth(q);
        lift = Math.sin(q * Math.PI) * 0.12 * state.drive;
      }
      const fx = -0.25 * state.drive + off * (0.35 + 0.65 * state.drive);
      const fy = ground(rx + fx) - ry + lift + 0.06;

      const [a1, a2, kx, ky] = reach(hx, hy, fx, fy, THIGH, SHIN, 1);
      leg.thigh.position.set(hx, hy, leg.z);
      leg.thigh.rotation.z = a1;
      leg.shin.position.set(kx, ky, leg.z);
      leg.shin.rotation.z = a2;
      leg.foot.position.set(fx, fy, leg.z);
      leg.foot.rotation.z = slopeAt(rx + fx);

      // Heels dragging on the way down throw up dust
      const dragging = (phase === 'slide' && ds < -0.004) || phase === 'strain';
      if (dragging && Math.random() < (phase === 'slide' ? 0.6 : 0.12)) kick(rx + fx, ry + fy - 0.05, leg.z);
    });

    settleDust(dt);

    const tx = 2.4 + rx * 0.45;
    const ty = 1.2 + ry * 0.55;
    const c = 1 - Math.exp(-dt * 1.5);
    camTarget.x += (tx - camTarget.x) * c;
    camTarget.y += (ty - camTarget.y) * c;
    // Closer on wide canvases, back off when narrow so the boulder stays in frame
    const dist = camera.aspect < 2 ? 10 : 8.5;
    camera.position.set(camTarget.x + Math.sin(t * 0.12) * 2.2, camTarget.y + 1.1, dist);
    camera.lookAt(camTarget);
  }

  /* Run ------------------------------------------------------------------ */

  let running = false;
  let visible = false;
  let raf = 0;
  let last = 0;
  let clock = 0;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 2.5, 0.1, 100);

    scene.add(buildRidges(), buildHill(), buildFigure(), buildDust());
    boulder = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R, 1)),
      lineMat(0xd4d4d4)
    );
    scene.add(boulder);

    camTarget.set(2.4, 1.2, 0);
    new ResizeObserver(resize).observe(canvas);
    resize();

    if (calm.matches) {
      // One still frame, mid climb
      for (let i = 0; i < 30; i++) pose(4.5, 0.1);
      renderer.render(scene, camera);
      return;
    }
    start();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    clock += dt;
    pose(clock, dt);
    renderer.render(scene, camera);
  }

  function start() {
    if (running || !visible || calm.matches) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Only build once it is on screen, and only animate while it stays there
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!visible) {
      stop();
      return;
    }
    if (!renderer) init();
    else start();
  }).observe(canvas);
})();
