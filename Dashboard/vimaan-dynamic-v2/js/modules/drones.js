// VIMAAN DYNAMIC v2 — // DRONE FLEET + INCIDENTS


// ═══════════════════════════════════════════════════════════════════════════
//  WEBCAM + COCO-SSD
// ═══════════════════════════════════════════════════════════════════════════
let cocoModel=null,lastWebcamIncidentTime=0;
const WEBCAM_COOLDOWN=18000;

async function initWebcam() {
  try {
    const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'environment'}});
    const video=document.getElementById('webcamVideo');
    video.srcObject=stream;video.style.display='block';
    document.getElementById('feedSlot0').classList.add('webcam-active');
    STATE.webcamActive=true;
    addLog('CCTV: Feed CAM-1 connected — webcam LIVE','ok');
    document.getElementById('feedStatus0').textContent='● WEBCAM';document.getElementById('feedStatus0').style.color='var(--accent-drone)';
    const badge=document.createElement('div');badge.className='ai-live-badge';badge.id='aiLiveBadge';badge.textContent='YOLOv8 LIVE';
    document.getElementById('feedSlot0').appendChild(badge);
    addLog('YOLO: Initializing model (YOLOv8 via COCO-SSD)...','yolo');
    try{await tf.ready();cocoModel=await cocoSsd.load({base:'lite_mobilenet_v2'});addLog('YOLO: Model loaded — person/object detection ACTIVE','yolo');document.getElementById('aiDot').style.background='var(--accent-yolo)';document.getElementById('aiStatus').textContent='YOLO: ACTIVE';runDetection();}
    catch(e){addLog('YOLO: Model load failed — feed active, detection disabled','warn');document.getElementById('aiStatus').textContent='YOLO: ERROR';}
  } catch(err){addLog('CCTV: Webcam denied — simulated CCTV feed active','warn');document.getElementById('aiStatus').textContent='YOLO: SIM';document.getElementById('aiDot').style.background='var(--accent-warn)';}
}

async function runDetection() {
  const video=document.getElementById('webcamVideo');
  if(!cocoModel||!video||video.readyState<2){setTimeout(runDetection,300);return;}
  try{const preds=await cocoModel.detect(video);STATE.webcamPredictions=preds;const now=Date.now();const persons=preds.filter(p=>p.class==='person'&&p.score>.62);if(persons.length>0&&now-lastWebcamIncidentTime>WEBCAM_COOLDOWN){lastWebcamIncidentTime=now;triggerWebcamIncident(persons[0]);}}
  catch(e){STATE.webcamPredictions=[];}
  setTimeout(runDetection,220);
}

function triggerWebcamIncident(prediction) {
  const types=[{type:'PERSON DETECTED',severity:'medium',icon:'👤',desc:'Individual flagged by YOLOv8'},{type:'CROWD GATHERING',severity:'high',icon:'👥',desc:'Elevated crowd density'},{type:'SUSPICIOUS ACTIVITY',severity:'high',icon:'⚠',desc:'Unusual movement pattern'},{type:'PERIMETER BREACH',severity:'critical',icon:'🚷',desc:'Unauthorized zone entry'}];
  const template=types[Math.floor(Math.random()*types.length)];
  const fcRoad=FEED_LOCATIONS[0];
  const jLat=(Math.random()-.5)*.001,jLng=(Math.random()-.5)*.001;
  const pos=ll2xy(fcRoad.lat+jLat,fcRoad.lng+jLng);
  const incident={id:STATE.incidentIdCounter++,...template,location:fcRoad.name,x:pos.x,y:pos.y,timestamp:new Date().toLocaleTimeString(),droneId:null,eta:null,status:'unassigned',cam:0,confidence:prediction.score,age:0,arrivalHandled:false};
  STATE.incidents.push(incident);STATE.feeds[0].alerting=true;setTimeout(()=>{if(STATE.feeds[0])STATE.feeds[0].alerting=false;},3500);
  const coords=xyToCoordStr(pos.x,pos.y);
  addLog(`YOLO LIVE: ${template.type} @ ${fcRoad.name.toUpperCase()} [${coords.short}]`,'yolo');
  playAlertSound();
  const drone=findNearestDrone(incident.x,incident.y);
  if(drone) dispatchDrone(drone,incident);else{addLog(`WARNING: No drones available — INCIDENT #${incident.id} queued`,'warn');incident.status='pending';}
  renderIncidents();renderDrones();updateLeafletIncidents();
}

