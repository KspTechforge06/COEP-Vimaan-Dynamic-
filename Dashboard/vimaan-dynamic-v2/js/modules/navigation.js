// VIMAAN DYNAMIC v2 — // PATH NAVIGATION + OBSTACLE AVOIDANCE

// ═══════════════════════════════════════════════════════════════════════════
//  FEATURE 2: BEZIER CURVE PATH NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
function computeBezierControlPoints(x0,y0,x1,y1,curvature=0.25) {
  const dx=x1-x0,dy=y1-y0,len=Math.sqrt(dx*dx+dy*dy);
  if(len<0.001) return {cp1x:x0,cp1y:y0,cp2x:x1,cp2y:y1};
  const perpX=-dy/len,perpY=dx/len;
  const side=Math.random()>.5?1:-1;
  const offset=len*curvature*side;
  const midX=(x0+x1)/2+perpX*offset,midY=(y0+y1)/2+perpY*offset;
  return {cp1x:x0+(midX-x0)*.66,cp1y:y0+(midY-y0)*.66,cp2x:x1+(midX-x1)*.66,cp2y:y1+(midY-y1)*.66};
}
function evalBezier(t,x0,y0,cp1x,cp1y,cp2x,cp2y,x1,y1) {
  const mt=1-t;
  return {x:mt*mt*mt*x0+3*mt*mt*t*cp1x+3*mt*t*t*cp2x+t*t*t*x1,y:mt*mt*mt*y0+3*mt*mt*t*cp1y+3*mt*t*t*cp2y+t*t*t*y1};
}
function easeInOut(t) { return t<0.5?2*t*t:-1+(4-2*t)*t; }
function buildDronePath(drone) {
  if(!drone||drone.x===undefined) return;
  const cp=computeBezierControlPoints(drone.x,drone.y,drone.targetX,drone.targetY,0.18+Math.random()*.15);
  drone.bezierPath={x0:drone.x,y0:drone.y,cp1x:cp.cp1x,cp1y:cp.cp1y,cp2x:cp.cp2x,cp2y:cp.cp2y,x1:drone.targetX,y1:drone.targetY};
  drone.pathProgress=0;
  drone.pathLength=Math.sqrt((drone.targetX-drone.x)**2+(drone.targetY-drone.y)**2);
}
function advanceDroneOnPath(drone,dt) {
  if(!drone.bezierPath) return true;
  const bp=drone.bezierPath;
  drone.pathProgress=Math.min(1,drone.pathProgress+drone.speed*0.5);
  const easedT=easeInOut(drone.pathProgress);
  const pos=evalBezier(easedT,bp.x0,bp.y0,bp.cp1x,bp.cp1y,bp.cp2x,bp.cp2y,bp.x1,bp.y1);
  const drift=0.001;
  drone.x=pos.x+Math.sin(Date.now()*.002+drone.id.charCodeAt(0))*drift;
  drone.y=pos.y+Math.cos(Date.now()*.003+drone.id.charCodeAt(1))*drift;
  if(drone.pathProgress>0&&drone.pathProgress<0.98) {
    const tNext=Math.min(1,drone.pathProgress+0.02);
    const posNext=evalBezier(tNext,bp.x0,bp.y0,bp.cp1x,bp.cp1y,bp.cp2x,bp.cp2y,bp.x1,bp.y1);
    const targetHeading=Math.atan2(posNext.y-pos.y,posNext.x-pos.x);
    if(drone.heading===undefined) drone.heading=targetHeading;
    let dh=targetHeading-drone.heading;
    while(dh>Math.PI) dh-=2*Math.PI;
    while(dh<-Math.PI) dh+=2*Math.PI;
    drone.heading+=dh*.12;
  }
  return drone.pathProgress>=1;
}

// ═══════════════════════════════════════════════════════════════════════════
//  FEATURE 3: OBSTACLE AVOIDANCE
// ═══════════════════════════════════════════════════════════════════════════
const OBSTACLES = [
  {x:.32,y:.28,w:.06,h:.08,label:'Shivajinagar Complex'},
  {x:.55,y:.18,w:.07,h:.06,label:'Pune IT Park'},
  {x:.70,y:.35,w:.05,h:.07,label:'Koregaon Towers'},
  {x:.18,y:.45,w:.06,h:.05,label:'Deccan Galleria'},
  {x:.60,y:.55,w:.08,h:.06,label:'Viman Nagar Mall'},
  {x:.25,y:.62,w:.05,h:.07,label:'Swargate Junction'},
  {x:.45,y:.70,w:.07,h:.05,label:'Hadapsar Industrial'},
  {x:.75,y:.65,w:.06,h:.06,label:'Mundhwa Complex'},
];
const OBSTACLE_MARGIN=0.025;
let obstacleLeafletLayers=[];
let avoidancePathLayers={};

