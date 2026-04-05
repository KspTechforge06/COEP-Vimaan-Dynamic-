// VIMAAN DYNAMIC v2 — // MAIN LOOP + INIT

//  MAIN UPDATE LOOP
//  ★ MODIFIED: Added renderDroneCoords() and renderMapDronePositions() calls
// ═══════════════════════════════════════════════════════════════════════════
function update(dt) {
  for(const d of STATE.drones){
    const isMoving=d.status==='dispatched'||d.status==='returning'||d.status==='avoiding';
    if(isMoving&&d.bezierPath){
      const arrived=advanceDroneOnPath(d,dt);
      enforceBoundary(d);
      if(d.trail.length===0||Math.hypot(d.x-d.trail[d.trail.length-1].x,d.y-d.trail[d.trail.length-1].y)>0.003){d.trail.push({x:d.x,y:d.y});if(d.trail.length>40)d.trail.shift();}
      if(arrived){
        if(d.waypointQueue&&d.waypointQueue.length>0){const next=d.waypointQueue.shift();d.targetX=next.x;d.targetY=next.y;buildDronePath(d);checkAndRerouteAroundObstacles(d);if(d.status==='avoiding'){d.status=d.assignedIncident?'dispatched':'returning';d.avoidingObstacle=null;addLog(`AVOIDANCE: ${d.id} obstacle cleared — resuming mission`,'avoidance');}}
        else{d.bezierPath=null;d.waypointQueue=[];clearAvoidancePath(d);if(d.status==='dispatched'||d.status==='avoiding'){const inc=STATE.incidents.find(i=>i.id===d.assignedIncident);if(inc&&!inc.arrivalHandled){inc.arrivalHandled=true;addLog(`ARRIVED: ${d.id} @ INCIDENT #${inc.id} | ${inc.type}`,'ok');inc.status='on-scene';const delay=4000+Math.random()*4000;setTimeout(()=>{inc.status='resolved';inc.resolvedAt=Date.now();returnDrone(d);renderIncidents();renderDrones();},delay);}d.status='on-scene';d.eta=null;}else if(d.status==='returning'){d.status='standby';d.trail=[];addLog(`STANDBY: ${d.id} returned to base`,'ok');dispatchPending();}}
      }
    } else if(isMoving&&!d.bezierPath){buildDronePath(d);}
    if(d.status==='dispatched'||d.status==='on-scene'||d.status==='avoiding') d.battery=Math.max(10,d.battery-0.02);
    if(d.eta!==null) d.eta=Math.max(0,d.eta-dt*0.001);
    d.altitude+=(Math.random()-.5)*.5;d.altitude=Math.max(60,Math.min(150,d.altitude));
  }

  const now=Date.now();const prevLen=STATE.incidents.length;
  STATE.incidents=STATE.incidents.filter(i=>i.status!=='resolved'||!i.resolvedAt||(now-i.resolvedAt)<4000);
  if(STATE.incidents.length!==prevLen) updateLeafletIncidents();

  STATE.frameCount++;
  if(STATE.frameCount%6===0) updateLeafletDrones();
  if(STATE.frameCount%30===0) renderDrones();

  // ★ NEW: Update coordinate panels at a moderate rate (every 15 frames ≈ ~4fps)
  if(STATE.frameCount%15===0){
    renderDroneCoords();
    renderMapDronePositions();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLOCK + MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════
function updateClock(){document.getElementById('clockEl').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});}
setInterval(updateClock,1000);

let lastTime=0;
function loop(ts){const dt=ts-lastTime;lastTime=ts;update(dt);for(let i=0;i<4;i++)renderFeed(i,dt);STATE.animFrame=requestAnimationFrame(loop);}

// ═══════════════════════════════════════════════════════════════════════════
//  PANEL COLLAPSE
// ═══════════════════════════════════════════════════════════════════════════
const _pState={left:false,right:false,bottom:false,log:false};
function togglePanel(which){
  if(which==='left'){_pState.left=!_pState.left;document.getElementById('fleetPanel').classList.toggle('collapsed',_pState.left);document.getElementById('collapseLeft').textContent=_pState.left?'▶':'◀';if(leafletMap)setTimeout(()=>leafletMap.invalidateSize(),260);}
  else if(which==='right'){_pState.right=!_pState.right;document.getElementById('incidentPanel').classList.toggle('collapsed',_pState.right);document.getElementById('collapseRight').textContent=_pState.right?'◀':'▶';if(leafletMap)setTimeout(()=>leafletMap.invalidateSize(),260);}
  else if(which==='bottom'){_pState.bottom=!_pState.bottom;document.getElementById('bottomRow').classList.toggle('collapsed',_pState.bottom);document.getElementById('videoPanel').classList.toggle('collapsed',_pState.bottom);document.getElementById('collapseBottom').textContent=_pState.bottom?'▲':'▼';if(leafletMap)setTimeout(()=>leafletMap.invalidateSize(),260);}
  else if(which==='log'){_pState.log=!_pState.log;document.getElementById('logPanel').classList.toggle('collapsed',_pState.log);document.getElementById('collapseLog').textContent=_pState.log?'◀':'▶';}
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════
async function init() {
  initDrones(); initFeeds();
  renderDrones(); renderIncidents();
  initLeafletMap();
  addLog('SYSTEM: VIMAAN DYNAMIC v2 Command Platform initialized','ok');
  addLog('SYSTEM: All subsystems nominal','ok');
  addLog('SYSTEM: Geolocation grid calibrated [PUNE URBAN SECTOR]','ok');
  addLog('SYSTEM: 6 drones registered to fleet','ok');
  addLog('SYSTEM: 3 geofence exclusion zones loaded','geo');
  addLog('SYSTEM: CCTV video feeds connected — 4/4 active','ok');
  addLog('SYSTEM: Incident heatmap layer initialized','ok');
  addLog('SYSTEM: Bezier path navigation engine ACTIVE','avoidance');
  // ★ NEW init logs
  addLog('SYSTEM: Map view modes loaded — GREY (default) / DARK / SATELLITE / TERRAIN','ok');
  addLog('COORDS: Live drone position tracking ACTIVE','coords');
  addLog('COORDS: Incident coordinate tagging ENABLED','coords');
  addLog('YOLO: Model loading — YOLOv8 (COCO-SSD backend)','yolo');
  addLog('ROS: Waiting for ROSBridge on ws://localhost:9090','ros');
  // ★ NEW: Log base station coordinates on startup
  BASE_POSITIONS.forEach((pos, i) => {
    const c = xyToCoordStr(pos.x, pos.y);
    addLog(`BASE-${i+1}: Station fixed at [${c.short}]`, 'coords');
  });
  requestAnimationFrame(loop);
  initWebcam();
}

init();
