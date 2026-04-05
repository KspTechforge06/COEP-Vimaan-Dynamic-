/* ─────────────────────────────────────────────
   incident.js  –  live incident canvas (wow section)
   ───────────────────────────────────────────── */

(function () {
  const ic   = document.getElementById('incident-canvas');
  const ictx = ic.getContext('2d');
  let icW, icH;

  function resize() {
    icW = ic.width  = ic.offsetWidth;
    icH = ic.height = ic.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Static city buildings ──────────────────────
  const bldgs = Array.from({ length: 26 }, () => ({
    x:    Math.random(),
    w:    16 + Math.random() * 36,
    h:    32 + Math.random() * 100,
    cols: 3 + Math.floor(Math.random() * 3),
    rows: 4 + Math.floor(Math.random() * 5),
    lit:  Array.from({ length: 50 }, () => Math.random() > .42),
  }));

  // ── Live state ─────────────────────────────────
  let incs = [];
  let dr2d = [];

  // ── Incident class ─────────────────────────────
  class Inc {
    constructor(x, y) {
      this.x     = x != null ? x : Math.random() * icW;
      this.y     = y != null ? y : 50 + Math.random() * icH * .7;
      this.age   = 0;
      this.alive = true;
      const types = [['CRITICAL', '255,80,40'], ['HIGH', '40,140,255'], ['MEDIUM', '0,255,136']];
      const type  = types[Math.floor(Math.random() * 3)];
      this.type = type[0];
      this.col  = type[1];
      dr2d.push(new Dr2(Math.random() * icW, Math.random() * 40, this));
    }

    update() {
      this.age++;
      if (this.age > 210) this.alive = false;
    }

    draw(ctx) {
      const a = Math.max(0, 1 - this.age / 210);
      const r = Math.min(26, this.age * .65);

      // Expanding rings
      for (let i = 2; i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * (1 + i * .5) * (1 + Math.sin(this.age * .1 + i) * .08), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.col},${a * .5 / (i + 1)})`; ctx.lineWidth = 1; ctx.stroke();
      }

      // Core dot
      ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.col},${a})`; ctx.fill();

      // Label
      ctx.fillStyle = `rgba(${this.col},${a * .9})`;
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('▲ ' + this.type, this.x, this.y - r - 8);

      // Corner brackets
      const s = r + 12;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        const bx = this.x + sx * s, by = this.y + sy * s, d = 6;
        ctx.beginPath(); ctx.strokeStyle = `rgba(${this.col},${a * .3})`; ctx.lineWidth = 1;
        ctx.moveTo(bx + sx * -d, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + sy * -d); ctx.stroke();
      });
    }
  }

  // ── Drone 2D class ─────────────────────────────
  class Dr2 {
    constructor(x, y, tgt) {
      this.x     = x;
      this.y     = y;
      this.tgt   = tgt;
      this.spd   = 2 + Math.random();
      this.trail = [];
      this.age   = 0;
    }

    update() {
      this.age++;
      const dx = this.tgt.x - this.x, dy = this.tgt.y - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > 16) { this.x += dx / d * this.spd; this.y += dy / d * this.spd; }
      this.trail.push({ x: this.x, y: this.y, a: 1 });
      this.trail = this.trail.slice(-14).map(t => ({ ...t, a: t.a * .83 }));
    }

    draw(ctx) {
      this.trail.forEach(t => {
        ctx.beginPath(); ctx.arc(t.x, t.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${t.a * .3})`; ctx.fill();
      });
      const ang = Math.atan2(this.tgt.y - this.y, this.tgt.x - this.x);
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(0,245,255,.9)';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, 4); ctx.lineTo(-3, 0); ctx.lineTo(-5, -4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // ── Spawn initial incidents ────────────────────
  setInterval(() => { if (incs.length < 7) incs.push(new Inc()); }, 2200);
  setTimeout(() => incs.push(new Inc()), 300);
  setTimeout(() => incs.push(new Inc()), 900);

  // ── Click to deploy ────────────────────────────
  ic.addEventListener('click', e => {
    const r = ic.getBoundingClientRect();
    incs.push(new Inc(e.clientX - r.left, e.clientY - r.top));
    // Play audio if initialised
    if (typeof beep === 'function') {
      beep(660, .1);
      setTimeout(() => beep(990, .06), 110);
    }
  });

  // ── Render loop ────────────────────────────────
  function animIC() {
    requestAnimationFrame(animIC);
    ictx.clearRect(0, 0, icW, icH);

    // Background
    ictx.fillStyle = 'rgba(3,4,14,.97)'; ictx.fillRect(0, 0, icW, icH);

    // Grid
    ictx.strokeStyle = 'rgba(0,245,255,.035)'; ictx.lineWidth = .5;
    for (let x = 0; x < icW; x += 40) { ictx.beginPath(); ictx.moveTo(x, 0); ictx.lineTo(x, icH); ictx.stroke(); }
    for (let y = 0; y < icH; y += 40) { ictx.beginPath(); ictx.moveTo(0, y); ictx.lineTo(icW, y); ictx.stroke(); }

    // Buildings
    bldgs.forEach(b => {
      const bx = b.x * icW, by = icH - b.h;
      const cw = b.w / b.cols, rh = b.h / b.rows;
      ictx.fillStyle = 'rgba(7,9,24,.92)'; ictx.fillRect(bx, by, b.w, b.h);
      ictx.strokeStyle = 'rgba(0,245,255,.06)'; ictx.lineWidth = .5; ictx.strokeRect(bx, by, b.w, b.h);
      for (let c = 0; c < b.cols; c++) {
        for (let r = 0; r < b.rows; r++) {
          if (b.lit[c * b.rows + r] % 1) {
            ictx.fillStyle = 'rgba(100,160,255,.15)';
            ictx.fillRect(bx + c * cw + 2, by + r * rh + 2, cw - 4, rh - 4);
          }
        }
      }
    });

    // Horizon haze
    const hg = ictx.createLinearGradient(0, icH * .6, 0, icH);
    hg.addColorStop(0, 'rgba(0,12,30,.5)'); hg.addColorStop(1, 'rgba(0,0,8,0)');
    ictx.fillStyle = hg; ictx.fillRect(0, icH * .6, icW, icH * .4);

    // Incidents
    incs = incs.filter(i => i.alive);
    incs.forEach(i => { i.update(); i.draw(ictx); });

    // Drones
    dr2d = dr2d.filter(d => d.age < 260);
    dr2d.forEach(d => { d.update(); d.draw(ictx); });

    // HUD overlay
    ictx.fillStyle = 'rgba(0,245,255,.18)'; ictx.font = '9px monospace'; ictx.textAlign = 'left';
    ictx.fillText(
      `LAT 18.52°N  LNG 73.86°E  DRONES:${dr2d.length}  INCIDENTS:${incs.length}  — CLICK TO DEPLOY`,
      12, icH - 12,
    );
    ictx.textAlign = 'right';
    ictx.fillText(new Date().toTimeString().slice(0, 8), icW - 12, icH - 12);
  }
  animIC();
})();
