// Intro scene. The terminal is painted onto the tube of a CRT in a low poly
// room, then the camera dives through the glass as the site loads in.
(() => {
  // label, width in units, character the key emits
  const LAYOUT = [
    [['`', 1, '`'], ['1', 1, '1'], ['2', 1, '2'], ['3', 1, '3'], ['4', 1, '4'], ['5', 1, '5'],
    ['6', 1, '6'], ['7', 1, '7'], ['8', 1, '8'], ['9', 1, '9'], ['0', 1, '0'], ['-', 1, '-'],
    ['=', 1, '='], ['bksp', 2, null]],
    [['tab', 1.5, null], ['q', 1, 'q'], ['w', 1, 'w'], ['e', 1, 'e'], ['r', 1, 'r'], ['t', 1, 't'],
    ['y', 1, 'y'], ['u', 1, 'u'], ['i', 1, 'i'], ['o', 1, 'o'], ['p', 1, 'p'], ['[', 1, '['],
    [']', 1, ']'], ['\\', 1.5, '\\']],
    [['caps', 1.75, null], ['a', 1, 'a'], ['s', 1, 's'], ['d', 1, 'd'], ['f', 1, 'f'], ['g', 1, 'g'],
    ['h', 1, 'h'], ['j', 1, 'j'], ['k', 1, 'k'], ['l', 1, 'l'], [';', 1, ';'], ["'", 1, "'"],
    ['enter', 2.25, '\n']],
    [['shift', 2.25, 'SHIFT'], ['z', 1, 'z'], ['x', 1, 'x'], ['c', 1, 'c'], ['v', 1, 'v'],
    ['b', 1, 'b'], ['n', 1, 'n'], ['m', 1, 'm'], [',', 1, ','], ['.', 1, '.'], ['/', 1, '/'],
    ['shift', 2.75, null]],
    [['ctrl', 1.5, null], ['alt', 1.25, null], ['meta', 1.5, null], ['', 6.5, ' '],
    ['meta', 1.5, null], ['alt', 1.25, null], ['ctrl', 1.5, null]]
  ];

  // Symbols reached through shift, mapped to the key they sit on
  const SHIFTED = {
    '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7',
    '*': '8', '(': '9', ')': '0', '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\',
    ':': ';', '"': "'", '<': ',', '>': '.', '?': '/'
  };

  const TEX_W = 1024;
  const TEX_H = 768;

  const REF_ASPECT = 16 / 9;

  const SCREEN_AT = { x: 0, y: 0.67, z: 0.09 };

  const SHOTS = {
    dark:   { pos: [0, 0.94, 2.32], look: [0, 0.60, 0.00], fov: 42, tilt: 1 },
    boot:   { pos: [0, 0.84, 1.70], look: [0, 0.62, 0.06], fov: 37, tilt: 1 },
    typing: { pos: [0, 0.80, 1.50], look: [0, 0.54, 0.16], fov: 36, tilt: 0.6 },
    align:  { pos: [0, SCREEN_AT.y, 0.80], look: [0, SCREEN_AT.y, SCREEN_AT.z], fov: 30, tilt: 0 },
    dive:   { pos: [0, SCREEN_AT.y, 0.22], look: [0, SCREEN_AT.y, SCREEN_AT.z], fov: 26, tilt: 0 }
  };

  const keyMeshes = new Map();

  let overlay, canvas;
  let renderer, scene, camera, screenLight;
  let screenTex;
  let paint, paintCtx;
  let dust;
  let raf = 0;
  let ready = false;

  // boot ramps the tube up, blow washes it out on the way through
  const state = { boot: 0, bootAt: 0, blow: 0, blowAt: 0, dirty: true, caretOn: true };

  const shot = {
    pos: new THREE.Vector3(), look: new THREE.Vector3(),
    from: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 },
    to: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 },
    t: 1, dur: 1, fov: 40, tilt: 1
  };

  const smooth = (t) => t * t * (3 - 2 * t);
  const DEG = Math.PI / 360;
  const MAX_FOV = 68;
  const framed = new THREE.Vector3();
  const aim = new THREE.Vector3();

  // Shots are composed for 16:9. A portrait viewport widens the lens to a
  // limit, crops in, then backs off for the rest, so the machine keeps filling
  // the frame instead of shrinking into it.
  function frameShot(pos, look, baseFov) {
    if (camera.aspect >= REF_ASPECT) {
      camera.fov = baseFov;
      framed.copy(pos);
      camera.updateProjectionMatrix();
      return;
    }

    const want = Math.tan(baseFov * DEG) * REF_ASPECT;
    const fov = Math.min(MAX_FOV, Math.atan(want / camera.aspect) / DEG);
    const have = Math.tan(fov * DEG) * camera.aspect;
    const crop = 0.70 + 0.30 * (camera.aspect / REF_ASPECT);
    camera.fov = fov;
    framed.copy(pos).sub(look).multiplyScalar(Math.max(1, want / have) * crop).add(look);
    camera.updateProjectionMatrix();
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  /* Scene ------------------------------------------------------------- */

  function flat(color, opts) {
    // No flatShading here. Lambert does not support it in r128, and its per
    // vertex falloff on these big low poly walls is what keeps the room dark.
    return new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  }

  function box(w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }

  // Files in `art` load after the first paint and trigger a repaint.
  function painted(w, h, draw, art) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const loaded = {};
    draw(ctx, w, h, loaded);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;

    if (art) {
      Object.keys(art).forEach((key) => {
        const img = new Image();
        img.onload = () => {
          loaded[key] = img;
          draw(ctx, w, h, loaded);
          tex.needsUpdate = true;
        };
        img.onerror = () => {};
        img.src = art[key];
      });
    }

    return new THREE.MeshLambertMaterial({ map: tex });
  }

  function voxelArt(size, cell, paint) {
    return painted(size * cell, size * cell, (ctx) => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          ctx.fillStyle = paint(x, y);
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    });
  }

  // Deterministic, so blocks look the same on every load
  function grain(x, y, seed) {
    const n = Math.sin((x * 12.9898 + y * 78.233 + seed) * 43758.5453);
    return n - Math.floor(n);
  }

  function shade(hex, amount) {
    const r = Math.max(0, Math.min(255, ((hex >> 16) & 255) + amount));
    const g = Math.max(0, Math.min(255, ((hex >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (hex & 255) + amount));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Four sided frustum along Z, the shape of a picture tube
  function tube(frontHalfW, backHalfW, length, squash) {
    const g = new THREE.CylinderGeometry(frontHalfW / 0.7071, backHalfW / 0.7071, length, 4, 1);
    g.rotateY(Math.PI / 4);
    g.rotateX(Math.PI / 2);
    g.scale(1, squash, 1);
    return g;
  }

  function buildRoom(root) {
    const wall = flat(0x1b2027);
    const floor = flat(0x090b0d);

    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 12, 8, 7), floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.78;
    root.add(floorMesh);

    root.add(box(14, 4, 0.1, wall, 0, 1.2, -1.45));
    root.add(box(0.1, 4, 12, wall, -3.1, 1.2, 0));

    const wx = -1.78;
    const wy = 0.98;
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.68),
      new THREE.MeshBasicMaterial({ color: 0x1d3358 })
    );
    pane.position.set(wx, wy, -1.394);
    root.add(pane);

    const frame = flat(0x191d23);
    root.add(box(0.96, 0.05, 0.05, frame, wx, wy + 0.365, -1.38));
    root.add(box(0.96, 0.07, 0.07, frame, wx, wy - 0.375, -1.37));
    root.add(box(0.05, 0.78, 0.05, frame, wx - 0.455, wy, -1.38));
    root.add(box(0.05, 0.78, 0.05, frame, wx + 0.455, wy, -1.38));
    root.add(box(0.035, 0.68, 0.035, frame, wx, wy, -1.385));
    root.add(box(0.88, 0.035, 0.035, frame, wx, wy, -1.385));

    const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.86), arpanetPoster());
    poster.position.set(1.34, 1.06, -1.39);
    poster.rotation.z = -0.012;
    root.add(poster);
    root.add(box(0.70, 0.90, 0.012, flat(0x14171c), 1.34, 1.06, -1.398));

    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.30), helloCard());
    card.position.set(-1.02, 0.46, -1.392);
    card.rotation.z = 0.03;
    root.add(card);

    const saga = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 0.88), starWarsPoster());
    saga.position.set(2.01, 1.00, -1.39);
    root.add(saga);
    root.add(box(0.64, 0.92, 0.012, flat(0x14171c), 2.01, 1.00, -1.398));

    const show = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.728), regularShowPoster());
    show.position.set(-1.04, 1.18, -1.392);
    show.rotation.z = -0.018;
    root.add(show);
    const tape = new THREE.MeshLambertMaterial({ color: 0xdad6c8, transparent: true, opacity: 0.55 });
    [[-0.24, 0.345], [0.24, 0.345], [-0.24, -0.345], [0.24, -0.345]].forEach((c) => {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), tape);
      t.position.set(-1.04 + c[0], 1.18 + c[1], -1.390);
      t.rotation.z = c[0] * c[1] > 0 ? 0.7 : -0.7;
      root.add(t);
    });
  }

  function regularShowPoster() {
    return painted(514, 720, (ctx, w, h, art) => {
      if (art.poster) {
        ctx.drawImage(art.poster, 0, 0, w, h);
        return;
      }
      ctx.fillStyle = '#cfd6d9';
      ctx.fillRect(0, 0, w, h);
    }, { poster: './assets/regular-show.jpg' });
  }

  /* Things worth putting on a wall ------------------------------------- */

  function arpanetPoster() {
    // Real sites off the 1977 map
    const NODES = [
      ['SRI', 0.13, 0.30], ['AMES', 0.09, 0.44], ['STANFORD', 0.20, 0.42],
      ['UCSB', 0.11, 0.58], ['UCLA', 0.18, 0.68], ['RAND', 0.27, 0.76],
      ['SDC', 0.35, 0.82], ['ISI', 0.31, 0.64], ['XEROX', 0.26, 0.52],
      ['UTAH', 0.30, 0.24], ['ILLINOIS', 0.46, 0.32], ['CASE', 0.56, 0.22],
      ['CMU', 0.64, 0.30], ['RADC', 0.70, 0.17], ['MIT', 0.82, 0.20],
      ['LINCOLN', 0.90, 0.28], ['BBN', 0.86, 0.37], ['HARVARD', 0.76, 0.36],
      ['ARPA', 0.68, 0.58], ['MITRE', 0.79, 0.54], ['NBS', 0.71, 0.70],
      ['ETAC', 0.62, 0.74]
    ];
    const EDGES = [
      [0, 1], [0, 2], [0, 9], [1, 3], [2, 8], [3, 4], [4, 5], [4, 7],
      [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [10, 18],
      [11, 12], [12, 13], [12, 17], [13, 14], [14, 15], [14, 16],
      [15, 16], [16, 17], [17, 19], [18, 19], [18, 21], [19, 20], [20, 21]
    ];

    return painted(680, 900, (ctx, w, h) => {
      ctx.fillStyle = '#d9d3c3';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#2f3238';
      ctx.lineWidth = 3;
      ctx.strokeRect(22, 22, w - 44, h - 44);

      ctx.fillStyle = '#23262b';
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px "Courier New", monospace';
      ctx.fillText('ARPANET LOGICAL MAP', w / 2, 92);
      ctx.font = '21px "Courier New", monospace';
      ctx.fillText('MARCH 1977', w / 2, 124);

      const x0 = 60;
      const y0 = 190;
      const mw = w - 120;
      const mh = h - 300;
      const px = (n) => x0 + n[1] * mw;
      const py = (n) => y0 + n[2] * mh;

      ctx.strokeStyle = 'rgba(35, 38, 43, 0.75)';
      ctx.lineWidth = 2;
      EDGES.forEach((e) => {
        ctx.beginPath();
        ctx.moveTo(px(NODES[e[0]]), py(NODES[e[0]]));
        ctx.lineTo(px(NODES[e[1]]), py(NODES[e[1]]));
        ctx.stroke();
      });

      ctx.font = '15px "Courier New", monospace';
      NODES.forEach((n) => {
        const x = px(n);
        const y = py(n);
        ctx.fillStyle = '#d9d3c3';
        ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.strokeStyle = '#23262b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = '#23262b';
        ctx.fillText(n[0], x, y - 14);
      });

      ctx.font = '15px "Courier New", monospace';
      ctx.fillStyle = 'rgba(35, 38, 43, 0.8)';
      ctx.fillText('PLEASE NOTE THAT WHILE THIS MAP SHOWS THE HOST', w / 2, h - 108);
      ctx.fillText('POPULATION OF THE NETWORK ACCORDING TO THE BEST', w / 2, h - 86);
      ctx.fillText('INFORMATION OBTAINABLE, NO CLAIM CAN BE MADE', w / 2, h - 64);
      ctx.fillText('FOR ITS ACCURACY.', w / 2, h - 42);
    });
  }

  function helloCard() {
    return painted(420, 300, (ctx, w, h) => {
      ctx.fillStyle = '#efece2';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(40, 40, 40, 0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#20242a';
      ctx.textAlign = 'left';
      ctx.font = '26px "Courier New", monospace';
      const lines = [
        '#include <stdio.h>',
        '',
        'main()',
        '{',
        '    printf("hello, world\\n");',
        '}'
      ];
      lines.forEach((line, i) => ctx.fillText(line, 34, 68 + i * 36));
    });
  }

  function starWarsPoster() {
    return painted(512, 751, (ctx, w, h, art) => {
      if (art.poster) {
        ctx.drawImage(art.poster, 0, 0, w, h);
        return;
      }
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, w, h);
    }, { poster: './assets/star-wars.jpg' });
  }

  /* The machine --------------------------------------------------------- */

  function buildDesk(root) {
    const top = flat(0x2e2419);
    const leg = flat(0x1d1710);
    root.add(box(3.4, 0.06, 1.5, top, 0, -0.03, -0.1));
    [-1.55, 1.55].forEach((x) => {
      [-0.72, 0.52].forEach((z) => root.add(box(0.08, 0.72, 0.08, leg, x, -0.42, z)));
    });
  }

  function buildMonitor(root) {
    const plastic = flat(0xb3a68c);
    const dark = flat(0x2b2721);
    const group = new THREE.Group();
    group.position.set(0, 0.58, -0.16);

    const body = new THREE.Mesh(tube(0.47, 0.33, 0.46, 0.915), plastic);
    group.add(body);

    // Four bars, so the glass reads as recessed
    const fz = 0.28;
    group.add(box(0.94, 0.07, 0.10, plastic, 0, 0.395, fz));
    group.add(box(0.94, 0.25, 0.10, plastic, 0, -0.305, fz));
    group.add(box(0.11, 0.54, 0.10, plastic, -0.415, 0.09, fz));
    group.add(box(0.11, 0.54, 0.10, plastic, 0.415, 0.09, fz));

    group.add(box(0.30, 0.012, 0.02, dark, 0, 0.425, fz + 0.045));
    group.add(box(0.16, 0.03, 0.02, dark, -0.30, -0.32, fz + 0.045));
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    lamp.position.set(0.33, -0.32, fz + 0.05);
    group.add(lamp);
    [0.10, 0.17].forEach((x) => {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8), dark);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(x, -0.32, fz + 0.048);
      group.add(knob);
    });

    paint = document.createElement('canvas');
    paint.width = TEX_W;
    paint.height = TEX_H;
    paintCtx = paint.getContext('2d');
    screenTex = new THREE.CanvasTexture(paint);
    screenTex.minFilter = THREE.LinearFilter;
    screenTex.magFilter = THREE.LinearFilter;
    if (THREE.sRGBEncoding) screenTex.encoding = THREE.sRGBEncoding;

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.54),
      new THREE.MeshBasicMaterial({ map: screenTex })
    );
    glass.position.set(0, 0.09, 0.25);
    group.add(glass);

    // The only light in the scene
    screenLight = new THREE.PointLight(0xf2f2f2, 0, 7, 2);
    screenLight.position.set(SCREEN_AT.x, SCREEN_AT.y, SCREEN_AT.z + 0.28);
    root.add(screenLight);

    stickNotes(group);

    root.add(group);
    return group;
  }

  function buildDesktopCase(root) {
    const plastic = flat(0xb3a68c);
    const dark = flat(0x2b2721);
    root.add(box(0.92, 0.13, 0.56, plastic, 0, 0.065, -0.16));
    root.add(box(0.20, 0.02, 0.01, dark, 0.22, 0.075, 0.125));
    root.add(box(0.05, 0.05, 0.01, dark, -0.30, 0.06, 0.125));
    root.add(box(0.34, 0.012, 0.01, dark, -0.02, 0.03, 0.125));
  }

  function buildKeyboard(root) {
    const shell = flat(0xb3a68c);
    const cap = flat(0xc4b89e);
    const group = new THREE.Group();
    group.position.set(0, 0.012, 0.44);
    group.rotation.x = -0.075;

    group.add(box(0.66, 0.024, 0.22, shell, 0, 0, 0));

    const unit = 0.0387;
    const gap = 0.004;
    const rowPitch = 0.036;
    const top = -rowPitch * (LAYOUT.length - 1) / 2;

    LAYOUT.forEach((row, r) => {
      let x = -0.29;
      row.forEach((k) => {
        const u = k[1];
        const char = k[2];
        const kw = u * unit - gap;
        const key = box(kw, 0.014, 0.030, cap, x + kw / 2, 0.019, top + r * rowPitch);
        key.userData.rest = key.position.y;
        key.userData.hit = 0;
        group.add(key);
        if (char && !keyMeshes.has(char)) keyMeshes.set(char, key);
        x += u * unit;
      });
    });

    root.add(group);
  }

  /* The shelf, such as it is ------------------------------------------- */

  function centred(ctx, lines, x, y, step) {
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * step));
  }

  function ddiaCover() {
    return painted(340, 460, (ctx, w, h) => {
      ctx.fillStyle = '#fbfbf8';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1f8a8a';
      ctx.lineWidth = 7;
      ctx.strokeRect(11, 11, w - 22, h - 22);

      ctx.fillStyle = '#26302f';
      ctx.beginPath();
      ctx.ellipse(w / 2, 138, 86, 50, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2 + 62, 118);
      ctx.quadraticCurveTo(w / 2 + 116, 108, w / 2 + 124, 140);
      ctx.quadraticCurveTo(w / 2 + 112, 158, w / 2 + 70, 156);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2 + 58, 96);
      ctx.lineTo(w / 2 + 76, 68);
      ctx.lineTo(w / 2 + 86, 100);
      ctx.closePath();
      ctx.fill();
      [-58, -24, 26, 58].forEach((dx) => ctx.fillRect(w / 2 + dx, 176, 15, 52));

      ctx.fillStyle = '#1f8a8a';
      ctx.fillRect(34, 258, w - 68, 5);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#1a1d21';
      ctx.font = 'bold 31px Georgia, serif';
      centred(ctx, ['Designing', 'Data-Intensive', 'Applications'], w / 2, 302, 36);

      ctx.fillStyle = '#5b6169';
      ctx.font = '13px Georgia, serif';
      centred(ctx, ['THE BIG IDEAS BEHIND RELIABLE,', 'SCALABLE, AND MAINTAINABLE SYSTEMS'], w / 2, 400, 18);

      ctx.fillStyle = '#1a1d21';
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText('Martin Kleppmann', w / 2, 438);
    });
  }

  function ddiaSpine() {
    return painted(560, 104, (ctx, w, h) => {
      ctx.fillStyle = '#fbfbf8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1f8a8a';
      ctx.fillRect(0, 0, w, 7);
      ctx.fillRect(0, h - 7, w, 7);
      ctx.fillStyle = '#1a1d21';
      ctx.textAlign = 'left';
      ctx.font = 'bold 33px Georgia, serif';
      ctx.fillText('Designing Data-Intensive Applications', 20, 68);
      ctx.textAlign = 'right';
      ctx.font = 'bold 23px Georgia, serif';
      ctx.fillText(String.fromCharCode(79, 39) + 'REILLY', w - 20, 68);
    });
  }

  function strangCover() {
    return painted(340, 460, (ctx, w, h) => {
      ctx.fillStyle = '#f6f5f0';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#123a6b';
      ctx.fillRect(0, 0, w, 96);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Georgia, serif';
      centred(ctx, ['INTRODUCTION', 'TO LINEAR ALGEBRA'], w / 2, 42, 34);

      const ox = w / 2 - 42;
      const oy = 300;
      [['#c8342b', 96, -84], ['#1f8a8a', 116, 8], ['#d09a1e', 34, -114]].forEach((arrow) => {
        const col = arrow[0];
        const dx = arrow[1];
        const dy = arrow[2];
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + dx, oy + dy);
        ctx.stroke();
        const a = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(ox + dx, oy + dy);
        ctx.lineTo(ox + dx - 17 * Math.cos(a - 0.42), oy + dy - 17 * Math.sin(a - 0.42));
        ctx.lineTo(ox + dx - 17 * Math.cos(a + 0.42), oy + dy - 17 * Math.sin(a + 0.42));
        ctx.closePath();
        ctx.fill();
      });

      ctx.fillStyle = '#123a6b';
      ctx.font = 'bold 25px Georgia, serif';
      ctx.fillText('GILBERT STRANG', w / 2, 400);
      ctx.fillStyle = '#5b6169';
      ctx.font = '15px Georgia, serif';
      ctx.fillText('FIFTH EDITION', w / 2, 428);
    });
  }

  function strangSpine() {
    return painted(560, 104, (ctx, w, h) => {
      ctx.fillStyle = '#123a6b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.font = 'bold 32px Georgia, serif';
      ctx.fillText('INTRODUCTION TO LINEAR ALGEBRA', 20, 67);
      ctx.textAlign = 'right';
      ctx.font = '25px Georgia, serif';
      ctx.fillText('STRANG', w - 20, 67);
    });
  }

  function ctciCover() {
    return painted(340, 460, (ctx, w, h) => {
      ctx.fillStyle = '#f4f2ec';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1c6f7a';
      ctx.fillRect(0, 128, w, 8);
      ctx.fillRect(0, 296, w, 8);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#5b6169';
      ctx.font = '16px Georgia, serif';
      ctx.fillText('6TH EDITION', w / 2, 66);
      ctx.fillStyle = '#1c6f7a';
      ctx.font = '15px "Courier New", monospace';
      ctx.fillText('189 PROGRAMMING QUESTIONS', w / 2, 98);
      ctx.fillText('AND SOLUTIONS', w / 2, 118);

      ctx.fillStyle = '#15181c';
      ctx.font = 'italic 33px Georgia, serif';
      ctx.fillText('Cracking', w / 2, 186);
      ctx.font = 'bold 35px Georgia, serif';
      centred(ctx, ['the CODING', 'INTERVIEW'], w / 2, 232, 44);

      ctx.fillStyle = '#15181c';
      ctx.font = 'bold 19px Georgia, serif';
      centred(ctx, ['GAYLE LAAKMANN', 'McDOWELL'], w / 2, 372, 26);
      ctx.fillStyle = '#5b6169';
      ctx.font = '13px Georgia, serif';
      ctx.fillText('FOUNDER AND CEO, CAREERCUP.COM', w / 2, 424);
    });
  }

  function buildLibrary(root) {
    const pages = flat(0xe8e2d2);
    const bw = 0.185;
    const bd = 0.245;

    const ddia = new THREE.Mesh(
      new THREE.BoxGeometry(bw, 0.040, bd),
      [pages, pages, ddiaCover(), pages, ddiaSpine(), pages]
    );
    ddia.position.set(-0.76, 0.020, 0.30);
    ddia.rotation.y = 0.07;
    root.add(ddia);

    const strang = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.94, 0.036, bd * 0.95),
      [pages, pages, strangCover(), pages, strangSpine(), pages]
    );
    strang.position.set(-0.75, 0.058, 0.295);
    strang.rotation.y = -0.05;
    root.add(strang);

    const ctci = new THREE.Mesh(
      new THREE.BoxGeometry(bw, 0.245, 0.034),
      [pages, flat(0x1c6f7a), pages, pages, ctciCover(), pages]
    );
    ctci.position.set(-0.69, 0.122, 0.02);
    ctci.rotation.set(0, 0.17, -0.10);
    root.add(ctci);
  }

  function buildProps(root) {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.038, 0.10, 8),
      flat(0x8d3f34)
    );
    mug.position.set(0.80, 0.05, 0.19);
    root.add(mug);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.11, 6), flat(0x6b4a35));
    pot.position.set(-1.44, 0.055, 0.02);
    root.add(pot);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), flat(0x27573c));
    leaves.position.set(-1.44, 0.19, 0.02);
    root.add(leaves);

    root.add(box(0.22, 0.004, 0.30, flat(0x8e8b80), 1.30, 0.004, 0.34));
    const sheet = box(0.22, 0.004, 0.30, flat(0x9a978c), 1.32, 0.009, 0.32);
    sheet.rotation.y = 0.16;
    root.add(sheet);

    const floppy = box(0.10, 0.006, 0.10, flat(0x22262c), -1.28, 0.005, 0.48);
    floppy.rotation.y = -0.22;
    root.add(floppy);
  }

  /* Desk clutter ------------------------------------------------------- */

  function cable(points, radius, color) {
    const curve = new THREE.CatmullRomCurve3(points.map((pt) => new THREE.Vector3(pt[0], pt[1], pt[2])));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), flat(color));
  }

  function floppyTop(label, tint) {
    return painted(300, 300, (ctx, w, h) => {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c9ccd2';
      ctx.fillRect(96, 8, 108, 74);
      ctx.fillStyle = tint;
      ctx.fillRect(150, 12, 24, 66);
      ctx.fillStyle = '#eceadf';
      ctx.fillRect(24, 108, 252, 148);
      ctx.fillStyle = '#20242a';
      ctx.font = 'bold 30px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, w / 2, 190);
      ctx.strokeStyle = 'rgba(32, 36, 42, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(44, 222);
      ctx.lineTo(256, 222);
      ctx.stroke();
    });
  }

  function rubikFace(order) {
    const SW = { w: '#f2f2f2', r: '#c4232f', b: '#0b57c4', o: '#e8701a', g: '#0f9e58', y: '#f2ce1b' };
    return painted(180, 180, (ctx) => {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, 180, 180);
      order.split('').forEach((k, i) => {
        ctx.fillStyle = SW[k];
        ctx.fillRect(12 + (i % 3) * 56, 12 + Math.floor(i / 3) * 56, 44, 44);
      });
    });
  }

  function calcTop() {
    return painted(220, 440, (ctx, w, h) => {
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1d2027';
      ctx.fillRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = '#9aab7d';
      ctx.fillRect(26, 28, w - 52, 104);
      ctx.strokeStyle = '#3f4a52';
      ctx.lineWidth = 3;
      ctx.strokeRect(26, 28, w - 52, 104);
      ctx.strokeStyle = '#3a4630';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const x = 30 + i * ((w - 60) / 40);
        const t = (i / 40) * 4 - 2;
        const y = 80 + Math.sin(t * 2.2) * 34;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#c8ccd2';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TI-83 Plus', 26, 158);

      const cols = 5;
      const rows = 9;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = 24 + c * 35;
          const y = 176 + r * 28;
          ctx.fillStyle = r === 0 ? '#3f6ca8' : r === 1 ? '#5a616b' : '#43474f';
          ctx.fillRect(x, y, 28, 20);
        }
      }
    });
  }

  function grassBlock() {
    const GRASS = 0x6aab3c;
    const DIRT = 0x8a6543;
    const top = voxelArt(16, 12, (x, y) => shade(GRASS, Math.round(grain(x, y, 3) * 46) - 22));
    const dirt = voxelArt(16, 12, (x, y) => shade(DIRT, Math.round(grain(x, y, 9) * 40) - 20));
    const side = voxelArt(16, 12, (x, y) => {
      const lip = 3 + Math.round(grain(x, 0, 17) * 2);
      return y < lip
        ? shade(GRASS, Math.round(grain(x, y, 5) * 46) - 22)
        : shade(DIRT, Math.round(grain(x, y, 11) * 40) - 20);
    });
    return [side, side, top, dirt, side, side];
  }

  function creeperHead() {
    const SKIN = 0x5cb04a;
    const FACE = [
      '........',
      '.XX..XX.',
      '.XX..XX.',
      '...XX...',
      '..XXXX..',
      '..XXXX..',
      '..X..X..',
      '........'
    ];
    const skin = (x, y, seed) => shade(SKIN, Math.round(grain(x, y, seed) * 54) - 27);
    const plain = voxelArt(8, 24, (x, y) => skin(x, y, 21));
    const front = voxelArt(8, 24, (x, y) => (FACE[y][x] === 'X' ? '#20281f' : skin(x, y, 21)));
    return [plain, plain, plain, plain, front, plain];
  }

  function buildClutter(root) {
    const dark = flat(0x24262b);
    const plastic = flat(0xb3a68c);

    root.add(box(0.25, 0.003, 0.20, flat(0x1c2026), 0.52, 0.0035, 0.44));
    const mouse = box(0.056, 0.026, 0.092, plastic, 0.52, 0.018, 0.43);
    mouse.rotation.y = -0.12;
    root.add(mouse);
    root.add(box(0.002, 0.004, 0.034, flat(0x6c6559), 0.52, 0.032, 0.402));
    root.add(cable([[0.50, 0.016, 0.385], [0.44, 0.012, 0.30], [0.34, 0.014, 0.20], [0.24, 0.05, 0.13]], 0.005, 0x1a1c20));

    root.add(cable([[0.02, 0.020, 0.335], [0.00, 0.014, 0.27], [-0.06, 0.016, 0.20], [-0.12, 0.05, 0.13]], 0.005, 0x1a1c20));

    [-1.04, 0.90].forEach((x) => {
      const cab = box(0.105, 0.175, 0.095, plastic, x, 0.087, -0.14);
      cab.rotation.y = x < 0 ? 0.30 : -0.30;
      root.add(cab);
      const grille = new THREE.Mesh(new THREE.CircleGeometry(0.032, 12), dark);
      grille.position.set(0, -0.022, 0.049);
      cab.add(grille);
      const tweet = new THREE.Mesh(new THREE.CircleGeometry(0.013, 10), dark);
      tweet.position.set(0, 0.048, 0.049);
      cab.add(tweet);
    });

    const disks = [
      ['DOOM 1.9', '#2a2d33'],
      ['BOOT DISK', '#2f3a4a'],
      ['SRC BACKUP', '#3a2f36']
    ];
    disks.forEach((d, i) => {
      const pages = flat(0x1d2026);
      const disk = new THREE.Mesh(
        new THREE.BoxGeometry(0.092, 0.007, 0.096),
        [pages, pages, floppyTop(d[0], d[1]), pages, pages, pages]
      );
      disk.position.set(1.02, 0.0075 + i * 0.008, 0.12 + i * 0.004);
      disk.rotation.y = -0.18 + i * 0.09;
      root.add(disk);
    });

    const faces = ['wwrbwgoyw', 'rgobrywbo', 'gybwgorwy', 'oworybgry', 'ybgyowrgb', 'bryogwbyo'];
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.052, 0.052),
      faces.map((f) => rubikFace(f))
    );
    cube.position.set(1.14, 0.026, 0.40);
    cube.rotation.y = 0.5;
    root.add(cube);

    const d20 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.028, 0), flat(0x8d3f34));
    d20.position.set(0.96, 0.024, 0.50);
    d20.rotation.set(0.5, 0.9, 0.2);
    root.add(d20);

    const grass = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.062, 0.062), grassBlock());
    grass.position.set(-0.53, 0.031, 0.20);
    grass.rotation.y = 0.34;
    root.add(grass);

    const creeper = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.056, 0.056), creeperHead());
    creeper.position.set(0.64, 0.028, 0.12);
    creeper.rotation.y = -0.22;
    root.add(creeper);

    const pages = flat(0x1d2026);
    const calc = new THREE.Mesh(
      new THREE.BoxGeometry(0.086, 0.017, 0.176),
      [pages, pages, calcTop(), pages, pages, pages]
    );
    calc.position.set(0.75, 0.0085, 0.56);
    calc.rotation.y = 0.30;
    root.add(calc);

    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.15, 6), flat(0xd0a53a));
    pencil.rotation.set(0, 0, Math.PI / 2);
    pencil.rotation.y = 0.42;
    pencil.position.set(-0.42, 0.0045, 0.56);
    root.add(pencil);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.018, 6), flat(0xe8dcc0));
    tip.rotation.set(0, 0.42, -Math.PI / 2);
    tip.position.set(-0.35, 0.0045, 0.531);
    root.add(tip);
  }

  function stickNotes(group) {
    const notes = [
      [0.42, 0.20, 0.062, 0.14, '#e4d878'],
      [0.42, 0.10, 0.058, -0.09, '#d9c9a8'],
      [-0.42, 0.24, 0.055, -0.16, '#dbd3a0']
    ];
    notes.forEach((n) => {
      const note = new THREE.Mesh(new THREE.PlaneGeometry(n[2], n[2]), flat(parseInt(n[4].slice(1), 16)));
      note.position.set(n[0], n[1], 0.332);
      note.rotation.z = n[3];
      group.add(note);
    });
  }

  function buildDust(root) {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.7;
      positions[i * 3 + 1] = Math.random() * 0.75 + 0.05;
      positions[i * 3 + 2] = Math.random() * 0.85 + 0.16;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xe5e5e5,
      size: 0.005,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    root.add(dust);
  }

  /* The picture ------------------------------------------------------- */

  function readLines() {
    const out = document.getElementById('terminal-output');
    if (!out) return [];
    return Array.prototype.map.call(out.children, (el) => el.textContent);
  }

  function drawScreen() {
    const ctx = paintCtx;
    const boot = state.boot;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, TEX_W, TEX_H);

    if (boot < 0.68) {
      const open = clamp01(boot / 0.30);
      const spread = boot < 0.44 ? 0 : smooth((boot - 0.44) / 0.24);
      const w = TEX_W * smooth(open);
      const h = 26 + (TEX_H - 26) * spread;
      ctx.globalAlpha = 1 - spread * 0.82;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
      ctx.globalAlpha = 1;
      overlays(ctx);
      screenTex.needsUpdate = true;
      return;
    }

    const ink = clamp01((boot - 0.68) / 0.32);
    const size = 32;
    const lh = size * 1.36;
    const pad = 52;

    ctx.font = `${size}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';

    const lines = readLines();
    const last = lines.length ? lines[lines.length - 1] : '';
    const onCommand = last.charAt(0) === '$';
    const advance = ctx.measureText('M').width;

    lines.forEach((line, i) => {
      const y = pad + i * lh;
      ctx.globalAlpha = ink;
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(210, 210, 210, 0.8)';
      ctx.fillText(line, pad, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f2f2f2';
      ctx.fillText(line, pad, y);
    });

    if (state.caretOn && ink > 0.5 && state.blow === 0) {
      const row = onCommand ? lines.length - 1 : lines.length;
      const col = onCommand ? last.length : 0;
      ctx.globalAlpha = ink;
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(pad + col * advance, pad + row * lh + 4, advance * 0.85, size);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
    overlays(ctx);
    screenTex.needsUpdate = true;
  }

  // Scanlines, edge falloff, and the white out on the way through
  function overlays(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    for (let y = 0; y < TEX_H; y += 4) ctx.fillRect(0, y, TEX_W, 2);

    const vig = ctx.createRadialGradient(TEX_W / 2, TEX_H / 2, TEX_H * 0.22, TEX_W / 2, TEX_H / 2, TEX_H * 0.78);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.66)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, TEX_W, TEX_H);

    if (state.blow > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.blow})`;
      ctx.fillRect(0, 0, TEX_W, TEX_H);
    }
  }

  /* Camera ------------------------------------------------------------ */

  function cutTo(name, duration) {
    const s = SHOTS[name];
    shot.from.pos.copy(shot.pos);
    shot.from.look.copy(shot.look);
    shot.from.fov = shot.fov;
    shot.from.tilt = shot.tilt;
    shot.to.pos.set(s.pos[0], s.pos[1], s.pos[2]);
    shot.to.look.set(s.look[0], s.look[1], s.look[2]);
    shot.to.fov = s.fov;
    shot.to.tilt = s.tilt;
    shot.t = 0;
    shot.dur = duration;
  }

  function snapTo(name) {
    const s = SHOTS[name];
    shot.pos.set(s.pos[0], s.pos[1], s.pos[2]);
    shot.look.set(s.look[0], s.look[1], s.look[2]);
    shot.to.pos.copy(shot.pos);
    shot.to.look.copy(shot.look);
    shot.to.fov = s.fov;
    shot.t = 1;
    shot.fov = s.fov;
    shot.tilt = s.tilt;
  }

  /* Loop -------------------------------------------------------------- */

  let lastFrame = 0;
  let lastPaint = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;

    const boot = state.bootAt ? clamp01((now - state.bootAt) / 1150) : 0;
    const blow = state.blowAt ? clamp01((now - state.blowAt) / 520) : 0;
    if (boot !== state.boot || blow !== state.blow) {
      state.boot = boot;
      state.blow = blow;
      state.dirty = true;
    }

    const caret = Math.floor(now / 480) % 2 === 0;
    if (caret !== state.caretOn) {
      state.caretOn = caret;
      state.dirty = true;
    }

    if (state.dirty && now - lastPaint > 28) {
      state.dirty = false;
      lastPaint = now;
      drawScreen();
    }

    // Light follows the picture, with a tired tube's flicker
    const flicker = 0.94 + Math.sin(now / 90) * 0.03 + Math.sin(now / 37) * 0.03;
    screenLight.intensity = state.boot * 2.9 * flicker + state.blow * 5;
    if (dust) dust.material.opacity = state.boot * 0.16;

    keyMeshes.forEach((key) => {
      if (key.userData.hit > 0.001) {
        key.userData.hit *= Math.pow(0.02, dt);
        key.position.y = key.userData.rest - 0.011 * key.userData.hit;
      }
    });

    if (shot.t < 1) {
      shot.t = Math.min(1, shot.t + dt / shot.dur);
      const e = smooth(shot.t);
      shot.pos.lerpVectors(shot.from.pos, shot.to.pos, e);
      shot.look.lerpVectors(shot.from.look, shot.to.look, e);
      shot.fov = shot.from.fov + (shot.to.fov - shot.from.fov) * e;
      shot.tilt = shot.from.tilt + (shot.to.tilt - shot.from.tilt) * e;
    }

    // A tall viewport would otherwise be half empty floor
    aim.copy(shot.look);
    if (camera.aspect < REF_ASPECT) {
      aim.y += 0.13 * (1 - camera.aspect / REF_ASPECT) * shot.tilt;
    }
    frameShot(shot.pos, aim, shot.fov);

    // Handheld drift, so the shot never sits perfectly still
    const drift = state.blow > 0.02 ? 0 : 1;
    camera.position.set(
      framed.x + Math.sin(now / 2600) * 0.014 * drift,
      framed.y + Math.sin(now / 1900) * 0.010 * drift,
      framed.z
    );
    camera.lookAt(aim);

    if (dust) dust.rotation.y = now / 90000;

    renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* Public -------------------------------------------------------------- */

  function press(char) {
    if (!ready || !char) return;
    const lower = char.toLowerCase();
    const shifted = SHIFTED[char];
    const needsShift = Boolean(shifted) || (char !== lower && char === char.toUpperCase());
    const hits = [keyMeshes.get(shifted || lower)];
    if (needsShift) hits.push(keyMeshes.get('SHIFT'));
    hits.forEach((key) => { if (key) key.userData.hit = 1; });
  }

  function enter() {
    press('\n');
  }

  function powerOn(done) {
    if (!ready) {
      if (done) done();
      return;
    }
    // The wide shot is the only look anyone gets at the desk, so hold it
    setTimeout(() => {
      state.bootAt = performance.now();
      cutTo('boot', 2.4);
    }, 620);
    setTimeout(() => cutTo('typing', 1.9), 2950);
    setTimeout(() => { if (done) done(); }, 2800);
  }

  function dive(onReveal, onDone) {
    if (!ready) {
      if (onReveal) onReveal();
      if (onDone) onDone();
      return;
    }
    cutTo('align', 0.55);
    setTimeout(() => cutTo('dive', 0.9), 520);
    setTimeout(() => { state.blowAt = performance.now(); }, 780);
    setTimeout(() => { if (onReveal) onReveal(); }, 1200);
    setTimeout(() => overlay.classList.add('crt-out'), 1250);
    setTimeout(() => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (onDone) onDone();
    }, 1750);
  }

  function init() {
    overlay = document.getElementById('terminal-sequence-overlay');
    canvas = document.getElementById('crt-scene');
    if (!canvas || typeof THREE === 'undefined') return false;

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) {
      console.warn('CRT scene unavailable, falling back to the plain terminal', e);
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x05070a, 1);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05070a, 3.2, 9);

    camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
    scene.add(new THREE.AmbientLight(0x0d1620, 0.9));
    const moon = new THREE.DirectionalLight(0x35558c, 0.26);
    moon.position.set(-3, 2.4, 0.6);
    scene.add(moon);

    buildRoom(scene);
    buildDesk(scene);
    buildDesktopCase(scene);
    buildMonitor(scene);
    buildKeyboard(scene);
    buildLibrary(scene);
    buildProps(scene);
    buildClutter(scene);
    buildDust(scene);

    snapTo('dark');
    resize();
    window.addEventListener('resize', resize);

    // Whatever the terminal writes is what the tube shows
    const out = document.getElementById('terminal-output');
    if (out && window.MutationObserver) {
      new MutationObserver(() => { state.dirty = true; })
        .observe(out, { childList: true, subtree: true, characterData: true });
    }

    drawScreen();
    ready = true;
    raf = requestAnimationFrame(frame);
    return true;
  }

  window.CRT = { init, press, enter, powerOn, dive };
})();
