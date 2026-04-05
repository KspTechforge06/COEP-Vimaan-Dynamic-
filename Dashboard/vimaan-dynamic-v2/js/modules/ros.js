// VIMAAN DYNAMIC v2 — // ROSBRIDGE

//  LEAFLET MAP
// ═══════════════════════════════════════════════════════════════════════════
let leafletMap=null,droneMarkers={},droneTrailLines={},incidentMarkers={},heatLayer=null;
let cctvMarkers=[];

function initLeafletMap() {
  leafletMap=L.map('leafletMap',{center:[18.52,73.855],zoom:13,zoomControl:false,attributionControl:false,preferCanvas:true});

  // ★ MODIFIED: Store tile layer ref so setMapMode can swap it
  currentTileLayer = L.tileLayer(MAP_TILE_LAYERS.grey.url,{maxZoom:19,subdomains:'abcd'}).addTo(leafletMap);

  heatLayer=L.heatLayer([],{radius:45,blur:35,maxZoom:15,max:1.0,gradient:{0.3:'#001f4d',0.5:'#f59e0b',0.75:'#f97316',1.0:'#ff0000'}}).addTo(leafletMap);

  FEED_LOCATIONS.forEach(loc=>{L.circle([loc.lat,loc.lng],{radius:800,color:'#38bdf8',fillColor:'#38bdf8',fillOpacity:.03,weight:1,opacity:.3,dashArray:'4 5'}).addTo(leafletMap);});
  FEED_LOCATIONS.forEach((loc,i)=>{
    const icon=L.divIcon({className:'',iconSize:[16,16],iconAnchor:[8,8],html:`<div style="width:16px;height:16px;background:rgba(56,189,248,.15);border:1.5px solid #38bdf8;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px;">📷</div>`});
    const m=L.marker([loc.lat,loc.lng],{icon,zIndexOffset:600}).addTo(leafletMap);
    m.bindTooltip(`CAM-${i+1}: ${loc.name}`,{className:'drone-ltooltip',permanent:false});
    cctvMarkers.push(m);
  });
  BASE_POSITIONS.forEach(pos=>{const ll=xy2ll(pos.x,pos.y);L.circleMarker(ll,{radius:4,color:'#555',fillColor:'#333',fillOpacity:.5,weight:1,opacity:.5}).addTo(leafletMap);});
  initGeofenceZones();
  initOperationalBoundary();
  initObstaclesOnMap();

  leafletMap.on('moveend',()=>{const c=leafletMap.getCenter();document.getElementById('coordsDisplay').textContent=`LAT: ${c.lat.toFixed(4)}° N | LNG: ${c.lng.toFixed(4)}° E | ALT: 580m`;});
}

function getDroneColor(status) {
  if(status==='avoiding') return '#fb923c';
  return status==='standby'?'#22c55e':status==='dispatched'?'#818cf8':status==='returning'?'#f59e0b':'#555';
}

function createDroneIcon(drone) {
  const col=getDroneColor(drone.status);
  const isActive=drone.status==='dispatched'||drone.status==='returning'||drone.status==='avoiding';
  const spinClass=isActive?'drone-svg-spin':'';
  const ringHtml=isActive?`<div class="drone-icon-ring" style="width:20px;height:20px;border-color:${col};top:-4px;left:-4px;"></div>`:'';
  const headingDeg=drone.heading!==undefined?(drone.heading*180/Math.PI):0;
  return L.divIcon({
    className:'',
    html:`<div class="drone-icon-outer" style="width:20px;height:20px;transform:rotate(${headingDeg}deg)">${ringHtml}<svg class="${spinClass}" width="20" height="20" viewBox="-10 -10 20 20" style="filter:drop-shadow(0 0 4px ${col})"><line x1="-7" y1="-3" x2="7" y2="-3" stroke="${col}" stroke-width="1.5"/><line x1="-7" y1="3" x2="7" y2="3" stroke="${col}" stroke-width="1.5"/><line x1="-3" y1="-7" x2="-3" y2="7" stroke="${col}" stroke-width="1.5"/><line x1="3" y1="-7" x2="3" y2="7" stroke="${col}" stroke-width="1.5"/><circle cx="-7" cy="-3" r="1.8" fill="${col}"/><circle cx="7" cy="-3" r="1.8" fill="${col}"/><circle cx="-7" cy="3" r="1.8" fill="${col}"/><circle cx="7" cy="3" r="1.8" fill="${col}"/><rect x="-2.5" y="-2.5" width="5" height="5" fill="${col}" opacity=".9"/></svg></div>`,
    iconSize:[20,20],iconAnchor:[10,10],
  });
}

function createIncidentIcon(inc) {
  const col=inc.severity==='critical'?'#ff4444':inc.severity==='high'?'#f59e0b':'#38bdf8';
  return L.divIcon({
    className:'',
    html:`<div class="inc-marker-dot" style="background:${col}22;border:2px solid ${col};box-shadow:0 0 8px ${col}88;width:22px;height:22px;">${inc.icon}</div>`,
    iconSize:[22,22],iconAnchor:[11,11],
  });
}