function initObstaclesOnMap() {
  if(!leafletMap) return;
  obstacleLeafletLayers.forEach(l=>leafletMap.removeLayer(l));
  obstacleLeafletLayers=[];
  OBSTACLES.forEach(obs=>{
    const corners=[xy2ll(obs.x,obs.y),xy2ll(obs.x+obs.w,obs.y),xy2ll(obs.x+obs.w,obs.y+obs.h),xy2ll(obs.x,obs.y+obs.h)];
    const poly=L.polygon(corners,{color:'#475569',fillColor:'#1e293b',fillOpacity:.55,weight:1.5,opacity:.8}).addTo(leafletMap);
    poly.bindTooltip(`🏢 ${obs.label}`,{className:'drone-ltooltip',sticky:false});
    obstacleLeafletLayers.push(poly);
  });
  addLog(`OBSTACLE: ${OBSTACLES.length} urban structures mapped — avoidance ACTIVE`,'avoidance');
}

function lineIntersectsObstacle(x0,y0,x1,y1) {
  for(const obs of OBSTACLES) {
    const ex=obs.x-OBSTACLE_MARGIN,ey=obs.y-OBSTACLE_MARGIN,ew=obs.w+OBSTACLE_MARGIN*2,eh=obs.h+OBSTACLE_MARGIN*2;
    const insideA=x0>=ex&&x0<=ex+ew&&y0>=ey&&y0<=ey+eh;
    const insideB=x1>=ex&&x1<=ex+ew&&y1>=ey&&y1<=ey+eh;
    if(insideA||insideB) return obs;
    if(segmentIntersectsAABB(x0,y0,x1,y1,ex,ey,ex+ew,ey+eh)) return obs;
  }
  return null;
}
function segmentIntersectsAABB(x0,y0,x1,y1,minX,minY,maxX,maxY) {
  const dx=x1-x0,dy=y1-y0;
  let tMin=0,tMax=1;
  const checks=[{p:-dx,q:x0-minX},{p:dx,q:maxX-x0},{p:-dy,q:y0-minY},{p:dy,q:maxY-y0}];
  for(const{p,q}of checks){if(p===0){if(q<0)return false;continue;}const t=q/p;if(p<0)tMin=Math.max(tMin,t);else tMax=Math.min(tMax,t);if(tMin>tMax)return false;}
  return true;
}
function computeAvoidanceWaypoint(sx,sy,tx,ty,obs) {
  const ocx=obs.x+obs.w/2,ocy=obs.y+obs.h/2;
  const toObsX=ocx-sx,toObsY=ocy-sy;
  const dx=tx-sx,dy=ty-sy,len=Math.sqrt(dx*dx+dy*dy);
  const dirX=dx/len,dirY=dy/len;
  const perpX=-dirY,perpY=dirX;
  const dotPerp=toObsX*perpX+toObsY*perpY;
  const side=dotPerp>0?-1:1;
  const halfDiag=Math.sqrt((obs.w/2)**2+(obs.h/2)**2);
  const clearance=halfDiag+OBSTACLE_MARGIN+0.04;
  const projDist=toObsX*dirX+toObsY*dirY;
  return{wpX:sx+dirX*projDist+perpX*clearance*side,wpY:sy+dirY*projDist+perpY*clearance*side};
}
function checkAndRerouteAroundObstacles(drone) {
  if(!drone.bezierPath) return;
  const SAMPLES=12,bp=drone.bezierPath;
  for(let i=0;i<SAMPLES;i++) {
    const t0=i/SAMPLES,t1=(i+1)/SAMPLES;
    const p0=evalBezier(t0,bp.x0,bp.y0,bp.cp1x,bp.cp1y,bp.cp2x,bp.cp2y,bp.x1,bp.y1);
    const p1=evalBezier(t1,bp.x0,bp.y0,bp.cp1x,bp.cp1y,bp.cp2x,bp.cp2y,bp.x1,bp.y1);
    const obstacle=lineIntersectsObstacle(p0.x,p0.y,p1.x,p1.y);
    if(obstacle) {
      const{wpX,wpY}=computeAvoidanceWaypoint(drone.x,drone.y,drone.targetX,drone.targetY,obstacle);
      if(!drone.waypointQueue) drone.waypointQueue=[];
      drone.waypointQueue.unshift({x:drone.targetX,y:drone.targetY});
      drone.targetX=wpX;drone.targetY=wpY;
      buildDronePath(drone);
      drone.status='avoiding';drone.avoidingObstacle=obstacle.label;
      drawAvoidancePath(drone,wpX,wpY,drone.waypointQueue[0].x,drone.waypointQueue[0].y);
      addLog(`AVOIDANCE: ${drone.id} rerouting around [${obstacle.label}]`,'avoidance');
      break;
    }
  }
}
function drawAvoidancePath(drone,wpX,wpY,finalX,finalY) {
  if(!leafletMap) return;
  if(avoidancePathLayers[drone.id]) leafletMap.removeLayer(avoidancePathLayers[drone.id]);
  avoidancePathLayers[drone.id]=L.polyline([xy2ll(drone.x,drone.y),xy2ll(wpX,wpY),xy2ll(finalX,finalY)],{color:'#fb923c',weight:2,opacity:.7,dashArray:'6 4'}).addTo(leafletMap);
  setTimeout(()=>{if(avoidancePathLayers[drone.id]){leafletMap.removeLayer(avoidancePathLayers[drone.id]);delete avoidancePathLayers[drone.id];}},8000);
}
function clearAvoidancePath(drone) {
  if(avoidancePathLayers[drone.id]) {if(leafletMap) leafletMap.removeLayer(avoidancePathLayers[drone.id]);delete avoidancePathLayers[drone.id];}
}

