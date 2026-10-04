/* NEXUS render engine — galaxy background, living core, mini cores, waves.
   Canvas 2D, one RAF loop. Discovers elements by data attributes:
   [data-nexus-main="bg"|"core"], canvas[data-nexus-core], canvas[data-nexus-wave],
   [data-nexus-meter], [data-nexus-grain], [data-spot]. */
(function () {
  'use strict';
  if (window.NexusEngine) return;
  const TAU = Math.PI * 2, W = 1920, H = 1080;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const expo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const NT = new Float32Array(1024); { const r = rng(7); for (let i = 0; i < 1024; i++) NT[i] = r(); }
  function n1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(NT[i & 1023], NT[(i + 1) & 1023], u); }
  function col(c, a) { a = a < 0 ? 0 : a > 1 ? 1 : a; return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }

  const THEMES = {
    nexus:   { a: [139, 92, 246], b: [196, 181, 253], m: [217, 70, 239], w: [255, 246, 233], g: [245, 185, 113], n: [[72, 24, 140], [170, 50, 190], [22, 30, 96], [140, 84, 52]] },
    arc:     { a: [34, 211, 238], b: [186, 240, 255], m: [59, 130, 246], w: [240, 252, 255], g: [255, 214, 150], n: [[10, 60, 120], [20, 110, 160], [16, 24, 80], [70, 80, 100]] },
    mark3:   { a: [239, 68, 68], b: [254, 205, 190], m: [220, 38, 38], w: [255, 244, 230], g: [251, 191, 36], n: [[120, 22, 22], [160, 70, 20], [44, 12, 36], [140, 90, 30]] },
    emerald: { a: [16, 185, 129], b: [167, 243, 208], m: [20, 184, 166], w: [244, 255, 248], g: [245, 200, 120], n: [[6, 84, 64], [14, 120, 118], [10, 30, 66], [90, 96, 50]] },
    solar:   { a: [249, 115, 22], b: [254, 215, 170], m: [234, 88, 12], w: [255, 248, 232], g: [253, 224, 71], n: [[130, 48, 12], [160, 34, 64], [44, 20, 54], [150, 104, 40]] },
    chicle:  { a: [255, 77, 160], b: [255, 194, 224], m: [255, 110, 180], w: [255, 246, 251], g: [255, 220, 170], n: [[140, 24, 84], [190, 50, 120], [48, 16, 60], [150, 80, 100]] },
    orquidea: { a: [200, 60, 220], b: [240, 180, 250], m: [236, 72, 153], w: [253, 244, 255], g: [250, 204, 160], n: [[96, 20, 120], [160, 40, 150], [34, 16, 72], [120, 60, 110]] },
  };
  const clone = t => JSON.parse(JSON.stringify(t));
  let THEME = clone(THEMES.solar), THEME_T = THEMES.solar;
  const CORAL = [251, 113, 133], WARM = [255, 208, 168];

  const ST = {
    idle:      { energy: .25, contract: 1,   align: 0,  spin: 1,   warm: 0,  desat: 0,  bloom: .65, gain: .22, red: 0, amber: 0,  audio: 'idle' },
    wake:      { energy: 1,   contract: 1,   align: 0,  spin: 1.8, warm: .1, desat: 0,  bloom: 1.3, gain: .9,  red: 0, amber: 0,  audio: 'wake' },
    listening: { energy: .7,  contract: 1,   align: 0,  spin: 1.4, warm: 0,  desat: 0,  bloom: .9,  gain: 1,   red: 0, amber: 0,  audio: 'user' },
    thinking:  { energy: .65, contract: .55, align: 1,  spin: 4.5, warm: 0,  desat: 0,  bloom: .85, gain: .3,  red: 0, amber: 1,  audio: 'hum' },
    speaking:  { energy: .8,  contract: 1,   align: 0,  spin: 1.5, warm: 1,  desat: 0,  bloom: 1,   gain: 1,   red: 0, amber: 0,  audio: 'assistant' },
    action:    { energy: .8,  contract: .85, align: .3, spin: 2.6, warm: .3, desat: 0,  bloom: 1,   gain: .5,  red: 0, amber: .4, audio: 'hum' },
    error:     { energy: .08, contract: 1.05, align: 0, spin: .25, warm: 0,  desat: .85, bloom: .3, gain: .08, red: 1, amber: 0,  audio: 'idle' },
    music:     { energy: .8,  contract: 1,   align: 0,  spin: 1.6, warm: .15, desat: 0, bloom: 1,   gain: 1.15, red: 0, amber: 0, audio: 'music' },
  };
  const PKEYS = ['energy', 'contract', 'align', 'spin', 'warm', 'desat', 'bloom', 'gain', 'red', 'amber'];
  const OD = [
    { rr: 1.22, inc: 68, node: -20, sp: .55, c: 'b', w: 1.2, tr: 1.6 },
    { rr: 1.34, inc: 74, node: 35, sp: -.42, c: 'a', w: 1, tr: 1.9 },
    { rr: 1.46, inc: 62, node: 80, sp: .36, c: 'b', w: .9, tr: 1.4 },
    { rr: 1.58, inc: 78, node: -60, sp: .3, c: 'g', w: .8, tr: 1.2 },
    { rr: 1.28, inc: 55, node: 120, sp: -.5, c: 'a', w: 1.1, tr: 1.5 },
    { rr: 1.7, inc: 70, node: 10, sp: .24, c: 'b', w: .8, tr: 1.8 },
    { rr: 1.82, inc: 82, node: 150, sp: -.2, c: 'a', w: .7, tr: 1.3 },
    { rr: 1.4, inc: 66, node: -110, sp: .46, c: 'g', w: .6, tr: .9 },
  ];
  const D2R = Math.PI / 180;

  let REDUCED = false, QUALITY = 'ultra';
  // minDt: shortest time between frames (ms). 12.5 keeps 60 Hz screens at 60 fps and
// halves 120/144 Hz screens to 60/72 fps instead of doing 2.4x the work.
  // bgEvery: redraw the slow-moving galaxy every N frames.
  const QF = {
    ultra: { res: 1, parts: 2600, grain: 1, lines: 6, minDt: 12.5, bgEvery: 1 },
    equilibrado: { res: .8, parts: 1500, grain: 1, lines: 4, minDt: 12.5, bgEvery: 2 },
    ahorro: { res: .55, parts: 700, grain: 0, lines: 2, minDt: 25, bgEvery: 2 },
  };

  function makeSim(n, seed, mini) {
    const r = rng(seed);
    const S = { n, mini, r: new Float32Array(n), th: new Float32Array(n), w: new Float32Array(n), groups: [[], [], [], []],
      orb: OD.map((o, i) => ({ ...o, ph: r() * TAU, crr: o.rr, cinc: o.inc * D2R, cnode: o.node * D2R })),
      NB: mini ? 96 : 168, bars: null, bv: null, sparks: [], shocks: [], r1: 0, r2: 0, r3: 0,
      p: { ...ST.idle }, au: { bass: 0, mid: 0, high: 0 }, state: 'idle', ignite: 1, wakeAge: 9, poke: 0,
      tint: [249, 115, 22], tintT: null, tintK: 0, loop: 0, act: null, bursts: [] };
    S.bars = new Float32Array(S.NB); S.bv = new Float32Array(S.NB);
    for (let i = 0; i < n; i++) {
      const rr = Math.pow(r(), 1.7) * .84 + .02, arm = r() < .5 ? 0 : Math.PI, sp = (r() - .5) * (.9 * (1 - rr) + .3);
      S.r[i] = rr; S.th[i] = arm + rr * 5.2 + sp * 1.5; S.w[i] = (.35 / (rr + .12)) * (.8 + r() * .4);
      S.groups[rr < .13 ? 0 : rr < .32 ? 1 : rr < .58 ? 2 : 3].push(i);
    }
    return S;
  }
  function setSimState(S, s) {
    if (!ST[s]) s = 'idle';
    if (s === 'wake' && S.state !== 'wake') { S.ignite = 0; S.wakeAge = 0; S.shocks.push({ age: 0 }); }
    S.state = s;
  }

  // ---------- audio ----------
  function speech(t, rate, seed) {
    const g = sstep(.3, .5, n1(t * .9 + seed));
    const syl = Math.pow(Math.max(0, Math.sin(t * TAU * rate + 2 * n1(t * 1.3 + seed))), 1.4);
    return g * (.35 + .65 * syl) * (.7 + .3 * n1(t * 5 + seed));
  }
  function simAudio(S, t, out) {
    const m = ST[S.state].audio;
    if (m === 'user' || m === 'assistant') {
      const sd = m === 'user' ? 11 : 57, e = speech(t, m === 'user' ? 4.1 : 3.3, sd);
      out.bass = e * .55; out.mid = e * .95; out.high = e * .6 * Math.pow(n1(t * 17 + sd), 2) * 1.6;
    } else if (m === 'music') {
      const b = t * 118 / 60, ph = b % 1, kick = Math.exp(-ph * 6), sn = (Math.floor(b) % 2) ? Math.exp(-ph * 9) : 0, hat = Math.exp(-((b * 2) % 1) * 16);
      out.bass = .12 + .88 * kick; out.mid = .28 + .35 * n1(t * 1.5) + .35 * sn; out.high = .12 + .6 * hat * (.6 + .4 * n1(t * 3));
    } else if (m === 'wake') {
      const e = Math.exp(-S.wakeAge * 2.2); out.bass = .9 * e; out.mid = .3 + .6 * e; out.high = .7 * e;
    } else if (m === 'hum') {
      out.bass = .08; out.mid = .16 + .12 * n1(t * 3); out.high = .15 * n1(t * 11);
    } else { out.bass = .04; out.mid = .06 + .05 * n1(t * .7 + S.n); out.high = 0; }
    return out;
  }
  let mic = null;
  // external analysers (voice playback, system audio) keyed by core state
  const sources = {};
  function sourceFor(state) {
    if (state === 'listening' && mic) return mic;
    return sources[state] || null;
  }
  function specBars(S, src) {
    const d = src.buf, n = d.length, half = S.NB / 2;
    if (!S.spec) S.spec = new Float32Array(S.NB);
    for (let i = 0; i < half; i++) {
      // log-spaced bins, mirrored so bass sits at the top of the ring
      const lo = Math.floor(Math.pow(n * .7, i / half)), hi = Math.max(lo + 1, Math.floor(Math.pow(n * .7, (i + 1) / half)));
      let m = 0; for (let j = lo; j < hi && j < n; j++) m = Math.max(m, d[j]);
      const v = Math.pow(m / 255, 1.6) * (1 + i / half * .8);
      S.spec[i] = v; S.spec[S.NB - 1 - i] = v;
    }
  }
  function micBands(out, src) {
    const a = src.an, d = src.buf; a.getByteFrequencyData(d);
    const band = (lo, hi) => { let s = 0; for (let i = lo; i < hi; i++) s += d[i]; return s / (hi - lo) / 255; };
    out.bass = clamp(band(1, 6) * 1.4, 0, 1); out.mid = clamp(band(6, 40) * 2.2, 0, 1); out.high = clamp(band(40, 160) * 3.2, 0, 1);
    return out;
  }
  const tmpA = { bass: 0, mid: 0, high: 0 };
  function updateSim(S, dt, t, useMic) {
    const tg = ST[S.state];
    const k = 1 - Math.exp(-dt * 3.2), ks = 1 - Math.exp(-dt * 1.6);
    for (const key of PKEYS) S.p[key] = lerp(S.p[key], tg[key], key === 'spin' ? ks : k);
    const src = useMic ? sourceFor(S.state) : null;
    if (src) { micBands(tmpA, src); specBars(S, src); S.specK = Math.min(1, (S.specK || 0) + dt * 4); }
    else { simAudio(S, t, tmpA); S.specK = Math.max(0, (S.specK || 0) - dt * 3); }
    if (REDUCED) { tmpA.bass *= .5; tmpA.mid *= .6; tmpA.high *= .3; }
    for (const b of ['bass', 'mid', 'high']) { const x = S.au[b], y = tmpA[b]; S.au[b] = x + (y - x) * (y > x ? 1 - Math.exp(-dt * 28) : 1 - Math.exp(-dt * 8)); }
    if (S.ignite < 1) S.ignite = Math.min(1, S.ignite + dt / .6);
    S.wakeAge += dt; S.poke *= Math.exp(-dt * 5);
    const tt = S.tintT && S.state === 'music' ? 1 : 0; S.tintK = lerp(S.tintK, tt, k * .6);
    if (S.tintT) S.tint = mix(S.tint, S.tintT, k);
    const spin = S.p.spin * (1 + S.au.mid * S.p.gain * .8) * (REDUCED ? .35 : 1);
    S.r1 += .12 * spin * dt; S.r2 -= .08 * spin * dt; S.r3 += .22 * spin * dt;
    const al = S.p.align;
    S.orb.forEach((o, i) => {
      o.ph += o.sp * spin * .9 * dt;
      o.crr = lerp(o.rr, 1.2 + i * .085, al);
      o.cinc = lerp(o.inc, 72, al) * D2R;
      o.cnode = lerp(o.node, -14, al) * D2R;
    });
    return spin;
  }

  function palette(S) {
    let a = THEME.a, b = THEME.b, m = THEME.m, w = THEME.w, g = THEME.g;
    if (S.tintK > .01) { b = mix(b, S.tint, .5 * S.tintK); m = mix(m, S.tint, .55 * S.tintK); a = mix(a, S.tint, .3 * S.tintK); }
    const wr = S.p.warm; if (wr > .01) { b = mix(b, WARM, .55 * wr); w = mix(w, [255, 236, 206], .5 * wr); }
    const d = S.p.desat;
    if (d > .01) { const gr = c => { const l = c[0] * .3 + c[1] * .59 + c[2] * .11; return mix(c, [l * .75, l * .75, l * .78], d); }; a = gr(a); b = gr(b); m = gr(m); w = gr(w); g = gr(g); }
    return { a, b, m, w, g };
  }

  // ---------- core ----------
  function drawCore(ctx, S, cx, cy, R0, dt, t, B, alpha) {
    const p = S.p, au = S.au, pal = palette(S);
    const kB = B ? B.burst : 1, kR = B ? B.ring : 1, kP = B ? B.point : 1;
    const br = Math.sin(t * TAU / 6), gainC = Math.min(1.2, p.gain);
    const R = R0 * (1 + .06 * au.bass * Math.min(1, p.gain) + .014 * br + S.poke * .05);
    const sc = R0 / 150;
    const bl = p.bloom * (1 + au.bass * 1.1 * gainC) * (.9 + .1 * br) * kR * alpha;
    ctx.save();
    // outer bloom
    ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(cx, cy, R * .9, cx, cy, R * 3.2);
    g.addColorStop(0, col(pal.a, .2 * bl)); g.addColorStop(.35, col(pal.m, .05 * bl)); g.addColorStop(1, col(pal.a, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - R * 3.2, cy - R * 3.2, R * 6.4, R * 6.4);
    // anamorphic streak
    if (!S.mini) {
      const sw = R * 5.5, sa = (.05 + .08 * au.bass * gainC) * bl + (B && kB < 1 ? kP * .5 * (1 - kB) : 0);
      g = ctx.createLinearGradient(cx - sw, 0, cx + sw, 0);
      g.addColorStop(0, col(pal.b, 0)); g.addColorStop(.5, col(pal.w, sa)); g.addColorStop(1, col(pal.b, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - sw, cy - 1.2 * sc, sw * 2, 2.4 * sc);
    }
    // dark sphere
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = kR * alpha;
    g = ctx.createRadialGradient(cx, cy - R * .25, 0, cx, cy, R * 1.03);
    g.addColorStop(0, 'rgba(12,7,24,.97)'); g.addColorStop(.86, 'rgba(5,3,10,.99)'); g.addColorStop(1, 'rgba(5,3,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    // inner rim
    g = ctx.createRadialGradient(cx, cy, R * .55, cx, cy, R);
    g.addColorStop(0, col(pal.a, 0)); g.addColorStop(1, col(pal.a, .22 * bl));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    // particles (spiral cluster)
    const spin = p.spin * (1 + au.mid * p.gain * .8) * (REDUCED ? .35 : 1);
    const cont = p.contract * (B ? lerp(.02, 1, kB) : 1), c0 = Math.cos(-.32), s0 = Math.sin(-.32);
    const GC = [pal.w, mix(pal.w, pal.b, .5), pal.b, pal.a], GA = [.85, .6, .45, .38], GS = [1.6, 1.4, 1.2, 1.1];
    const en = (.55 + .6 * p.energy + .3 * au.bass) * (B ? kB : 1) * alpha;
    for (let q = 0; q < 4; q++) {
      const idx = S.groups[q], sz = Math.max(.7, GS[q] * sc * (S.mini ? 1.4 : 1));
      ctx.fillStyle = col(GC[q], 1); ctx.globalAlpha = clamp(GA[q] * en, 0, 1);
      for (let j = 0; j < idx.length; j++) {
        const i = idx[j]; S.th[i] += S.w[i] * spin * .5 * dt;
        const th = S.th[i], rr = S.r[i] * R * cont * (1 + .04 * Math.sin(th * 2 + t));
        const x = Math.cos(th) * rr, y = Math.sin(th) * rr * .74;
        ctx.fillRect(cx + x * c0 - y * s0, cy + x * s0 + y * c0, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
    // heart
    const hi = (.7 + .4 * p.energy + .5 * au.bass + (1 - p.contract) * .8) * (B ? Math.max(kP * (1 - kB) * 1.6, kB) : 1) * alpha;
    const hr = R * (.19 + .06 * au.bass) * (p.contract * .6 + .4) * (B ? lerp(.25, 1, kB) : 1);
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, hr * 2.4);
    g.addColorStop(0, col(pal.w, .95 * hi)); g.addColorStop(.16, col(pal.w, .6 * hi)); g.addColorStop(.45, col(pal.b, .22 * hi)); g.addColorStop(1, col(pal.a, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, hr * 2.4, 0, TAU); ctx.fill();
    // dashed reactor rings
    const rings = [[.92, [], S.r1, pal.b, .22], [.8, [26, 10, 3, 10], S.r2, pal.b, .26], [.66, [1, 3.5], S.r3, pal.w, .28]];
    ctx.lineWidth = Math.max(.6, 1 * sc);
    rings.forEach(([rf, dash, rot, c, a], k) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.setLineDash(dash.map(v => v * sc)); ctx.strokeStyle = col(c, a * kR * alpha * (.7 + .5 * p.energy));
      ctx.beginPath(); ctx.arc(0, 0, rf * R * cont ** .3, 0, TAU); ctx.stroke(); ctx.restore();
      if (p.amber > .02) {
        const ang = t * (k % 2 ? -3.2 : 4) + k * 2.1;
        ctx.setLineDash([]); ctx.strokeStyle = col(pal.g, .9 * p.amber * alpha); ctx.lineWidth = 2 * sc;
        ctx.beginPath(); ctx.arc(cx, cy, rf * R * cont ** .3, ang, ang + .38); ctx.stroke();
        ctx.strokeStyle = col(pal.g, .2 * p.amber * alpha); ctx.lineWidth = 7 * sc;
        ctx.beginPath(); ctx.arc(cx, cy, rf * R * cont ** .3, ang, ang + .38); ctx.stroke();
        ctx.lineWidth = Math.max(.6, 1 * sc);
      }
    });
    ctx.setLineDash([]);
    // scanners: three short beams sweeping the inner ring, faster when it is busy
    const scR = .92 * R * cont ** .3;
    for (let k = 0; k < 3; k++) {
      const h = S.r1 * (2.2 + k * .5) * (k % 2 ? -1 : 1) + k * 2.1, ln = .35 + .15 * k;
      for (let j = 0; j < 6; j++) {
        const f = 1 - j / 6;
        ctx.strokeStyle = col(mix(pal.b, pal.w, f * .6), f * f * (.35 + .4 * p.energy) * kR * alpha); ctx.lineWidth = Math.max(.6, (.8 + 1.2 * f) * sc);
        const d = k % 2 ? 1 : -1, s0 = h + d * ln * j / 6, s1 = h + d * ln * (j + 1) / 6;
        ctx.beginPath(); ctx.arc(cx, cy, scR, Math.min(s0, s1), Math.max(s0, s1)); ctx.stroke();
      }
    }
    // event horizon ring
    const rc = mix(pal.b, pal.w, .55);
    g = ctx.createRadialGradient(cx, cy, R * .8, cx, cy, R * 1.3);
    g.addColorStop(0, col(pal.a, 0)); g.addColorStop(.3, col(pal.b, .18 * bl)); g.addColorStop(.4, col(rc, .9 * kR * alpha)); g.addColorStop(.48, col(pal.b, .22 * bl)); g.addColorStop(1, col(pal.a, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.3, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.3 * sc;
    ctx.strokeStyle = col([255, 90, 140], .16 * kR * alpha); ctx.beginPath(); ctx.arc(cx + 1.4 * sc, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col([90, 150, 255], .16 * kR * alpha); ctx.beginPath(); ctx.arc(cx - 1.4 * sc, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col(pal.w, .92 * kR * alpha); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    if (p.red > .02) {
      const fl = (n1(t * 7) > .55 ? 1 : .35) * p.red * (.6 + .4 * Math.sin(t * 3));
      ctx.strokeStyle = col(CORAL, .55 * fl * alpha); ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      g = ctx.createRadialGradient(cx, cy, R * .9, cx, cy, R * 1.6);
      g.addColorStop(0, col(CORAL, .14 * fl * alpha)); g.addColorStop(1, col(CORAL, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.6, 0, TAU); ctx.fill();
    }
    // ---- energy field: the voice and the music move a plasma around the core, not bars ----
    const NB = S.NB, ig = S.ignite * (B ? B.ignite : 1);
    for (let i = 0; i < NB; i++) {
      const a = i / NB * TAU;
      const wave = .5 + .5 * Math.sin(a * 3 - t * 2.3 + Math.sin(a * 2 + t * .9) * 1.2);
      const jit = n1(i * .37 + t * 6);
      let v = au.bass * .32 + au.mid * (.2 + .8 * wave) * (.45 + .55 * jit) + au.high * .45 * Math.pow(n1(i * 1.7 + t * 14), 3);
      if (S.specK > 0 && S.spec) v = lerp(v, v * .35 + S.spec[i] * .95, S.specK);
      v = v * p.gain + .035 + .015 * br;
      S.bv[i] += (v - S.bars[i]) * 170 * dt; S.bv[i] *= Math.exp(-15 * dt); S.bars[i] += S.bv[i] * dt;
    }
    // spread over the neighbours: a flowing field instead of separate spikes
    if (!S.sm) S.sm = new Float32Array(NB);
    for (let i = 0; i < NB; i++) {
      let acc = 0, wsum = 0;
      for (let k = -4; k <= 4; k++) { const wk = 5 - Math.abs(k); acc += clamp(S.bars[(i + k + NB) % NB], 0, 1.4) * wk; wsum += wk; }
      S.sm[i] = acc / wsum;
    }
    // active states (talking, listening, music) keep the plasma awake between sounds
    const base = clamp((p.energy - .3) * .35, 0, .2) * Math.min(1, p.gain);
    const field = a => S.sm[Math.floor(((a % TAU + TAU) % TAU) / TAU * NB) % NB] + base * (.6 + .4 * Math.sin(a * 2 + t * 1.3));
    const amp = ig * (REDUCED ? .5 : 1);
    // plasma corona: three living layers (periodic waves, so there is no seam)
    const PTS = S.mini ? 72 : 144, layers = [[pal.w, 0, 1], [pal.b, 1, .8], [pal.a, 2, .6]];
    const shape = (L, k) => {
      const a = k / PTS * TAU, e = field(a - Math.PI / 2);
      const w = .5 * Math.sin(a * 3 + t * (1.1 + L * .35) + L * 1.7) + .3 * Math.sin(a * 5 - t * (1.7 + L * .2) + L * 2.9) + .2 * Math.sin(a * 2 + t * .6 - L);
      const rip = .25 * Math.sin(a * 11 - t * (5 + L)) * e;
      const r = R * (1.012 + L * .03) + R * (.01 + .15 * e * (.6 + .3 * w + rip)) * amp + R * .008 * w;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const trace = L => { ctx.beginPath(); for (let k = 0; k <= PTS; k++) { const q = shape(L, k % PTS); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.closePath(); };
    const lvl = clamp(au.mid * .8 + au.bass * .6 + base * 1.5, 0, 1) * Math.min(1, p.gain) * amp;
    // the glowing body of the plasma, between the ring and the outer layer
    trace(2);
    g = ctx.createRadialGradient(cx, cy, R * .98, cx, cy, R * 1.55);
    g.addColorStop(0, col(pal.b, (.05 + .16 * lvl) * alpha)); g.addColorStop(.3, col(pal.a, (.02 + .08 * lvl) * alpha)); g.addColorStop(1, col(pal.m, 0));
    ctx.fillStyle = g; ctx.fill();
    for (const [c, L, k] of layers) {
      trace(L);
      ctx.strokeStyle = col(c, (.04 + .1 * lvl) * k * alpha); ctx.lineWidth = (S.mini ? 3 : 6) * sc; ctx.stroke();
      ctx.strokeStyle = col(mix(c, pal.w, .35), (.12 + .45 * lvl) * k * alpha); ctx.lineWidth = Math.max(.6, (L ? .8 : 1.2) * sc); ctx.stroke();
    }
    // AI circuit ring: a hairline where pulses of light run like signals, lighting up the nodes they cross
    const dr = R * 1.4, act = clamp(lvl * 1.4 + base, 0, 1);
    ctx.strokeStyle = col(pal.b, (.05 + .1 * act) * alpha); ctx.lineWidth = Math.max(.5, .7 * sc);
    ctx.beginPath(); ctx.arc(cx, cy, dr, 0, TAU); ctx.stroke();
    const NODES = S.mini ? 6 : 12, nrot = S.r2 * .35;
    if (!S.nf) S.nf = new Float32Array(NODES);
    if (!S.cm) S.cm = [{ a: 0, v: .9, l: .55 }, { a: 2.2, v: -.65, l: .4 }, { a: 4.1, v: 1.35, l: .3 }];
    if (!S.pk) S.pk = [];
    const near = (a1, a2) => Math.abs(((a1 - a2) % TAU + TAU + Math.PI) % TAU - Math.PI);
    const touch = a => { for (let n = 0; n < NODES; n++) if (near(a, nrot + n / NODES * TAU) < .05) S.nf[n] = 1; };
    // a light that runs along the ring, with a tail that fades behind it
    const runner = (head, dir, len, k, wHead) => {
      const steps = 10;
      for (let j = 0; j < steps; j++) {
        const u0 = j / steps, u1 = (j + 1) / steps, f = (1 - u0) ** 2;
        ctx.strokeStyle = col(mix(pal.b, pal.w, f), f * k * alpha); ctx.lineWidth = Math.max(.6, (.6 + 1.6 * f) * sc);
        ctx.beginPath(); ctx.arc(cx, cy, dr, Math.min(head - dir * len * u0, head - dir * len * u1), Math.max(head - dir * len * u0, head - dir * len * u1)); ctx.stroke();
      }
      const x = cx + Math.cos(head) * dr, y = cy + Math.sin(head) * dr;
      g = ctx.createRadialGradient(x, y, 0, x, y, wHead * sc);
      g.addColorStop(0, col(pal.w, .9 * k * alpha)); g.addColorStop(.3, col(pal.b, .35 * k * alpha)); g.addColorStop(1, col(pal.a, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, wHead * sc, 0, TAU); ctx.fill();
    };
    const spd = (REDUCED ? .35 : 1) * (.35 + 2.6 * act);
    for (const c of S.cm) {
      c.a += c.v * spd * dt; touch(c.a);
      runner(c.a, Math.sign(c.v), c.l * (.6 + .8 * act), (.4 + .6 * act) * amp, 9 + 7 * act);
    }
    // data packets: quick bursts sent around the ring on stronger sounds
    if (!REDUCED && ig >= 1) {
      let spawn = (au.high * .9 + au.bass * .5) * p.gain * dt * (S.mini ? 3 : 8);
      while (spawn > 0 && S.pk.length < (S.mini ? 4 : 14)) {
        if (spawn < 1 && Math.random() > spawn) break; spawn -= 1;
        S.pk.push({ a: Math.random() * TAU, v: (Math.random() < .5 ? -1 : 1) * (2.5 + Math.random() * 3), life: 0, max: .35 + Math.random() * .45 });
      }
    }
    for (let i = S.pk.length - 1; i >= 0; i--) {
      const q = S.pk[i]; q.life += dt; if (q.life > q.max) { S.pk.splice(i, 1); continue; }
      q.a += q.v * dt; touch(q.a);
      runner(q.a, Math.sign(q.v), .14, Math.sin(Math.PI * q.life / q.max) * amp, 4);
    }
    // the nodes: small marks across the ring that flash when a signal passes
    for (let n = 0; n < NODES; n++) {
      S.nf[n] *= Math.exp(-dt * 4);
      const a = nrot + n / NODES * TAU, f = S.nf[n], ca = Math.cos(a), sa = Math.sin(a), big = n % 3 === 0;
      const r0 = dr - (big ? 6 : 3.5) * sc, r1 = dr + (big ? 6 : 3.5) * sc;
      ctx.strokeStyle = col(mix(pal.b, pal.w, f), (.2 + .25 * act + .55 * f) * alpha); ctx.lineWidth = Math.max(.6, (big ? 1.4 : 1) * sc);
      ctx.beginPath(); ctx.moveTo(cx + ca * r0, cy + sa * r0); ctx.lineTo(cx + ca * r1, cy + sa * r1); ctx.stroke();
      if (f > .05) {
        const x = cx + ca * dr, y = cy + sa * dr;
        g = ctx.createRadialGradient(x, y, 0, x, y, 10 * sc);
        g.addColorStop(0, col(pal.w, .7 * f * alpha)); g.addColorStop(1, col(pal.b, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10 * sc, 0, TAU); ctx.fill();
      }
    }
    // energy pulses on the beats and stressed syllables
    S.pcd = (S.pcd || 0) - dt; if (!S.pulses) S.pulses = [];
    if (!REDUCED && ig >= 1 && au.bass * p.gain > .55 && S.pcd <= 0) { S.pulses.push({ age: 0, k: clamp(au.bass, .4, 1) }); S.pcd = .32; }
    for (let i = S.pulses.length - 1; i >= 0; i--) {
      const q = S.pulses[i]; q.age += dt; if (q.age > .9) { S.pulses.splice(i, 1); continue; }
      const k = q.age / .9, rr = R * (1.05 + expo(k) * .6), a = (1 - k) ** 2 * q.k;
      ctx.strokeStyle = col(pal.b, .3 * a * alpha); ctx.lineWidth = (.8 + 2.5 * (1 - k)) * sc;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
    }
    // plasma arcs: short-lived bridges of energy that leap between two points of the ring
    if (!S.fil) S.fil = [];
    if (!REDUCED && ig >= 1) {
      let spawn = (au.mid * .45 + au.high * 1.1 + au.bass * .35) * p.gain * dt * (S.mini ? 2 : 6);
      while (spawn > 0 && S.fil.length < (S.mini ? 2 : 5)) {
        if (spawn < 1 && Math.random() > spawn) break; spawn -= 1;
        let a = Math.random() * TAU; for (let tr = 0; tr < 3 && field(a) < .35 * Math.random(); tr++) a = Math.random() * TAU;
        const e = field(a);
        S.fil.push({ a, span: (.12 + .3 * Math.random()) * (Math.random() < .5 ? -1 : 1), h: R * (.04 + .12 * Math.random()) * (.6 + e), seed: Math.random() * 100, life: 0, max: .12 + Math.random() * .22 });
      }
    }
    for (let i = S.fil.length - 1; i >= 0; i--) {
      const f = S.fil[i]; f.life += dt; if (f.life > f.max) { S.fil.splice(i, 1); continue; }
      const k = Math.sin(Math.PI * f.life / f.max) * (n1(f.seed + t * 25) > .25 ? 1 : .5), r0 = R * 1.015;
      ctx.beginPath();
      for (let j = 0; j <= 14; j++) {
        const u = j / 14, ang = f.a + f.span * u, bulge = Math.sin(Math.PI * u);
        const r = r0 + f.h * bulge + (n1(f.seed + j * 5.1 + t * 38) - .5) * 6 * sc * bulge;
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = col(pal.b, .16 * k * alpha); ctx.lineWidth = 4 * sc; ctx.stroke();
      ctx.strokeStyle = col(mix(pal.w, pal.b, .25), .8 * k * alpha); ctx.lineWidth = Math.max(.6, .9 * sc); ctx.stroke();
    }
    // ejected energy: glowing motes that drift outward and curl
    if (!REDUCED) {
      let spawn = au.high * p.gain * dt * (S.mini ? 24 : 80) * ig;
      while (spawn > 0 && S.sparks.length < (S.mini ? 40 : 200)) {
        if (spawn < 1 && Math.random() > spawn) break; spawn -= 1;
        const a = Math.random() * TAU;
        S.sparks.push({ a, r: R * (1.05 + .3 * field(a)), v: (40 + Math.random() * 160) * sc, life: 0, max: .6 + Math.random() * .9 });
      }
    }
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const s = S.sparks[i]; s.life += dt; s.r += s.v * dt; s.v *= Math.exp(-dt * 1.8); s.a += .35 * dt;
      if (s.life > s.max) { S.sparks.splice(i, 1); continue; }
      const k = 1 - s.life / s.max, ca = Math.cos(s.a), sa = Math.sin(s.a), l = (3 + s.v * .03) * sc, x = cx + ca * s.r, y = cy + sa * s.r;
      ctx.strokeStyle = col(mix(pal.w, pal.b, 1 - k), k * .35 * alpha); ctx.lineWidth = 1 * sc;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx + Math.cos(s.a - .02) * (s.r - l), cy + Math.sin(s.a - .02) * (s.r - l)); ctx.stroke();
      const d = Math.max(1, 1.8 * sc * k);
      ctx.fillStyle = col(mix(pal.w, pal.b, 1 - k), k * .95 * alpha); ctx.fillRect(x - d / 2, y - d / 2, d, d);
    }
    // orbits
    const R2 = R * R * .96;
    S.orb.forEach((o, oi) => {
      const kO = B ? B.orbits[oi] : 1; if (kO <= 0) return;
      const cc = pal[o.c], ci = Math.cos(o.cinc), si = Math.sin(o.cinc), cn = Math.cos(o.cnode), sn = Math.sin(o.cnode), rr = o.crr * R;
      const P = phi => { const x = Math.cos(phi) * rr, y0 = Math.sin(phi) * rr, y = y0 * ci; return [cx + x * cn - y * sn, cy + x * sn + y * cn, y0 * si]; };
      const occ = q => q[2] < 0 && ((q[0] - cx) ** 2 + (q[1] - cy) ** 2) < R2;
      const dir = o.sp >= 0 ? 1 : -1;
      // faint path
      ctx.strokeStyle = col(cc, (.06 + .05 * p.energy) * alpha * (B ? 1 : 1)); ctx.lineWidth = .7 * sc;
      ctx.beginPath(); let pen = false; const segs = S.mini ? 40 : 72, span = TAU * kO;
      for (let k = 0; k <= segs; k++) { const q = P(o.ph - dir * span * (k / segs)); if (occ(q)) { pen = false; continue; } pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; }
      ctx.stroke();
      // trail
      const steps = S.mini ? 14 : 26, tr = o.tr * (1 + .4 * p.align) * Math.min(1, kO * 1.5);
      let prev = P(o.ph - dir * tr);
      for (let k = 1; k <= steps; k++) {
        const u = k / steps, q = P(o.ph - dir * tr * (1 - u));
        if (!occ(q) && !occ(prev)) {
          ctx.strokeStyle = col(cc, u * u * .85 * alpha); ctx.lineWidth = o.w * (.4 + u * 1.5) * sc;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
        prev = q;
      }
      const hd = P(o.ph);
      if (!occ(hd)) {
        ctx.fillStyle = col(cc, .25 * alpha); ctx.beginPath(); ctx.arc(hd[0], hd[1], 6 * sc * o.w, 0, TAU); ctx.fill();
        ctx.fillStyle = col(pal.w, .95 * alpha); ctx.beginPath(); ctx.arc(hd[0], hd[1], 1.6 * sc * o.w, 0, TAU); ctx.fill();
      }
    });
    // shockwaves
    for (let i = S.shocks.length - 1; i >= 0; i--) {
      const s = S.shocks[i]; s.age += dt; if (s.age > 1.3) { S.shocks.splice(i, 1); continue; }
      const k = s.age / 1.3, rr = R * (1 + expo(k) * 3.4), a = (1 - k) ** 2;
      ctx.strokeStyle = col(pal.w, .7 * a * alpha); ctx.lineWidth = (1 + 5 * (1 - k)) * sc; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
      g = ctx.createRadialGradient(cx, cy, rr * .8, cx, cy, rr); g.addColorStop(0, col(pal.a, 0)); g.addColorStop(1, col(pal.b, .18 * a * alpha));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawAction(ctx, S, dt, pal) {
    const A = S.act;
    if (A) {
      A.age += dt; const k = clamp(A.age / A.dur, 0, 1), u = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const mx = (A.x0 + A.x1) / 2, my = Math.min(A.y0, A.y1) - 220;
      const x = (1 - u) ** 2 * A.x0 + 2 * (1 - u) * u * mx + u * u * A.x1, y = (1 - u) ** 2 * A.y0 + 2 * (1 - u) * u * my + u * u * A.y1;
      A.tr.push([x, y]); if (A.tr.length > 34) A.tr.shift();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < A.tr.length; i++) { const f = i / A.tr.length; ctx.strokeStyle = col(mix(pal.b, pal.w, f), f * f * .9); ctx.lineWidth = f * 3.5; ctx.beginPath(); ctx.moveTo(A.tr[i - 1][0], A.tr[i - 1][1]); ctx.lineTo(A.tr[i][0], A.tr[i][1]); ctx.stroke(); }
      const g = ctx.createRadialGradient(x, y, 0, x, y, 22); g.addColorStop(0, col(pal.w, 1)); g.addColorStop(.25, col(pal.b, .5)); g.addColorStop(1, col(pal.a, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill(); ctx.restore();
      if (k >= 1) { S.bursts.push({ x: A.x1, y: A.y1, age: 0 }); const cb = A.cb; S.act = null; cb && setTimeout(cb, 0); }
    }
    for (let i = S.bursts.length - 1; i >= 0; i--) {
      const b = S.bursts[i]; b.age += dt; if (b.age > .8) { S.bursts.splice(i, 1); continue; }
      const k = b.age / .8; ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col(pal.w, (1 - k) * .9); ctx.lineWidth = 2 * (1 - k) + .5; ctx.beginPath(); ctx.arc(b.x, b.y, 6 + expo(k) * 46, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }

  // ---------- background ----------
  function makeNoise2(seed) {
    const r = rng(seed), P = 256, g = new Float32Array(P * P); for (let i = 0; i < P * P; i++) g[i] = r();
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = g[(yi & 255) * P + (xi & 255)], b = g[(yi & 255) * P + ((xi + 1) & 255)], c = g[((yi + 1) & 255) * P + (xi & 255)], d = g[((yi + 1) & 255) * P + ((xi + 1) & 255)];
      return lerp(lerp(a, b, u), lerp(c, d, u), v); };
  }
  function fbm(n, x, y, o) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, o)); }
  function density(seed, w, h, o) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data, n = makeNoise2(seed);
    const ca = Math.cos(o.ang * D2R), sa = Math.sin(o.ang * D2R);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const u = i / w, v = j / h, qx = fbm(n, u * 3 + 1.7, v * 3 + 9.2, 3), qy = fbm(n, u * 3 + 8.3, v * 3 + 2.8, 3);
      const f = fbm(n, u * o.sc + qx * o.warp, v * o.sc * .6 + qy * o.warp, 5);
      const dx = u - .5, dy = (v - .5) * .6, along = dx * ca + dy * sa, across = -dx * sa + dy * ca;
      const band = Math.exp(-(across * across) / (o.bw * o.bw)) * (1 - Math.min(1, Math.abs(along) * 1.3) * .5);
      let e = clamp((f - o.th) / (1 - o.th), 0, 1); e = Math.pow(e, o.pw) * band;
      const k = (j * w + i) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(e * 255 * o.gain, 0, 255);
    }
    x.putImageData(img, 0, 0); return c;
  }
  const NEB = [];
  const NEB_OPTS = [
    { seed: 11, sc: 2.4, warp: 1.4, th: .36, pw: 1.25, ang: -24, bw: .34, gain: 1.15, a: .85, per: 97, ph: 0 },
    { seed: 23, sc: 3.2, warp: 1.8, th: .46, pw: 1.5, ang: -30, bw: .22, gain: 1.1, a: .4, per: 71, ph: 2 },
    { seed: 37, sc: 1.8, warp: 1, th: .4, pw: 1.2, ang: 22, bw: .46, gain: .9, a: .55, per: 118, ph: 4 },
    { seed: 51, sc: 5, warp: 2, th: .54, pw: 1.8, ang: -26, bw: .16, gain: 1, a: .32, per: 83, ph: 1 },
  ];
  function buildNebula() {
    NEB_OPTS.forEach((o, i) => {
      const d = density(o.seed, 340, 192, o), t = document.createElement('canvas'), big = document.createElement('canvas');
      t.width = d.width; t.height = d.height; big.width = 960; big.height = 540;
      NEB[i] = { d, t, big, key: '' };
    });
  }
  function tintNeb(i, c) {
    // quantized so the theme transition re-tints a few times, not every frame
    const N = NEB[i], key = (c[0] >> 2) + ',' + (c[1] >> 2) + ',' + (c[2] >> 2);
    if (N.key === key) return N.big; N.key = key;
    const x = N.t.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, N.t.width, N.t.height);
    x.drawImage(N.d, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col(c, 1); x.fillRect(0, 0, N.t.width, N.t.height);
    const b = N.big.getContext('2d'); b.clearRect(0, 0, 960, 540); b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high'; b.drawImage(N.t, 0, 0, 960, 540);
    return N.big;
  }
  function makeStars(n, seed, s0, s1) {
    const r = rng(seed), a = [];
    for (let i = 0; i < n; i++) a.push({ x: r() * W, y: r() * H, s: s0 + r() * (s1 - s0), a: .25 + r() * .75, tw: r() < .35 ? .6 + r() * 2.6 : 0, ph: r() * TAU, c: r() < .14 ? 1 : r() < .3 ? 2 : 0 });
    return a;
  }
  const SC = [[236, 232, 255], [255, 222, 192], [192, 206, 255]];
  const STARS = [makeStars(760, 3, .5, 1.1), makeStars(230, 5, 1, 1.7), makeStars(34, 9, 1.4, 2.4)];
  const PAR = [.004, .01, .02];
  let flare = null;
  function makeFlare() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    let g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.08, 'rgba(255,255,255,.6)'); g.addColorStop(.3, 'rgba(200,190,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 31.5, 64, 1);
    g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(31.5, 0, 1, 64); return c;
  }
  const LINES = (() => { const r = rng(21), a = []; for (let i = 0; i < 6; i++) a.push({ rx: 520 + r() * 620, ry: .22 + r() * .3, rot: (-28 + r() * 56) * D2R, a0: r() * TAU, span: 1 + r() * 1.3, sp: (.008 + r() * .02) * (r() < .5 ? -1 : 1), w: .6 + r() * .6, ps: .2 + r() * .4 }); return a; })();
  let shoot = null, nextShoot = 7;
  let vign = null;

  function drawBg(ctx, dt, t, L, gal) {
    const Q = QF[QUALITY];
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#05030A'; ctx.fillRect(0, 0, W, H);
    const mx = REDUCED ? 0 : mouse.sx, my = REDUCED ? 0 : mouse.sy;
    if (gal <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    // core haze
    let g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, 820);
    g.addColorStop(0, col(THEME.a, .16 * gal)); g.addColorStop(.5, col(THEME.m, .035 * gal)); g.addColorStop(1, col(THEME.a, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // nebula
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    const tt = REDUCED ? 0 : t;
    NEB_OPTS.forEach((o, i) => {
      const img = tintNeb(i, THEME.n[i]);
      const ox = Math.sin(tt / o.per * TAU + o.ph) * 60 - mx * W * .012 * (1 + i * .2), oy = Math.cos(tt / o.per * TAU * .8 + o.ph) * 34 - my * H * .012;
      const s = 1.2 + .03 * Math.sin(tt / o.per * TAU * .5 + i);
      ctx.globalAlpha = o.a * gal; ctx.drawImage(img, W / 2 - W * s / 2 + ox, H / 2 - H * s / 2 + oy, W * s, H * s);
    });
    ctx.globalAlpha = 1;
    // stars
    if (!flare) flare = makeFlare();
    STARS.forEach((layer, li) => {
      const px = -mx * W * PAR[li] + tt * (li + 1) * .6, py = -my * H * PAR[li];
      for (let q = 0; q < 3; q++) {
        ctx.fillStyle = col(SC[q], 1);
        for (const s of layer) {
          if (s.c !== q) continue;
          const x = ((s.x + px) % W + W) % W, y = ((s.y + py) % H + H) % H;
          let a = s.a * gal; if (s.tw && !REDUCED) a *= .45 + .55 * (.5 + .5 * Math.sin(t * s.tw + s.ph));
          ctx.globalAlpha = a;
          if (li === 2) { const z = s.s * 11; ctx.drawImage(flare, x - z / 2, y - z / 2, z, z); }
          else ctx.fillRect(x, y, s.s, s.s);
        }
      }
    });
    ctx.globalAlpha = 1;
    // field lines
    LINES.slice(0, Q.lines).forEach((l, i) => {
      const segs = 48, a0 = l.a0 + (REDUCED ? 0 : t * l.sp), cr = Math.cos(l.rot), sr = Math.sin(l.rot);
      const pulse = .5 + .5 * Math.sin(t * l.ps + i * 1.7);
      const chunk = 6;
      ctx.lineWidth = l.w;
      for (let k0 = 0; k0 < segs; k0 += chunk) {
        const um = (k0 + chunk / 2) / segs;
        ctx.strokeStyle = col(THEME.b, Math.sin(Math.PI * um) * (.05 + .07 * pulse) * gal);
        ctx.beginPath();
        for (let k = k0; k <= k0 + chunk; k++) {
          const u = k / segs, ang = a0 + l.span * u, x = Math.cos(ang) * l.rx, y = Math.sin(ang) * l.rx * l.ry;
          const X = L.x + x * cr - y * sr - mx * 14, Y = L.y + x * sr + y * cr - my * 10;
          k === k0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
        }
        ctx.stroke();
      }
    });
    // shooting star
    if (!REDUCED) {
      if (!shoot && t > nextShoot) { const r = Math.random(); shoot = { x: W * (.45 + r * .5), y: -20 + Math.random() * H * .25, age: 0 }; nextShoot = t + 30 + Math.random() * 30; }
      if (shoot) {
        shoot.age += dt; const k = shoot.age / 1.2; if (k > 1) shoot = null; else {
          const x = shoot.x - 820 * shoot.age, y = shoot.y + 380 * shoot.age, a = Math.sin(Math.PI * k) * .75 * gal;
          g = ctx.createLinearGradient(x, y, x + 190, y - 88); g.addColorStop(0, col(THEME.w, a)); g.addColorStop(1, col(THEME.b, 0));
          ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 190, y - 88); ctx.stroke();
        }
      }
    }
    // vignette
    ctx.globalCompositeOperation = 'source-over';
    if (!vign) { vign = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62); vign.addColorStop(0, 'rgba(5,3,10,0)'); vign.addColorStop(1, 'rgba(3,2,6,.82)'); }
    ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
  }


  function drawHud(ctx, S, cx, cy, R, t, a, pal) {
    if (a <= .01) return;
    const sc = R / 150, rm = REDUCED ? 0 : 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1;
    const r1 = R * 2.0, rot = t * .02 * rm;
    ctx.strokeStyle = col(pal.b, .12 * a); ctx.beginPath(); ctx.arc(cx, cy, r1, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col(pal.b, .34 * a); ctx.beginPath();
    for (let i = 0; i < 180; i++) { const an = rot + i / 180 * TAU, L = (i % 15 === 0 ? 11 : i % 5 === 0 ? 6 : 3) * sc, c = Math.cos(an), s2 = Math.sin(an); ctx.moveTo(cx + c * r1, cy + s2 * r1); ctx.lineTo(cx + c * (r1 + L), cy + s2 * (r1 + L)); }
    ctx.stroke();
    if (sc > .5) {
      ctx.fillStyle = col(pal.b, .42 * a); ctx.font = Math.round(Math.max(8, 9 * sc)) + 'px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) { const an = rot + i / 12 * TAU, rr = r1 - 12 * sc; ctx.fillText(String(i * 30).padStart(3, '0'), cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
    }
    if (ctx.createConicGradient && !REDUCED) {
      const g = ctx.createConicGradient(t * .8, cx, cy);
      g.addColorStop(0, col(pal.b, 0)); g.addColorStop(.72, col(pal.b, 0)); g.addColorStop(.995, col(pal.b, (.06 + .08 * S.p.energy) * a)); g.addColorStop(1, col(pal.b, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, TAU); ctx.arc(cx, cy, R * 1.12, 0, TAU, true); ctx.fill();
    }
    const r2 = R * 2.2, rot2 = -t * .045 * rm;
    ctx.lineWidth = Math.max(1, 1.4 * sc); ctx.strokeStyle = col(pal.b, .55 * a);
    for (let k = 0; k < 4; k++) {
      const a0 = rot2 + k * TAU / 4 - .2, a1 = a0 + .4;
      ctx.beginPath(); ctx.arc(cx, cy, r2, a0, a1); ctx.stroke();
      [a0, a1].forEach(q => { ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * (r2 - 5 * sc), cy + Math.sin(q) * (r2 - 5 * sc)); ctx.lineTo(cx + Math.cos(q) * (r2 + 5 * sc), cy + Math.sin(q) * (r2 + 5 * sc)); ctx.stroke(); });
      const m = a0 + .2, mx = cx + Math.cos(m) * (r2 + 9 * sc), my = cy + Math.sin(m) * (r2 + 9 * sc);
      ctx.fillStyle = col(pal.w, .7 * a); ctx.beginPath(); ctx.arc(mx, my, 1.6 * sc, 0, TAU); ctx.fill();
    }
    ctx.setLineDash([2 * sc, 9 * sc]); ctx.lineDashOffset = -t * 6 * rm; ctx.strokeStyle = col(pal.a, .4 * a); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * 2.36, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (sc > .7) {
      const au = S.au, fs = Math.round(10 * Math.max(.9, sc));
      ctx.font = fs + 'px "JetBrains Mono", monospace'; ctx.textBaseline = 'alphabetic';
      const ro = (ang, dx, dy, w, l1, l2, left) => {
        const x0 = cx + Math.cos(ang) * r2, y0 = cy + Math.sin(ang) * r2, x1 = cx + dx * R, y1 = cy + dy * R, x2 = x1 + (left ? -w : w);
        ctx.strokeStyle = col(pal.b, .45 * a); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
        ctx.fillStyle = col(pal.w, .9 * a); ctx.beginPath(); ctx.arc(x0, y0, 2, 0, TAU); ctx.fill();
        ctx.textAlign = left ? 'right' : 'left'; const tx = left ? x1 - 4 : x1 + 4;
        ctx.fillStyle = col(pal.b, .85 * a); ctx.fillText(l1, tx, y1 - 7);
        ctx.fillStyle = col(pal.b, .5 * a); ctx.fillText(l2, tx, y1 + 15);
      };
      ro(-.62, 1.95, -1.55, 200, 'NÚCLEO · E ' + S.p.energy.toFixed(3), 'GRAVES ' + au.bass.toFixed(2) + ' · ' + (80 + au.bass * 140).toFixed(1) + ' HZ', false);
      ro(Math.PI - .55, -1.95, 1.45, 200, 'ÓRBITAS 08 · ω ' + S.p.spin.toFixed(2), 'HALO ' + S.NB + ' CH · MEDIOS ' + au.mid.toFixed(2), true);
    }
    ctx.restore();
  }
  const GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/#%*+=';
  let scr = [], teles = [], fpsS = 60, teleT = 0;
  const T0 = performance.now();
  function scrTick(now) {
    for (const el of scr) {
      if (!el.isConnected || el.childNodes.length !== 1) continue;
      const n = el.firstChild; if (n.nodeType !== 3) continue;
      const cur = n.nodeValue;
      if (cur !== el.__w) { el.__f = cur; el.__t0 = now; el.__dur = Math.min(900, 240 + cur.length * 20) * (el.__seen ? .55 : 1); el.__seen = 1; }
      if (el.__t0 == null) continue;
      const p = (now - el.__t0) / el.__dur, f = el.__f; let out;
      if (p >= 1 || REDUCED) { out = f; el.__t0 = null; }
      else { const k = Math.floor(p * p * f.length); out = ''; for (let i = 0; i < f.length; i++) { const ch = f[i]; out += (i < k || ch === ' ' || ch === '·') ? ch : GLY[(Math.random() * GLY.length) | 0]; } }
      if (out !== cur) n.nodeValue = out; el.__w = out;
    }
  }
  function teleTick(now) {
    const up = Math.floor((now - T0) / 1000), hh = String(Math.floor(up / 3600)).padStart(2, '0'), mm = String(Math.floor(up / 60) % 60).padStart(2, '0'), ss = String(up % 60).padStart(2, '0');
    const d = new Date(), au = M.S ? M.S.au : { bass: 0 };
    const V = { uptime: hh + ':' + mm + ':' + ss, sec: String(d.getSeconds()).padStart(2, '0'), lat: (11 + Math.random() * 3).toFixed(1), fps: String(Math.round(fpsS)),
      energy: M.S ? M.S.p.energy.toFixed(3) : '0.000', freq: (80 + au.bass * 140).toFixed(1), hex: '0x' + ((Math.random() * 65535) | 0).toString(16).toUpperCase().padStart(4, '0') };
    teles.forEach(el => {
      const v = V[el.dataset.tele]; if (v === undefined) return;
      const n = el.firstChild;
      if (n && n.nodeType === 3) { if (n.nodeValue !== v) n.nodeValue = v; } else el.textContent = v;
    });
  }
  let needScan = true;
  // rescan only when elements (not just text) are added or removed
  try {
    new MutationObserver(muts => {
      if (needScan) return;
      for (const m of muts) {
        for (const n of m.addedNodes) if (n.nodeType === 1) { needScan = true; return; }
        for (const n of m.removedNodes) if (n.nodeType === 1) { needScan = true; return; }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  // ---------- main + registry ----------
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', e => {
    mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5;
    const el = e.target && e.target.closest && e.target.closest('[data-spot]');
    if (el) { const r = el.getBoundingClientRect(), k = r.width / (el.offsetWidth || 1); el.style.setProperty('--mx', ((e.clientX - r.left) / k) + 'px'); el.style.setProperty('--my', ((e.clientY - r.top) / k) + 'px'); }
  }, { passive: true });

  const M = { bg: null, core: null, S: null, L: { x: 960, y: 500, s: 1, v: 1 }, T: { x: 960, y: 500, s: 1, v: 1 }, boot: null, gal: 1 };
  const minis = new Map(); let waves = [], meters = [], grains = [];
  let tAcc = 0, scanT = 0, last = 0, T = 0;

  // the stage is always 1920x1080 scaled by min(innerWidth/1920, innerHeight/1080);
  // the background canvas covers the whole window instead (object-fit: cover)
  function fit(c, lw, lh, cover) {
    if (!c.isConnected) return 0;
    const shown = lw * (cover ? Math.max : Math.min)(innerWidth / W, innerHeight / H); if (shown < 2) return 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1), qf = QF[QUALITY].res;
    const w = Math.min(2400, Math.round(shown * dpr * qf)), h = Math.round(w * lh / lw);
    if (Math.abs(c.width - w) > 2 || Math.abs(c.height - h) > 2) { c.width = w; c.height = h; }
    return c.width / lw;
  }
  function scan() {
    const bg = document.querySelector('[data-nexus-main="bg"]'), core = document.querySelector('[data-nexus-main="core"]');
    M.bg = bg; M.core = core;
    if (core && !M.S) M.S = makeSim(QF[QUALITY].parts, 42, false);
    const seen = new Set();
    document.querySelectorAll('canvas[data-nexus-core]').forEach((c, i) => {
      seen.add(c);
      if (!minis.has(c)) minis.set(c, makeSim(+(c.dataset.particles || 360), 100 + i * 17, true));
    });
    for (const c of minis.keys()) if (!seen.has(c)) minis.delete(c);
    waves = [...document.querySelectorAll('canvas[data-nexus-wave]')];
    meters = [...document.querySelectorAll('[data-nexus-meter]')];
    const gs = [...document.querySelectorAll('[data-nexus-grain]')];
    gs.forEach(g => { if (!g.__nx) { g.__nx = 1; g.style.backgroundImage = 'url(' + grainURL() + ')'; g.style.inset = '-180px'; g.style.willChange = 'transform'; } });
    grains = gs;
    scr = [...document.querySelectorAll('[data-scramble]')];
    teles = [...document.querySelectorAll('[data-tele]')];
  }
  let gURL = null;
  function grainURL() {
    if (gURL) return gURL; const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d'), d = x.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; }
    x.putImageData(d, 0, 0); return gURL = c.toDataURL();
  }

  function bootFactors(bt) {
    if (REDUCED) { const k = sstep(0, 1.2, bt); return { point: 1, burst: k, ring: k, ignite: k, orbits: OD.map(() => k), gal: k }; }
    return { point: sstep(.35, .9, bt), burst: expo(clamp((bt - 1) / 1.1, 0, 1)), ring: expo(clamp((bt - 1.15) / .8, 0, 1)), ignite: clamp((bt - 1.4) / .6, 0, 1),
      orbits: OD.map((_, i) => expo(clamp((bt - 1.55 - i * .13) / .75, 0, 1))), gal: sstep(2.1, 3.6, bt) };
  }

  // Power levels, so NEXUS can stay on all day without using the PC:
  //   full  — talking, listening, booting: the quality's own frame rate (60 fps)
  //   idle  — on screen with nothing happening: 30 fps, slower galaxy, grain and telemetry
  //   calm  — on screen but you are using something else: 15 fps
  //   pause — not drawn at all (hidden, covered, or the user wants a still wallpaper)
  const POWER = { full: { dt: 0, bg: 1, grain: .07, tele: .12 }, idle: { dt: 33, bg: 2, grain: .25, tele: .5 }, calm: { dt: 66, bg: 3, grain: 0, tele: 1 } };
  let rafId = 0, bgSkip = 0, bgDt = 0, paused = false, power = 'idle';
  const P = () => POWER[power] || POWER.idle;
  function schedule() { if (!rafId && !document.hidden && !paused) rafId = requestAnimationFrame(onRaf); }
  function onRaf(now) {
    rafId = 0; schedule();
    // the boot animation always runs at full speed
    const minDt = M.boot ? QF[QUALITY].minDt : Math.max(QF[QUALITY].minDt, P().dt);
    if (last && now - last < minDt - 1.5) return;
    frame(now);
  }
  let shrinkT = 0;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(shrinkT);
    if (!document.hidden) { last = 0; schedule(); return; }
    // hidden for a minute: shrink the big canvases so the GPU frees their memory; fit() restores them
    shrinkT = setTimeout(() => { [M.bg, M.core].forEach(c => { if (c) { c.width = 1; c.height = 1; } }); minis.forEach((_, c) => { c.width = 1; c.height = 1; }); }, 60000);
  });
  function frame(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; T += dt;
    if (now - scanT > 400 || (needScan && now - scanT > 60)) { scanT = now; needScan = false; scan(); }
    if (dt > 0) fpsS = lerp(fpsS, Math.min(120, 1 / dt), .05);
    scrTick(now); if (now - teleT > P().tele * 1000) { teleT = now; teleTick(now); }
    mouse.sx = lerp(mouse.sx, mouse.x, 1 - Math.exp(-dt * 2)); mouse.sy = lerp(mouse.sy, mouse.y, 1 - Math.exp(-dt * 2));
    // theme lerp
    const kt = 1 - Math.exp(-dt * 2.5);
    ['a', 'b', 'm', 'w', 'g'].forEach(k => THEME[k] = mix(THEME[k], THEME_T[k], kt)); THEME.n = THEME.n.map((c, i) => mix(c, THEME_T.n[i], kt));
    // main
    let B = null;
    if (M.boot) {
      const bt = (performance.now() - M.boot.t0) / 1000; B = bootFactors(bt);
      if (bt > (REDUCED ? .6 : 3.1) && !M.boot.ui) { M.boot.ui = 1; M.boot.onUI && M.boot.onUI(); }
      if (bt > (REDUCED ? 1.3 : 4.1)) { const cb = M.boot.onDone; M.boot = null; B = null; cb && cb(); }
      if (B && !REDUCED && bt > 1 && !M.boot.burst) { M.boot.burst = 1; M.S.shocks.push({ age: 0 }); for (let i = 0; i < 90; i++) M.S.sparks.push({ a: Math.random() * TAU, r: 20, v: 120 + Math.random() * 420, life: 0, max: .6 + Math.random() * .9 }); }
    }
    const kl = 1 - Math.exp(-dt * (REDUCED ? 8 : 3.4)), L = M.L;
    L.x = lerp(L.x, M.T.x, kl); L.y = lerp(L.y, M.T.y, kl); L.s = lerp(L.s, M.T.s, kl); L.v = lerp(L.v, M.T.v, kl);
    if (M.bg) {
      // the galaxy moves slowly: redraw it less often, even less while a panel blurs it
      bgDt += dt;
      const every = B ? 1 : Math.max(M.bgSlow ? 3 : QF[QUALITY].bgEvery, P().bg);
      if (++bgSkip >= every) {
        bgSkip = 0;
        const k = fit(M.bg, W, H, true);
        if (k) { const c = M.bg.getContext('2d', { alpha: false }); c.setTransform(k, 0, 0, k, 0, 0); drawBg(c, bgDt, T, L, B ? B.gal : M.gal); }
        bgDt = 0;
      }
    }
    if (M.core && M.S) {
      updateSim(M.S, dt, T, true);
      const k = fit(M.core, W, H);
      if (k) {
        const c = M.core.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, W, H);
        if (!B || B.point > 0) drawCore(c, M.S, L.x, L.y, 150 * L.s, dt, T, B, clamp(L.v, 0, 1));
        drawAction(c, M.S, dt, palette(M.S));
      }
    }
    // minis
    minis.forEach((S, c) => {
      const r = c.getBoundingClientRect(); if (r.width < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      const ds = c.dataset; if (ds.state && ds.state !== S.state) setSimState(S, ds.state);
      if (S.state === 'wake') { S.loop += dt; if (S.loop > 2.6) { S.loop = 0; S.state = 'idle'; setSimState(S, 'wake'); } }
      updateSim(S, dt, T, false);
      const lw = c.offsetWidth || r.width, lh = c.offsetHeight || r.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      const x = c.getContext('2d'); x.setTransform(cw / lw, 0, 0, ch / lh, 0, 0); x.clearRect(0, 0, lw, lh);
      const R = Math.min(lw, lh) * (+(ds.r || .24));
      drawCore(x, S, lw / 2, lh / 2, R, dt, T, null, 1);
      if (S.state === 'action') {
        if (!S.act) { S.loop += dt; if (S.loop > .7) { S.loop = 0; S.act = { x0: lw / 2, y0: lh / 2, x1: lw * .92, y1: lh * .12, age: 0, dur: 1, tr: [] }; } }
        drawAction(x, S, dt, palette(S));
      }
    });
    // waves
    const au = M.S ? M.S.au : { mid: 0, bass: 0, high: 0 }, gn = M.S ? M.S.p.gain : .2;
    waves.forEach(c => {
      const r = c.getBoundingClientRect(); if (r.width < 4) return;
      const lw = c.offsetWidth, lh = c.offsetHeight, dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      const x = c.getContext('2d'); x.setTransform(cw / lw, 0, 0, ch / lh, 0, 0); x.clearRect(0, 0, lw, lh); x.globalCompositeOperation = 'lighter';
      const amp = (.06 + (au.mid * .9 + au.bass * .4) * Math.min(1, gn)) * lh * .45, pal = M.S ? palette(M.S) : THEME;
      for (let j = 0; j < 3; j++) {
        x.strokeStyle = col(j ? pal.a : pal.b, j ? .35 / j : .9); x.lineWidth = j ? 1 : 1.4; x.beginPath();
        for (let i = 0; i <= lw; i += 2) {
          const u = i / lw, env = Math.pow(Math.sin(Math.PI * u), 1.6);
          const y = lh / 2 + Math.sin(i * (.045 + j * .012) - T * (3 + j) + j * 1.9) * amp * env * (.55 + .45 * n1(i * .02 + T * 2 + j * 5));
          i ? x.lineTo(i, y) : x.moveTo(i, y);
        }
        x.stroke();
      }
    });
    const lvl = clamp(au.mid * gn * 1.1 + au.bass * .3, 0, 1);
    meters.forEach(m => m.style.transform = 'scaleX(' + lvl.toFixed(3) + ')');
    // moving the film grain repaints the whole window: less often when calm, still when idle in the background
    tAcc += dt; const gEvery = P().grain; if (gEvery && tAcc > gEvery) { tAcc = 0; grains.forEach(g => { g.style.display = QF[QUALITY].grain ? '' : 'none'; g.style.transform = 'translate(' + ((Math.random() * 180) | 0) + 'px,' + ((Math.random() * 180) | 0) + 'px)'; }); }
    // calm: no grain at all (it is a layer bigger than the screen, blended over everything)
    if (!gEvery) grains.forEach(g => { if (g.style.display !== 'none') g.style.display = 'none'; });
  }

  buildNebula();
  schedule();

  window.NexusEngine = {
    themes: Object.keys(THEMES),
    setState(s) { if (M.S) setSimState(M.S, s); else setTimeout(() => this.setState(s), 60); },
    getState() { return M.S ? M.S.state : 'idle'; },
    setCore(o) { Object.assign(M.T, o); },
    snapCore(o) { Object.assign(M.T, o); Object.assign(M.L, o); },
    setGalaxy(v) { M.gal = v; },
    // a panel is open and the background is blurred behind it
    setBgSlow(b) { M.bgSlow = !!b; },
    // stop drawing while a fullscreen app covers the desktop
    setPaused(b) { b = !!b; if (b === paused) return; paused = b; grains.forEach(g => { g.style.display = b || !QF[QUALITY].grain ? 'none' : ''; }); if (!b) { last = 0; schedule(); } },
    // full | idle | calm (see POWER)
    setPower(p) { if (POWER[p]) power = p; },
    getPower() { return paused ? 'pause' : power; },
    setTheme(n) { THEME_T = THEMES[n] || THEMES.solar; },
    setQuality(q) { if (!QF[q] || q === QUALITY) return; QUALITY = q; if (M.S) { const st = M.S.state; M.S = makeSim(QF[q].parts, 42, false); M.S.state = st; } },
    setReduced(b) { REDUCED = !!b; },
    setTint(rgb) { if (M.S) M.S.tintT = rgb; },
    poke() { if (M.S) M.S.poke = 1; },
    boot(o) { const run = () => { if (!M.S) return setTimeout(run, 50); M.boot = { t0: performance.now(), onUI: o && o.onUI, onDone: o && o.onDone }; setSimState(M.S, 'idle'); M.S.ignite = 1; M.S.sparks.length = 0; }; run(); },
    action(el, cb) {
      if (!M.S || !M.core || !el) { cb && cb(); return; }
      const r = M.core.getBoundingClientRect(), e = el.getBoundingClientRect();
      M.S.act = { x0: M.L.x, y0: M.L.y, x1: ((e.left + e.width / 2) - r.left) / r.width * W, y1: ((e.top + e.height / 2) - r.top) / r.height * H, age: 0, dur: REDUCED ? .4 : 1.05, tr: [], cb };
    },
    async enableMic() {
      if (mic) return true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new (window.AudioContext || window.webkitAudioContext)(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
      an.fftSize = 512; an.smoothingTimeConstant = .6; src.connect(an); mic = { ac, an, stream, buf: new Uint8Array(an.frequencyBinCount) }; return true;
    },
    disableMic() { if (mic) { mic.stream.getTracks().forEach(t => t.stop()); mic.ac.close(); mic = null; } },
    hasMic() { return !!mic; },
    // attach a Web Audio AnalyserNode that drives the core while in `state`
    attachSource(state, an) {
      if (!an) { delete sources[state]; return; }
      sources[state] = { an, buf: new Uint8Array(an.frequencyBinCount) };
    },
  };
})();