function renderWebcamOverlay(canvas,dt){
  const slot=canvas.parentElement,W=slot.clientWidth,H=slot.clientHeight;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const video=document.getElementById('webcamVideo');
  const scaleX=video.videoWidth?W/video.videoWidth:1,scaleY=video.videoHeight?H/video.videoHeight:1;
  for(const pred of STATE.webcamPredictions){
    const[bx,by,bw,bh]=pred.bbox;const x=bx*scaleX,y=by*scaleY,w=bw*scaleX,h=bh*scaleY,conf=pred.score;
    const label=pred.class.toUpperCase(),isPerson=pred.class==='person',col=isPerson?'#ff4444':'#a3e635';
    ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);
    const cs=8;ctx.lineWidth=2.5;ctx.strokeStyle=isPerson?'#ff6666':'#a3e635';ctx.beginPath();ctx.moveTo(x,y+cs);ctx.lineTo(x,y);ctx.lineTo(x+cs,y);ctx.moveTo(x+w-cs,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+cs);ctx.moveTo(x+w,y+h-cs);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w,y+h-cs);ctx.moveTo(x+cs,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+h-cs);ctx.stroke();
    const lw=label.length*5+38;ctx.fillStyle='rgba(0,0,0,.82)';ctx.fillRect(x,y-14,lw,14);ctx.fillStyle=col;ctx.font='8px JetBrains Mono, monospace';ctx.fillText(`${label} ${(conf*100).toFixed(0)}%`,x+3,y-3);
    ctx.fillStyle=isPerson?'rgba(255,68,68,.2)':'rgba(163,230,53,.2)';ctx.fillRect(x,y+h+1,w,2);ctx.fillStyle=col;ctx.fillRect(x,y+h+1,w*conf,2);
  }
  const scanY=((Date.now()*.04)%H)|0;ctx.fillStyle='rgba(255,255,255,.018)';ctx.fillRect(0,scanY,W,2);
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(2,2,125,14);ctx.fillStyle='rgba(163,230,53,.75)';ctx.font='8px JetBrains Mono, monospace';ctx.fillText(new Date().toLocaleTimeString('en-GB',{hour12:false}),4,12);
}

// ═══════════════════════════════════════════════════════════════════════════
//  DRONES
// ═══════════════════════════════════════════════════════════════════════════
const DRONE_NAMES=['KITE-01','KITE-02','HAWK-03','HAWK-04','RAVEN-05','RAVEN-06'];
const DRONE_MODELS=['DJI M30T','DJI M30T','Parrot Anafi','Parrot Anafi','SkyScout X','SkyScout X'];
const BASE_POSITIONS=[{x:.15,y:.2},{x:.5,y:.1},{x:.85,y:.2},{x:.15,y:.8},{x:.5,y:.85},{x:.85,y:.75}];

function initDrones() {
  STATE.drones=DRONE_NAMES.map((name,i)=>({
    id:name,model:DRONE_MODELS[i],status:'standby',battery:75+Math.random()*25,
    x:BASE_POSITIONS[i].x,y:BASE_POSITIONS[i].y,bx:BASE_POSITIONS[i].x,by:BASE_POSITIONS[i].y,
    targetX:BASE_POSITIONS[i].x,targetY:BASE_POSITIONS[i].y,speed:.0025+Math.random()*.001,
    altitude:80+Math.random()*40,assignedIncident:null,eta:null,trail:[],heading:0,
    bezierPath:null,pathProgress:0,pathLength:0,waypointQueue:[],boundaryBreach:false,avoidingObstacle:null,
  }));
}

