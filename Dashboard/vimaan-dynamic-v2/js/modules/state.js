// VIMAAN DYNAMIC v2 — // STATE + TABS

// VIMAAN DYNAMIC v2 — Application Logic
// Urban Drone Response Command Platform

// ═══════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════
const STATE = {
  incidents: [], incidentIdCounter: 1000,
  drones: [], autoMode: false, autoTimer: null,
  logEntries: [], feeds: [], animFrame: null, frameCount: 0,
  heatPoints: [], webcamActive: false, webcamPredictions: [],
  rosConnected: false, rosWs: null,
  simDrone: { x:0.5, y:0.5, targetX:0.5, targetY:0.5, heading:0, speed:0.004, alt:42, armed:true, mode:'OFFBOARD', geoBreach:false },
  yoloDetections: [],
  simFrame: 0,
  boundaryBreachCount: 0,
  // ★ NEW: current map view mode
  mapMode: 'grey',
};

// ═══════════════════════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════════════════════
function switchTab(tab) {
  document.getElementById('dashView').style.display = tab === 'dash' ? 'flex' : 'none';
  document.getElementById('simView').style.display  = tab === 'sim'  ? 'flex' : 'none';
  document.getElementById('tabDash').classList.toggle('active', tab === 'dash');
  document.getElementById('tabSim').classList.toggle('active',  tab === 'sim');
  if (tab === 'sim') { initSimCanvas(); initROSBridge(); }
  if (tab === 'dash' && leafletMap) setTimeout(() => leafletMap.invalidateSize(), 50);
