// VIMAAN DYNAMIC v2 — // MAP LAYER + GEOFENCE + LEAFLET

// ═══════════════════════════════════════════════════════════════════════════
//  ★ NEW FEATURE 1: MAP VIEW MODE SWITCHER
//  Supports: dark (default), satellite, terrain
//  Each mode swaps the Leaflet tile layer and adjusts CSS filter on tiles.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MAP_TILE_LAYERS: Tile URL definitions for each map mode.
 * - dark:      CartoDB dark (existing default)
 * - satellite: ESRI World Imagery
 * - terrain:   Stadia Stamen Terrain
 */
const MAP_TILE_LAYERS = {
  grey: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    label: 'GREY',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    label: 'DARK',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    label: 'SATELLITE',
  },
  terrain: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: '',
    label: 'TERRAIN',
  },
};

let currentTileLayer = null; // track the active Leaflet tile layer

/**
 * setMapMode: Switch the map tile layer and apply the appropriate CSS class
 * on the map panel for filter adjustments.
 * @param {'dark'|'satellite'|'terrain'} mode
 */
function setMapMode(mode) {
  if (!leafletMap) return;
  if (STATE.mapMode === mode) return; // no-op if already active

  STATE.mapMode = mode;

  // Remove old tile layer
  if (currentTileLayer) {
    leafletMap.removeLayer(currentTileLayer);
    currentTileLayer = null;
  }

  // Add new tile layer
  const layerDef = MAP_TILE_LAYERS[mode];
  const opts = { maxZoom: 19 };
  if (layerDef.subdomains) opts.subdomains = layerDef.subdomains;
  currentTileLayer = L.tileLayer(layerDef.url, opts);
  // Insert at bottom so overlays remain on top
  currentTileLayer.addTo(leafletMap);
  currentTileLayer.bringToBack();

  // Update CSS class on map panel for filter adjustments
  const mapPanel = document.getElementById('mapPanel');
  mapPanel.classList.remove('grey-mode', 'dark-mode', 'satellite-mode', 'terrain-mode');
  mapPanel.classList.add(`${mode}-mode`);

  // Update button states
  ['grey', 'dark', 'satellite', 'terrain'].forEach(m => {
    const btn = document.getElementById(`mode${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (btn) btn.classList.toggle('active', m === mode);
  });

  // Update map overlay tag
  const mapZone = document.getElementById('mapZone');
  const modeLabels = { grey: 'ZONE: CENTRAL GRID — GREY', dark: 'ZONE: CENTRAL GRID — DARK', satellite: 'ZONE: CENTRAL GRID — SATELLITE', terrain: 'ZONE: CENTRAL GRID — TERRAIN' };
  if (mapZone) mapZone.textContent = modeLabels[mode];

  addLog(`MAP: View mode switched to [${layerDef.label}]`, 'ok');
}

// ═══════════════════════════════════════════════════════════════════════════
//  ROSBRIDGE WEBSOCKET
// ═══════════════════════════════════════════════════════════════════════════
function initROSBridge() {
  if (STATE.rosConnected) return;
  try {
    const ws = new WebSocket('ws://localhost:9090');
    STATE.rosWs = ws;
    ws.onopen = () => {
      STATE.rosConnected = true; updateROSStatus(true);
      addLog('ROS: ROSBridge connected ws://localhost:9090','ros');
      const topics=[
        {op:'subscribe',topic:'/mavros/state',type:'mavros_msgs/State'},
        {op:'subscribe',topic:'/mavros/local_position/pose',type:'geometry_msgs/PoseStamped'},
        {op:'subscribe',topic:'/yolov8/detections',type:'vision_msgs/Detection2DArray'},
        {op:'subscribe',topic:'/camera/image_raw',type:'sensor_msgs/Image'},
      ];
      topics.forEach(t=>ws.send(JSON.stringify(t)));
    };
    ws.onmessage=(evt)=>{try{handleROSMessage(JSON.parse(evt.data));}catch(e){}};
    ws.onerror=()=>fallbackSimMode();
    ws.onclose=()=>{STATE.rosConnected=false;fallbackSimMode();};
    setTimeout(()=>{if(!STATE.rosConnected)fallbackSimMode();},2500);
  } catch(e){fallbackSimMode();}
}

function handleROSMessage(msg) {
  if(!msg.topic) return;
  if(msg.topic==='/mavros/state') {
    const d=msg.msg;
    document.getElementById('mavArmed').textContent=d.armed?'YES':'NO';
    document.getElementById('mavMode').textContent=d.mode||'—';
    document.getElementById('px4ModeBadge').textContent='MODE: '+(d.mode||'OFFBOARD');
  }
  if(msg.topic==='/mavros/local_position/pose') {
    const p=msg.msg.pose.position;
    document.getElementById('mavAlt').textContent=p.z.toFixed(1)+'m';
    // ★ MODIFIED: also update simLatLng with formatted coords
    const lat=(18.5204+p.y*0.0001).toFixed(4), lng=(73.8567+p.x*0.0001).toFixed(4);
    document.getElementById('simLatLng').textContent=`${lat}°N, ${lng}°E`;
  }
  if(msg.topic==='/yolov8/detections') {
    const dets=msg.msg.detections||[];
    STATE.yoloDetections=dets.map(d=>({cls:d.results[0]?.hypothesis?.class_id||'unknown',conf:d.results[0]?.hypothesis?.score||0,bbox:d.bbox}));
    renderYOLOList();
  }
}

function updateROSStatus(connected) {
  const dot=document.getElementById('rosConnDot'),label=document.getElementById('rosConnLabel'),hdot=document.getElementById('rosDot'),hstatus=document.getElementById('rosStatus');
  if(connected){dot.className='ros-dot connected';label.textContent='ROSBridge WebSocket — ws://localhost:9090 — CONNECTED';label.style.color='var(--accent-ok)';hdot.style.background='var(--accent-ok)';hstatus.textContent='ROS: CONNECTED';document.getElementById('rosFeedStatus').textContent='● LIVE';document.getElementById('rosFeedStatus').style.color='var(--accent-ok)';}
}
function fallbackSimMode() {
  const dot=document.getElementById('rosConnDot'),label=document.getElementById('rosConnLabel');
  dot.className='ros-dot waiting';label.textContent='ROSBridge WebSocket — ws://localhost:9090 — SIMULATION MODE (start rosbridge_server to connect)';label.style.color='var(--accent-warn)';
  document.getElementById('rosDot').style.background='var(--accent-warn)';document.getElementById('rosStatus').textContent='ROS: SIM';
  addLog('ROS: No ROSBridge server found — running in simulation mode','warn');
}

// ═══════════════════════════════════════════════════════════════════════════
//  GEOFENCE EXCLUSION ZONES
// ═══════════════════════════════════════════════════════════════════════════
const GEOFENCE_ZONES=[
  {id:'GF-01',name:'Airport Perimeter',lat:18.582,lng:73.918,radius:1200,color:'#f97316',active:true,type:'exclusion'},
  {id:'GF-02',name:'Hospital Zone',lat:18.519,lng:73.855,radius:400,color:'#ef4444',active:true,type:'exclusion'},
  {id:'GF-03',name:'Gov Complex',lat:18.528,lng:73.847,radius:600,color:'#f97316',active:true,type:'exclusion'},
  {id:'GF-04',name:'Ops Corridor A',lat:18.500,lng:73.870,radius:800,color:'#22c55e',active:true,type:'allowed'},
];
let geoFenceLayers=[];
function initGeofenceZones() {
  if(!leafletMap) return;
  geoFenceLayers.forEach(l=>leafletMap.removeLayer(l));geoFenceLayers=[];
  GEOFENCE_ZONES.forEach(z=>{
    const col=z.type==='exclusion'?z.color:'#22c55e';
    const c=L.circle([z.lat,z.lng],{radius:z.radius,color:col,fillColor:col,fillOpacity:.07,weight:1.5,opacity:.5,dashArray:z.type==='exclusion'?'6 5':null}).addTo(leafletMap);
    c.bindTooltip(`${z.id}: ${z.name} [${z.type.toUpperCase()}]`,{className:'geo-tooltip',permanent:false});
    geoFenceLayers.push(c);
  });
  renderGeoZonesList();
}
function renderGeoZonesList() {
  const list=document.getElementById('geoZonesList');if(!list)return;
  list.innerHTML=GEOFENCE_ZONES.map(z=>`<div class="geo-item"><div class="geo-dot" style="background:${z.type==='exclusion'?z.color:'#22c55e'}"></div><span class="geo-name">${z.name}</span><span class="geo-status" style="color:${z.type==='exclusion'?'var(--accent-danger)':'var(--accent-ok)'}; border:1px solid; border-color:${z.type==='exclusion'?'rgba(255,68,68,.25)':'rgba(34,197,94,.25)'}; padding:1px 5px;">${z.type.toUpperCase()}</span></div>`).join('');
}
function checkGeofenceBreach(lat,lng) {
  for(const z of GEOFENCE_ZONES){if(z.type!=='exclusion'||!z.active)continue;const dlat=lat-z.lat,dlng=lng-z.lng;const dist=Math.sqrt(dlat*dlat*111320*111320+dlng*dlng*Math.pow(111320*Math.cos(lat*Math.PI/180),2));if(dist<z.radius)return z;}
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