function droneSVG(col,spinning){
  return`<svg width="24" height="24" viewBox="-12 -12 24 24" style="filter:drop-shadow(0 0 3px ${col})"><g class="${spinning?'drone-body':''}"><line x1="-8" y1="-3" x2="8" y2="-3" stroke="${col}" stroke-width="1.8"/><line x1="-8" y1="3" x2="8" y2="3" stroke="${col}" stroke-width="1.8"/><line x1="-3" y1="-8" x2="-3" y2="8" stroke="${col}" stroke-width="1.8"/><line x1="3" y1="-8" x2="3" y2="8" stroke="${col}" stroke-width="1.8"/><circle cx="-8" cy="-3" r="2.2" fill="${col}"/><circle cx="8" cy="-3" r="2.2" fill="${col}"/><circle cx="-8" cy="3" r="2.2" fill="${col}"/><circle cx="8" cy="3" r="2.2" fill="${col}"/><rect x="-3" y="-3" width="6" height="6" fill="${col}" opacity=".85"/></g></svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════
const INCIDENT_TYPES=[
  {type:'FIRE DETECTED',severity:'critical',icon:'🔥',desc:'Smoke/flame detected'},
  {type:'CROWD STAMPEDE',severity:'critical',icon:'👥',desc:'Abnormal crowd density'},
  {type:'VEHICLE ACCIDENT',severity:'high',icon:'🚗',desc:'Collision detected'},
  {type:'ARMED THREAT',severity:'critical',icon:'⚠',desc:'Weapon signature'},
  {type:'STRUCTURAL COLLAPSE',severity:'high',icon:'🏗',desc:'Motion anomaly'},
  {type:'MEDICAL EMERGENCY',severity:'high',icon:'🚑',desc:'Person down detected'},
  {type:'FLOOD RISK',severity:'medium',icon:'💧',desc:'Water level rise'},
  {type:'TRESPASSING',severity:'medium',icon:'🚷',desc:'Perimeter breach'},
];

const FEED_LOCATIONS=[
  {name:'FC Road Intersection',lat:18.5195,lng:73.8469},
  {name:'Pune Station Plaza',lat:18.5284,lng:73.8742},
  {name:'Koregaon Park Blvd',lat:18.5362,lng:73.8938},
  {name:'Viman Nagar Hub',lat:18.5679,lng:73.9143},
];

function findNearestDrone(ix,iy){let best=null,bestDist=Infinity;for(const d of STATE.drones){if(d.status==='standby'){const dx=d.x-ix,dy=d.y-iy,dist=Math.sqrt(dx*dx+dy*dy);if(dist<bestDist){bestDist=dist;best=d;}}}return best;}

function dispatchDrone(drone,incident) {
  drone.status='dispatched';drone.assignedIncident=incident.id;
  const incLl=xy2ll(incident.x,incident.y);
  const breach=checkGeofenceBreach(incLl[0],incLl[1]);
  let targetX=incident.x,targetY=incident.y;
  if(breach){
    const angle=Math.random()*Math.PI*2,rad=breach.radius/111320+0.008;
    const offLat=Math.cos(angle)*rad,offLng=Math.sin(angle)*rad;
    const safe=ll2xy(incLl[0]+offLat,incLl[1]+offLng);
    targetX=safe.x;targetY=safe.y;
    addLog(`GEOFENCE: ${drone.id} rerouted around ${breach.name}`,'geo');
    const geo=document.getElementById('mavGeo');if(geo){geo.textContent='REROUTING';geo.style.color='var(--accent-warn)';}
    setTimeout(()=>{const g=document.getElementById('mavGeo');if(g){g.textContent='CLEAR';g.style.color='var(--accent-ok)';}},5000);
  }
  drone.targetX=targetX;drone.targetY=targetY;drone.waypointQueue=[];
  buildDronePath(drone);checkAndRerouteAroundObstacles(drone);
  const dx=drone.x-incident.x,dy=drone.y-incident.y,dist=Math.sqrt(dx*dx+dy*dy);
  drone.eta=Math.ceil(dist/drone.speed*0.05);
  incident.droneId=drone.id;incident.eta=drone.eta;incident.status='dispatched';

  // ★ NEW: Log dispatch with incident coordinates
  const incCoords=xyToCoordStr(incident.x,incident.y);
  addLog(`DISPATCH: ${drone.id} → INC #${incident.id} @ [${incCoords.short}] ETA ${drone.eta}s`,'dispatch');
}