function updateLeafletDrones() {
  if(!leafletMap) return;
  for(const d of STATE.drones) {
    const ll=xy2ll(d.x,d.y);
    if(!droneMarkers[d.id]) {
      // ★ MODIFIED: Drone tooltip now shows live coordinates
      const m=L.marker(ll,{icon:createDroneIcon(d),zIndexOffset:800}).addTo(leafletMap);
      const c=xyToCoordStr(d.x,d.y);
      m.bindTooltip(`${d.id} | ${c.short}`,{permanent:true,direction:'right',className:'drone-ltooltip',offset:[8,0]});
      droneMarkers[d.id]=m;
    } else {
      droneMarkers[d.id].setLatLng(ll);
      droneMarkers[d.id].setIcon(createDroneIcon(d));
      // ★ NEW: Update tooltip content with live coordinates
      const c=xyToCoordStr(d.x,d.y);
      droneMarkers[d.id].setTooltipContent(`${d.id} | ${c.short}`);
    }
    if(d.trail.length>1){
      const coords=d.trail.map(p=>xy2ll(p.x,p.y));
      if(!droneTrailLines[d.id]){droneTrailLines[d.id]=L.polyline(coords,{color:getDroneColor(d.status),weight:1.5,opacity:.4,dashArray:'3 5'}).addTo(leafletMap);}
      else{droneTrailLines[d.id].setLatLngs(coords);droneTrailLines[d.id].setStyle({color:getDroneColor(d.status)});}
    } else if(droneTrailLines[d.id]) droneTrailLines[d.id].setLatLngs([]);
  }
}

function updateLeafletIncidents() {
  if(!leafletMap) return;
  const activeIds=new Set(STATE.incidents.filter(i=>i.status!=='resolved').map(i=>i.id));
  for(const id of Object.keys(incidentMarkers)){if(!activeIds.has(parseInt(id))){leafletMap.removeLayer(incidentMarkers[id]);delete incidentMarkers[id];}}
  for(const inc of STATE.incidents) {
    if(inc.status==='resolved'||incidentMarkers[inc.id]) continue;
    const ll=xy2ll(inc.x,inc.y);
    const m=L.marker(ll,{icon:createIncidentIcon(inc),zIndexOffset:1000}).addTo(leafletMap);

    // ★ MODIFIED: Incident popup now includes exact lat/lng coordinates
    const incCoords=xyToCoordStr(inc.x,inc.y);
    m.bindPopup(`<div style="font-family:'JetBrains Mono',monospace;font-size:9px;padding:8px;min-width:170px;">
      <div style="color:#ff4444;font-size:10px;margin-bottom:5px;">${inc.icon} ${inc.type}</div>
      <div style="color:#555;margin-bottom:2px;">📍 ${inc.location}</div>
      <div style="color:#555;margin-bottom:4px;">${inc.desc}</div>
      <div style="color:#f97316;background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);padding:3px 5px;margin-bottom:3px;font-family:'Space Mono',monospace;font-size:8px;">
        ◈ LAT: ${incCoords.lat}°N<br>◈ LNG: ${incCoords.lng}°E
      </div>
      <div style="color:#f0f0f0;">CONF: ${(inc.confidence*100).toFixed(1)}% | SEV: ${inc.severity.toUpperCase()}</div>
    </div>`);

    const incLl=xy2ll(inc.x,inc.y);
    const breach=checkGeofenceBreach(incLl[0],incLl[1]);
    if(breach){
      addLog(`GEOFENCE: Incident #${inc.id} near ${breach.name} — drone routing around zone`,'geo');
      document.getElementById('geoStatus').textContent=`GEOFENCE: BREACH DETECTED — ${breach.id}`;
      document.getElementById('geoStatus').style.color='var(--accent-danger)';
      setTimeout(()=>{document.getElementById('geoStatus').textContent='GEOFENCE: 3 ZONES ACTIVE';document.getElementById('geoStatus').style.color='var(--accent-geo)';},6000);
    }
    incidentMarkers[inc.id]=m;
    STATE.heatPoints.push([ll[0],ll[1],inc.severity==='critical'?1.0:inc.severity==='high'?0.7:0.4]);
    if(STATE.heatPoints.length>60) STATE.heatPoints.shift();
    if(heatLayer) heatLayer.setLatLngs(STATE.heatPoints);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIO
// ═══════════════════════════════════════════════════════════════════════════
let audioCtx=null;
function getAudioCtx(){if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}
function playAlertSound(){try{const ctx=getAudioCtx();[[880,0],[660,.18],[880,.32]].forEach(([freq,when])=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=freq;osc.type='square';gain.gain.setValueAtTime(0,ctx.currentTime+when);gain.gain.linearRampToValueAtTime(.07,ctx.currentTime+when+.01);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+when+.14);osc.start(ctx.currentTime+when);osc.stop(ctx.currentTime+when+.14);});}catch(e){}}
