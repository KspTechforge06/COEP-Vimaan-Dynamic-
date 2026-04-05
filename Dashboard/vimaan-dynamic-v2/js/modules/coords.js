// VIMAAN DYNAMIC v2 — // COORDINATE SYSTEM

}

// ═══════════════════════════════════════════════════════════════════════════
//  PUNE COORDINATE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
const PUNE_BOUNDS = { latN:18.605, latS:18.435, lngW:73.775, lngE:73.955 };
function xy2ll(x,y) {
  return [PUNE_BOUNDS.latN - y*(PUNE_BOUNDS.latN-PUNE_BOUNDS.latS),
          PUNE_BOUNDS.lngW + x*(PUNE_BOUNDS.lngE-PUNE_BOUNDS.lngW)];
}
function ll2xy(lat,lng) {
  return { x:(lng-PUNE_BOUNDS.lngW)/(PUNE_BOUNDS.lngE-PUNE_BOUNDS.lngW),
           y:(PUNE_BOUNDS.latN-lat)/(PUNE_BOUNDS.latN-PUNE_BOUNDS.latS) };
}

// ══════════════════════════════════════════════════════════════════════════
// ★ NEW FEATURE 3: COORDINATE UTILITIES
// Converts XY internal coords to human-readable lat/lng strings
// ══════════════════════════════════════════════════════════════════════════

/**
 * Convert XY [0-1] to a formatted coordinate object with lat/lng strings.
 * Used for display in the drone coords panel, incident cards, and map tooltips.
 */
function xyToCoordStr(x, y) {
  const [lat, lng] = xy2ll(x, y);
  return {
    lat: lat.toFixed(5),
    lng: lng.toFixed(5),
    display: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    short:   `${lat.toFixed(3)}N ${lng.toFixed(3)}E`,
  };
}

/**
 * ★ NEW: Render the live drone coordinates panel (left sidebar, below drone cards).
 * Shows: drone ID, current lat/lng, base station lat/lng.
 * Updates every few frames via update().
 */
function renderDroneCoords() {
  const container = document.getElementById('droneCoordsRows');
  if (!container) return;

  let html = '';
  for (const d of STATE.drones) {
    const coords = xyToCoordStr(d.x, d.y);
    const baseCoords = xyToCoordStr(d.bx, d.by);
    const rowClass = d.status === 'dispatched' ? 'moving' : d.status === 'avoiding' ? 'avoiding' : '';
    // Drone current position
    html += `<div class="drone-coord-row ${rowClass}">
      <span class="drone-coord-id">${d.id}</span>
      <span class="drone-coord-vals">${coords.lat}°N<br>${coords.lng}°E</span>
    </div>`;
    // Base station (fixed — shown smaller)
    html += `<div class="drone-coord-row station">
      <span class="drone-coord-id" style="font-size:7px;opacity:.6">⌂ BASE</span>
      <span class="drone-coord-vals" style="opacity:.5;font-size:7px">${baseCoords.lat}°N<br>${baseCoords.lng}°E</span>
    </div>`;
  }
  container.innerHTML = html;
}

/**
 * ★ NEW: Render the live drone position display overlaid on the map (bottom-left of map).
 * Compact one-row-per-drone display for quick spatial reference.
 */
function renderMapDronePositions() {
  const container = document.getElementById('dronePosRows');
  if (!container) return;

  const rows = STATE.drones.map(d => {
    const c = xyToCoordStr(d.x, d.y);
    const statusColor =
      d.status === 'dispatched' ? 'var(--accent-drone)'  :
      d.status === 'returning'  ? 'var(--accent-warn)'   :
      d.status === 'avoiding'   ? 'var(--accent-geo)'    :
      d.status === 'on-scene'   ? 'var(--accent-ok)'     :
                                  'var(--text-secondary)';
    return `<div class="drone-pos-row ${d.status}">
      <span class="drone-pos-id" style="color:${statusColor}">${d.id}</span>
      <span class="drone-pos-coords">${c.lat}°N, ${c.lng}°E</span>
    </div>`;
  }).join('');
  container.innerHTML = rows;
}