function triggerRandomIncident() {
  const template=INCIDENT_TYPES[Math.floor(Math.random()*INCIDENT_TYPES.length)];
  const camId=Math.floor(Math.random()*4);const locObj=FEED_LOCATIONS[camId];
  const jLat=(Math.random()-.5)*.002,jLng=(Math.random()-.5)*.002;
  const pos=ll2xy(locObj.lat+jLat,locObj.lng+jLng);
  const incident={id:STATE.incidentIdCounter++,...template,location:locObj.name,x:pos.x,y:pos.y,timestamp:new Date().toLocaleTimeString(),droneId:null,eta:null,status:'unassigned',cam:camId,confidence:.78+Math.random()*.2,age:0,arrivalHandled:false};
  STATE.incidents.push(incident);
  if(STATE.feeds[camId]){STATE.feeds[camId].alerting=true;STATE.feeds[camId].detections=[{x:.2+Math.random()*.4,y:.15+Math.random()*.4,w:.15+Math.random()*.2,h:.15+Math.random()*.25,label:template.type,conf:incident.confidence}];setTimeout(()=>{if(STATE.feeds[camId]){STATE.feeds[camId].alerting=false;setTimeout(()=>{if(STATE.feeds[camId])STATE.feeds[camId].detections=[];},8000);}},3000);}

  // ★ NEW: Log with coordinates
  const coords=xyToCoordStr(pos.x,pos.y);
  addLog(`YOLO: ${template.type} @ ${locObj.name.toUpperCase()} | ${coords.short} [CONF: ${(incident.confidence*100).toFixed(1)}%]`,'yolo');
  playAlertSound();
  const drone=findNearestDrone(incident.x,incident.y);
  if(drone) dispatchDrone(drone,incident);else{addLog(`WARNING: No drones available — INCIDENT #${incident.id} queued`,'warn');incident.status='pending';}
  renderIncidents();renderDrones();updateLeafletIncidents();
}

function clearAllIncidents(){
  for(const inc of STATE.incidents){const drone=STATE.drones.find(d=>d.assignedIncident===inc.id);if(drone){drone.status='returning';drone.assignedIncident=null;drone.targetX=drone.bx;drone.targetY=drone.by;drone.eta=null;drone.trail=[];buildDronePath(drone);clearAvoidancePath(drone);}}
  for(const d of STATE.drones){if(d.status==='on-scene'||d.status==='dispatched'||d.status==='avoiding'){d.status='standby';d.assignedIncident=null;d.eta=null;d.trail=[];d.x=d.bx;d.y=d.by;d.targetX=d.bx;d.targetY=d.by;d.bezierPath=null;d.waypointQueue=[];clearAvoidancePath(d);}}
  STATE.incidents=[];for(const feed of STATE.feeds){feed.alerting=false;feed.detections=[];}
  for(const id of Object.keys(incidentMarkers)){if(leafletMap)leafletMap.removeLayer(incidentMarkers[id]);}
  incidentMarkers={};addLog('OPS: All incidents cleared by operator','ok');renderIncidents();renderDrones();
}

function returnDrone(drone){drone.status='returning';drone.assignedIncident=null;drone.targetX=drone.bx;drone.targetY=drone.by;drone.eta=null;drone.waypointQueue=[];buildDronePath(drone);checkAndRerouteAroundObstacles(drone);clearAvoidancePath(drone);addLog(`RETURN: ${drone.id} → BASE`,'ok');setTimeout(()=>dispatchPending(),600);}

function dispatchPending(){const sevOrder={critical:0,high:1,medium:2};const pending=STATE.incidents.filter(i=>i.status==='pending'||i.status==='unassigned').sort((a,b)=>(sevOrder[a.severity]??2)-(sevOrder[b.severity]??2));for(const inc of pending){const drone=findNearestDrone(inc.x,inc.y);if(!drone)break;dispatchDrone(drone,inc);}}

let autoInterval=null;
function toggleAuto(){STATE.autoMode=!STATE.autoMode;document.getElementById('autoBtn').textContent=`AUTO: ${STATE.autoMode?'ON':'OFF'}`;document.getElementById('autoBtn').classList.toggle('active',STATE.autoMode);if(STATE.autoMode){autoInterval=setInterval(()=>{if(Math.random()<.35)triggerRandomIncident();},4000);addLog('OPS: Auto-simulation ENABLED','ok');}else{clearInterval(autoInterval);addLog('OPS: Auto-simulation DISABLED','warn');}}

// ═══════════════════════════════════════════════════════════════════════════
