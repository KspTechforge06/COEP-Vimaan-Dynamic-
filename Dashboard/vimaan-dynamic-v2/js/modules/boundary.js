// VIMAAN DYNAMIC v2 — // OPERATIONAL BOUNDARY

// ═══════════════════════════════════════════════════════════════════════════
//  FEATURE 1: OPERATIONAL BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════
const OPERATIONAL_BOUNDARY_LATLNG = [
  [18.580, 73.800], [18.590, 73.870], [18.575, 73.930],
  [18.540, 73.950], [18.490, 73.940], [18.455, 73.900],
  [18.450, 73.820], [18.470, 73.780], [18.520, 73.775],
  [18.560, 73.785],
];
const OPERATIONAL_BOUNDARY_XY = OPERATIONAL_BOUNDARY_LATLNG.map(([lat,lng]) => ll2xy(lat,lng));

let operationalBoundaryLayer = null;
let boundaryBreachLayers = {};

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
                      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function clampToBoundary(x, y, margin = 0.015) {
  const poly = OPERATIONAL_BOUNDARY_XY;
  let nearestDist = Infinity, nearestX = x, nearestY = y;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x, ay = poly[j].y;
    const bx = poly[i].x, by = poly[i].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx*dx + dy*dy;
    let t = ((x - ax)*dx + (y - ay)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t*dx, cy = ay + t*dy;
    const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
    if (dist < nearestDist) {
      nearestDist = dist;
      const centX = poly.reduce((s,p)=>s+p.x,0)/poly.length;
      const centY = poly.reduce((s,p)=>s+p.y,0)/poly.length;
      const nx = centX - cx, ny = centY - cy;
      const nl = Math.sqrt(nx*nx+ny*ny);
      nearestX = cx + (nx/nl)*margin;
      nearestY = cy + (ny/nl)*margin;
    }
  }
  return { x: nearestX, y: nearestY };
}

function enforceBoundary(drone) {
  const inside = pointInPolygon(drone.x, drone.y, OPERATIONAL_BOUNDARY_XY);
  if (!inside) {
    const safe = clampToBoundary(drone.x, drone.y);
    drone.x = safe.x; drone.y = safe.y;
    const centX = OPERATIONAL_BOUNDARY_XY.reduce((s,p)=>s+p.x,0)/OPERATIONAL_BOUNDARY_XY.length;
    const centY = OPERATIONAL_BOUNDARY_XY.reduce((s,p)=>s+p.y,0)/OPERATIONAL_BOUNDARY_XY.length;
    drone.targetX = centX + (Math.random()-0.5)*0.1;
    drone.targetY = centY + (Math.random()-0.5)*0.1;
    drone.bezierPath = null; drone.pathProgress = 0;
    const now = Date.now();
    if (!drone._lastBreachLog || now - drone._lastBreachLog > 4000) {
      drone._lastBreachLog = now;
      STATE.boundaryBreachCount++;
      addLog(`⚠ BOUNDARY BREACH: ${drone.id} exceeded flight zone — forced redirect`, 'boundary');
      playAlertSound(); flashBoundaryWarning();
    }
    if (!drone.boundaryBreach) { drone.boundaryBreach = true; updateBoundaryStatus(true); }
    return false;
  } else {
    if (drone.boundaryBreach) {
      drone.boundaryBreach = false;
      if (!STATE.drones.some(d => d.boundaryBreach)) updateBoundaryStatus(false);
    }
    return true;
  }
}

function flashBoundaryWarning() {
  const tag = document.getElementById('boundaryTag');
  if (!tag) return;
  tag.textContent = '⚠ BOUNDARY BREACH — DRONE REDIRECTED';
  tag.classList.add('boundary-warn');
  if (operationalBoundaryLayer) {
    operationalBoundaryLayer.setStyle({ color:'#ff4444', fillColor:'#ff4444', fillOpacity:0.12 });
    setTimeout(() => { if (operationalBoundaryLayer) operationalBoundaryLayer.setStyle({ color:'#a855f7', fillColor:'#a855f7', fillOpacity:0.04 }); }, 2500);
  }
  setTimeout(() => { tag.textContent = 'BOUNDARY: OPERATIONAL — ALL CLEAR'; tag.classList.remove('boundary-warn'); }, 4000);
}

function updateBoundaryStatus(breaching) {
  const dot = document.getElementById('boundaryDot');
  const label = document.getElementById('boundaryStatus');
  if (breaching) {
    dot.style.background = 'var(--accent-danger)'; dot.style.boxShadow = '0 0 6px var(--accent-danger)';
    label.textContent = 'BOUNDARY: BREACH'; label.style.color = 'var(--accent-danger)';
  } else {
    dot.style.background = 'var(--accent-ok)'; dot.style.boxShadow = 'none';
    label.textContent = 'BOUNDARY: SECURE'; label.style.color = '';
  }
}

function initOperationalBoundary() {
  if (!leafletMap) return;
  if (operationalBoundaryLayer) leafletMap.removeLayer(operationalBoundaryLayer);
  operationalBoundaryLayer = L.polygon(OPERATIONAL_BOUNDARY_LATLNG, {
    color:'#a855f7', fillColor:'#a855f7', fillOpacity:0.04, weight:2, opacity:0.6, dashArray:'8 6',
  }).addTo(leafletMap);
  operationalBoundaryLayer.bindTooltip('⬡ OPERATIONAL BOUNDARY — AUTHORISED FLIGHT ZONE', { className:'geo-tooltip', sticky:true });
  addLog('BOUNDARY: Operational flight boundary loaded — PUNE CENTRAL SECTOR', 'boundary');
}

