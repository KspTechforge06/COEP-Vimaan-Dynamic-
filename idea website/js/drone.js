/* ─────────────────────────────────────────────
   drone.js  –  Three.js scene, drone mesh, render loop
   Exports: window._cam, window._drone (used by main.js)
   ───────────────────────────────────────────── */

(function () {
  const c3      = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: c3, antialias: true, alpha: true });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const cam   = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 200);
  cam.position.set(0, 1.8, 7);
  cam.lookAt(0, 0, 0);

  // Expose for GSAP in main.js
  window._cam = cam;

  // ── Materials ──────────────────────────────────
  const bM    = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: .35, metalness: .9 });
  const aM    = new THREE.MeshStandardMaterial({ color: 0x0d0d14, roughness: .4,  metalness: .85 });
  const dkM   = new THREE.MeshStandardMaterial({ color: 0x090910, roughness: .6,  metalness: .7 });
  const glowC = new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 2.5, roughness: .1,  metalness: .3 });
  const ringC = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 3,   roughness: .05, metalness: .4 });
  const lensM = new THREE.MeshStandardMaterial({ color: 0x001133, emissive: 0x00aaff, emissiveIntensity: 1.8, roughness: .05, metalness: .5 });
  const propM = new THREE.MeshStandardMaterial({ color: 0x151520, roughness: .5, metalness: .7, transparent: true, opacity: .88 });

  // ── Drone group ────────────────────────────────
  const drone = new THREE.Group();
  scene.add(drone);
  window._drone = drone;

  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.52, .48, .32, 8), bM);
  body.position.y = .04;
  drone.add(body);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(.38, .16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bM);
  dome.position.y = .2;
  drone.add(dome);

  const bot = new THREE.Mesh(new THREE.CylinderGeometry(.42, .38, .18, 8), dkM);
  bot.position.y = -.18;
  drone.add(bot);

  // Camera pod
  const camHse = new THREE.Mesh(
    new THREE.SphereGeometry(.18, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: .2, metalness: .9, emissive: 0x001122, emissiveIntensity: .4 }),
  );
  camHse.position.set(0, -.06, .44);
  drone.add(camHse);

  const gimbal = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 8, 24), aM);
  gimbal.position.set(0, -.06, .44);
  gimbal.rotation.y = Math.PI / 2;
  drone.add(gimbal);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .08, 16), lensM);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -.06, .56);
  drone.add(lens);

  // Arms, rotors, LEDs, legs
  const rotors  = [];
  const blinkL  = [];

  [
    { x:  1, z: -1, ry: -Math.PI / 4 },
    { x: -1, z: -1, ry:  Math.PI / 4 },
    { x:  1, z:  1, ry:  Math.PI / 4 },
    { x: -1, z:  1, ry: -Math.PI / 4 },
  ].forEach((ap, i) => {
    const ag = new THREE.Group();
    drone.add(ag);

    // Arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 1.6, 8), aM);
    arm.rotation.z = Math.PI / 2;
    ag.add(arm);
    ag.position.set(ap.x * .55, -.04, ap.z * .55);
    ag.rotation.y = ap.ry;

    // Motor mount
    const mnt = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .14, 12), dkM);
    mnt.position.x = .8;
    ag.add(mnt);

    // Ring
    const mr = new THREE.Mesh(new THREE.TorusGeometry(.16, .025, 8, 24), ringC.clone());
    mr.position.x = .8;
    mr.rotation.x = Math.PI / 2;
    ag.add(mr);

    // Motor glow dot
    const md = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .06, 12), glowC.clone());
    md.position.set(.8, .1, 0);
    ag.add(md);

    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .08, 8), bM);
    hub.position.set(.8, .14, 0);
    ag.add(hub);

    // Propeller group
    const rg = new THREE.Group();
    rg.position.set(.8, .2, 0);
    ag.add(rg);
    for (let b = 0; b < 2; b++) {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.bezierCurveTo(.05, .08, .18, .16, .6, .1);
      s.bezierCurveTo(.55, .04, .3, -.02, 0, 0);
      const bl = new THREE.Mesh(new THREE.ShapeGeometry(s), propM);
      bl.rotation.x = -Math.PI / 2;
      bl.rotation.z = b * Math.PI;
      rg.add(bl);
    }
    rotors.push({ g: rg, d: i % 2 === 0 ? 1 : -1 });

    // LED
    const lmat = new THREE.MeshStandardMaterial({
      color:    i < 2 ? 0x00ff88 : 0xff4444,
      emissive: i < 2 ? 0x00ff44 : 0xff2200,
      emissiveIntensity: 3,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(.028, 6, 6), lmat);
    led.position.set(.88, .06, 0);
    ag.add(led);
    blinkL.push({ m: lmat, ph: i * Math.PI / 2 });

    // Landing legs
    const lg = new THREE.Group();
    lg.position.set(ap.x * .55, -.04, ap.z * .55);
    lg.rotation.y = ap.ry;
    drone.add(lg);

    const lu = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .35, 6), dkM);
    lu.position.set(.52, -.22, 0);
    lu.rotation.z = .25;
    lg.add(lu);

    const lb = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .22, 6), dkM);
    lb.position.set(.66, -.44, 0);
    lg.add(lb);

    const sk = new THREE.Mesh(
      new THREE.CylinderGeometry(.04, .04, .12, 8),
      new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00aaff, emissiveIntensity: .6 }),
    );
    sk.rotation.z = Math.PI / 2;
    sk.position.set(.72, -.56, 0);
    lg.add(sk);
  });

  // Body status LEDs
  [
    [  .28, .04,  .36, 0x00ff88 ],
    [ -.28, .04,  .36, 0x00ff88 ],
    [    0, .04, -.42, 0xff4444 ],
  ].forEach(([x, y, z, col], i) => {
    const sm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3 });
    const s  = new THREE.Mesh(new THREE.SphereGeometry(.032, 8, 8), sm);
    s.position.set(x, y, z);
    drone.add(s);
    blinkL.push({ m: sm, ph: i * 1.3 + 2 });
  });

  // ── Lights ─────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x0a0a20, .8));

  const kl = new THREE.DirectionalLight(0x88ccff, 2.5);
  kl.position.set(2, 4, 5);
  scene.add(kl);

  const fl = new THREE.DirectionalLight(0x4488ff, 1);
  fl.position.set(-4, 2, 2);
  scene.add(fl);

  const motorLights = [];
  [{ x: 1.1, z: -1.1 }, { x: -1.1, z: -1.1 }, { x: 1.1, z: 1.1 }, { x: -1.1, z: 1.1 }]
    .forEach(p => {
      const pl = new THREE.PointLight(0x00f5ff, 1.8, .9);
      pl.position.set(p.x, .2, p.z);
      drone.add(pl);
      motorLights.push(pl);
    });

  const ug = new THREE.PointLight(0x00f5ff, 2.5, 2.5);
  ug.position.set(0, -.5, 0);
  drone.add(ug);

  // ── Particles ──────────────────────────────────
  const pN = 180;
  const pg  = new THREE.BufferGeometry();
  const pp  = new Float32Array(pN * 3);
  for (let i = 0; i < pN; i++) {
    pp[i * 3]     = (Math.random() - .5) * 18;
    pp[i * 3 + 1] = (Math.random() - .5) * 10;
    pp[i * 3 + 2] = (Math.random() - .5) * 14;
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pts = new THREE.Points(
    pg,
    new THREE.PointsMaterial({ color: 0x00f5ff, size: .04, sizeAttenuation: true, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(pts);

  // ── Grid floor ─────────────────────────────────
  const gh = new THREE.GridHelper(20, 30, 0x001122, 0x001122);
  gh.position.y = -1.4;
  gh.material.transparent = true;
  gh.material.opacity     = .3;
  scene.add(gh);

  const cm = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false });
  const gc  = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), cm);
  gc.rotation.x = -Math.PI / 2;
  gc.position.y = -1.38;
  scene.add(gc);

  // ── Fade canvas on scroll ──────────────────────
  window.addEventListener('scroll', () => {
    c3.style.opacity = Math.max(0, 1 - scrollY / (innerHeight * .6));
  });

  // ── Render loop ────────────────────────────────
  const clk = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clk.getElapsedTime();

    // Live telemetry values
    document.getElementById('t-alt').textContent = (120 + Math.sin(t * .7) * 8).toFixed(1) + 'm';
    document.getElementById('t-spd').textContent = (18  + Math.sin(t * .4) * 4).toFixed(1) + ' m/s';
    document.getElementById('t-bat').textContent = Math.max(0, 98 - t * .003).toFixed(0) + '%';

    // Drone idle animation
    drone.position.y += Math.sin(t * 1.4) * .055 * .18;
    drone.rotation.y  += .004;
    drone.rotation.z   = Math.sin(t * .9) * .022;

    rotors.forEach(r => { r.g.rotation.y += .32 * r.d; });

    motorLights.forEach((ml, i) => { ml.intensity = 1.4 + Math.sin(t * 3 + i) * .6; });
    ug.intensity = 2 + Math.sin(t * 2.2) * .8;

    blinkL.forEach(l => { l.m.emissiveIntensity = Math.sin(t * 3 + l.ph) > .4 ? 3 : .1; });

    // Drift particles upward
    const pos = pg.attributes.position.array;
    for (let i = 0; i < pN; i++) {
      pos[i * 3 + 1] += .001;
      if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = -5;
    }
    pg.attributes.position.needsUpdate = true;
    pts.rotation.y = t * .018;

    cm.opacity = .04 + Math.sin(t * 1.5) * .02;

    renderer.render(scene, cam);
  }
  animate();

  // ── Resize ─────────────────────────────────────
  window.addEventListener('resize', () => {
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
})();