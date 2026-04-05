// VIMAAN DYNAMIC v2 — // PX4 SIMULATION TAB

//  SIMULATION CANVAS (PX4 / Gazebo)
// ═══════════════════════════════════════════════════════════════════════════
let simCanvasInited=false;
const SIM_DRONES_STATE=[{id:'SIM-1',x:.5,y:.5,tx:.5,ty:.5,speed:.003,trail:[],status:'idle',battery:92}];
const SIM_GEO_BOXES=[{x:.6,y:.1,w:.25,h:.2,col:'#f97316',label:'GF-01 AIRPORT'},{x:.35,y:.42,w:.12,h:.1,col:'#ef4444',label:'GF-02 HOSPITAL'},{x:.2,y:.3,w:.15,h:.12,col:'#f97316',label:'GF-03 GOV'}];
const SIM_CCTV=[{x:.3,y:.55},{x:.55,y:.45},{x:.65,y:.65},{x:.7,y:.35}];
let simYoloActive=[],simDroneInc=null;

function initSimCanvas(){if(simCanvasInited)return;simCanvasInited=true;renderROSFeed();simLoop();}
function simLoop(){drawPX4Canvas();updateSimDrone();updateSimMavlink();requestAnimationFrame(simLoop);}

function drawPX4Canvas(){
  const canvas=document.getElementById('px4Canvas');if(!canvas)return;
  const W=canvas.parentElement.clientWidth,H=canvas.parentElement.clientHeight;canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,H*.5);ctx.lineTo(W,H*.5);ctx.stroke();ctx.beginPath();ctx.moveTo(W*.5,0);ctx.lineTo(W*.5,H);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.2,0);ctx.lineTo(W*.2,H);ctx.stroke();ctx.beginPath();ctx.moveTo(W*.8,0);ctx.lineTo(W*.8,H);ctx.stroke();
  ctx.strokeStyle='rgba(168,85,247,.5)';ctx.lineWidth=1.5;ctx.setLineDash([8,5]);ctx.beginPath();OPERATIONAL_BOUNDARY_XY.forEach((p,i)=>{i===0?ctx.moveTo(p.x*W,p.y*H):ctx.lineTo(p.x*W,p.y*H);});ctx.closePath();ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(168,85,247,.04)';ctx.fill();
  SIM_GEO_BOXES.forEach(z=>{const x=z.x*W,y=z.y*H,w=z.w*W,h=z.h*H;ctx.fillStyle=z.col+'18';ctx.fillRect(x,y,w,h);ctx.strokeStyle=z.col;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);ctx.fillStyle=z.col;ctx.font='bold 8px JetBrains Mono, monospace';ctx.fillText(z.label,x+4,y+12);ctx.fillStyle=z.col+'28';for(let i=0;i<10;i++){ctx.fillRect(x+i*w/10,y,w/20,h);}});
  SIM_CCTV.forEach((c,i)=>{const cx=c.x*W,cy=c.y*H;ctx.fillStyle='rgba(56,189,248,.12)';ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(56,189,248,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,20,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#38bdf8';ctx.font='9px JetBrains Mono';ctx.fillText(`CAM-${i+1}`,cx-14,cy+3);});
  if(simDroneInc){const ix=simDroneInc.x*W,iy=simDroneInc.y*H,t=Date.now();ctx.strokeStyle=`rgba(255,68,68,${.5+.5*Math.sin(t*.01)})`;ctx.lineWidth=1.5;ctx.setLineDash([]);for(let r=0;r<3;r++){ctx.beginPath();ctx.arc(ix,iy,12+(r*8)+((t*.05)%8),0,Math.PI*2);ctx.globalAlpha=.6-r*.2;ctx.stroke();}ctx.globalAlpha=1;ctx.fillStyle='#ff4444';ctx.font='bold 9px JetBrains Mono';ctx.fillText(`⚡ ${simDroneInc.label}`,ix-25,iy-20);}
  simYoloActive.forEach(d=>{const bx=d.x*W,by=d.y*H,bw=d.w*W,bh=d.h*H;ctx.strokeStyle='#a3e635';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,bw,bh);ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(bx,by-13,d.label.length*5+12,13);ctx.fillStyle='#a3e635';ctx.font='8px JetBrains Mono';ctx.fillText(`${d.label} ${(d.conf*100).toFixed(0)}%`,bx+2,by-2);});
  const sd=SIM_DRONES_STATE[0];
  if(sd.trail.length>1){ctx.beginPath();ctx.moveTo(sd.trail[0].x*W,sd.trail[0].y*H);sd.trail.forEach(p=>ctx.lineTo(p.x*W,p.y*H));ctx.strokeStyle='rgba(129,140,248,.4)';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);}
  const dx2=sd.x*W,dy2=sd.y*H,col='#818cf8';ctx.fillStyle=col+'22';ctx.beginPath();ctx.arc(dx2,dy2,24,0,Math.PI*2);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1;ctx.setLineDash([]);ctx.beginPath();ctx.arc(dx2,dy2,24,0,Math.PI*2);ctx.stroke();
  const ang=STATE.simFrame*.04;const arms=[[-1,-1],[1,-1],[1,1],[-1,1]];
  arms.forEach(([sx,sy])=>{const ex=dx2+sx*10,ey=dy2+sy*10;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(dx2,dy2);ctx.lineTo(ex,ey);ctx.stroke();ctx.fillStyle=col;ctx.beginPath();ctx.arc(ex,ey,3.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle=col+'88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ex,ey,5,ang+arms.indexOf([sx,sy])*Math.PI*.5,ang+arms.indexOf([sx,sy])*Math.PI*.5+Math.PI*.8);ctx.stroke();});
  ctx.fillStyle=col;ctx.fillRect(dx2-3,dy2-3,6,6);
  // ★ MODIFIED: Show live coordinates under SIM drone label
  const simCoords=xyToCoordStr(sd.x,sd.y);
  ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(dx2+10,dy2-22,90,22);ctx.fillStyle=col;ctx.font='bold 8px JetBrains Mono';ctx.fillText(`SIM-1 ${sd.battery.toFixed(0)}%`,dx2+13,dy2-10);ctx.fillStyle='rgba(56,189,248,.7)';ctx.font='7px JetBrains Mono';ctx.fillText(simCoords.short,dx2+13,dy2-1);
  STATE.simFrame++;
}

function updateSimDrone(){
  const sd=SIM_DRONES_STATE[0];const dx=sd.tx-sd.x,dy=sd.ty-sd.y,dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>.006){sd.x+=dx/dist*sd.speed;sd.y+=dy/dist*sd.speed;sd.trail.push({x:sd.x,y:sd.y});if(sd.trail.length>50)sd.trail.shift();let breached=false;SIM_GEO_BOXES.forEach(z=>{if(sd.x>z.x&&sd.x<z.x+z.w&&sd.y>z.y&&sd.y<z.y+z.h){breached=true;sd.tx=sd.x+(sd.x<z.x+z.w/2?-0.1:0.1);sd.ty=sd.y+(sd.y<z.y+z.h/2?-0.1:0.1);}});document.getElementById('mavGeo').textContent=breached?'BREACH':'CLEAR';document.getElementById('mavGeo').style.color=breached?'var(--accent-danger)':'var(--accent-ok)';}
  else{if(simDroneInc){simDroneInc=null;addLog('SIM: Drone arrived at incident — assessing','yolo');setTimeout(()=>{sd.tx=.5;sd.ty=.5;addLog('SIM: Returning to base','ok');simYoloActive=[];renderYOLOList();},4000);}}
  if(!simDroneInc&&dist<.01&&Math.random()<.005){sd.tx=.3+Math.random()*.4;sd.ty=.3+Math.random()*.4;}
  sd.battery=Math.max(10,sd.battery-(dist>.006?.003:.0005));
  // ★ MODIFIED: Update simLatLng with real coordinates
  const sc=xyToCoordStr(sd.x,sd.y);
  document.getElementById('simLatLng').textContent=`${sc.lat}°N, ${sc.lng}°E`;
}

let mavlinkTick=0;
function updateSimMavlink(){mavlinkTick++;if(mavlinkTick%20!==0)return;const sd=SIM_DRONES_STATE[0];const dx=sd.tx-sd.x,dy=sd.ty-sd.y,spd=Math.sqrt(dx*dx+dy*dy)>0.006?3.2+Math.random()*.5:0;const hdg=Math.atan2(dx,dy)*180/Math.PI;document.getElementById('mavAlt').textContent=(40+Math.random()*8).toFixed(1)+'m';document.getElementById('mavSpeed').textContent=spd.toFixed(1)+' m/s';document.getElementById('mavHdg').textContent=Math.abs(Math.round(hdg))+'°';document.getElementById('mavBat').textContent=sd.battery.toFixed(0)+'%';}

function renderROSFeed(){
  const canvas=document.getElementById('rosFeedCanvas');if(!canvas){setTimeout(renderROSFeed,200);return;}
  const W=canvas.parentElement.clientWidth,H=canvas.parentElement.clientHeight;if(!W||!H){setTimeout(renderROSFeed,200);return;}
  canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
  function drawROSFrame(){ctx.fillStyle='#050505';ctx.fillRect(0,0,W,H);const t=Date.now()*.001;ctx.strokeStyle='rgba(255,255,255,.03)';ctx.lineWidth=1;const gridOff=(t*20)%40;for(let x=-40;x<W+40;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+gridOff,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y+gridOff*.2);ctx.stroke();}ctx.fillStyle='rgba(20,20,20,.8)';ctx.fillRect(W*.1,H*.4,W*.8,H*.25);ctx.strokeStyle='rgba(255,255,200,.06)';ctx.setLineDash([20,20]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W*.1,H*.525);ctx.lineTo(W*.9,H*.525);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(W*.05,H*.08,W*.18,H*.28);ctx.fillRect(W*.3,H*.1,W*.12,H*.22);ctx.fillRect(W*.65,H*.05,W*.22,H*.3);const vx=(t*.1)%1.3-.15;ctx.fillStyle='rgba(50,80,100,.6)';ctx.fillRect(vx*W,H*.46,20,10);ctx.fillRect(((vx+.3)%1.3-.15)*W,H*.5,18,10);simYoloActive.forEach(d=>{const bx=d.x*W,by=d.y*H,bw=d.w*W,bh=d.h*H;ctx.strokeStyle='#a3e635';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,bw,bh);const cs=6;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,by+cs);ctx.lineTo(bx,by);ctx.lineTo(bx+cs,by);ctx.moveTo(bx+bw-cs,by);ctx.lineTo(bx+bw,by);ctx.lineTo(bx+bw,by+cs);ctx.moveTo(bx+bw,by+bh-cs);ctx.lineTo(bx+bw,by+bh);ctx.lineTo(bx+bw-cs,by+bh);ctx.moveTo(bx+cs,by+bh);ctx.lineTo(bx,by+bh);ctx.lineTo(bx,by+bh-cs);ctx.stroke();ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(bx,by-13,d.label.length*5.5+12,13);ctx.fillStyle='#a3e635';ctx.font='8px JetBrains Mono';ctx.fillText(`${d.label} ${(d.conf*100).toFixed(0)}%`,bx+2,by-2);});ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2-20,H/2);ctx.lineTo(W/2+20,H/2);ctx.stroke();ctx.beginPath();ctx.moveTo(W/2,H/2-20);ctx.lineTo(W/2,H/2+20);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;ctx.strokeRect(W/2-40,H/2-25,80,50);ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(2,2,130,14);ctx.fillStyle='rgba(56,189,248,.8)';ctx.font='8px JetBrains Mono';ctx.fillText(new Date().toLocaleTimeString('en-GB',{hour12:false})+'  ALT:'+SIM_DRONES_STATE[0].battery.toFixed(0)+'%',4,12);const sy2=((t*40)%H)|0;ctx.fillStyle='rgba(255,255,255,.015)';ctx.fillRect(0,sy2,W,2);requestAnimationFrame(drawROSFrame);}
  drawROSFrame();
}

function renderYOLOList(){
  const list=document.getElementById('yoloList');if(!list)return;
  if(simYoloActive.length===0){list.innerHTML=`<div style="text-align:center;padding:20px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-dim);">WAITING FOR DETECTIONS...</div>`;document.getElementById('yoloCount').textContent='0 OBJECTS';return;}
  document.getElementById('yoloCount').textContent=`${simYoloActive.length} OBJECTS`;
  list.innerHTML=simYoloActive.map(d=>`<div class="yolo-item"><div class="yolo-class">■ ${d.label}</div><div class="yolo-conf">${(d.conf*100).toFixed(1)}%</div><div class="yolo-action">${d.action}</div></div>`).join('');
}

function simTakeoff(){addLog('MAVSDK: ARM + TAKEOFF command sent — target alt: 40m','ros');document.getElementById('mavArmed').textContent='YES';document.getElementById('mavMode').textContent='OFFBOARD';}
function simReturnHome(){SIM_DRONES_STATE[0].tx=.5;SIM_DRONES_STATE[0].ty=.5;simDroneInc=null;simYoloActive=[];renderYOLOList();addLog('MAVSDK: RTL command sent — returning to home','ros');}
function simTriggerDetection(){
  const labels=['FIRE','PERSON','VEHICLE','CROWD','WEAPON'];const label=labels[Math.floor(Math.random()*labels.length)];const incX=.2+Math.random()*.6,incY=.2+Math.random()*.6;
  simYoloActive=[{x:incX-.06,y:incY-.08,w:.15,h:.18,label,conf:.72+Math.random()*.25,action:'→ DISPATCH'}];simDroneInc={x:incX,y:incY,label};SIM_DRONES_STATE[0].tx=incX;SIM_DRONES_STATE[0].ty=incY;renderYOLOList();
  const c=xyToCoordStr(incX,incY);
  addLog(`YOLO SIM: ${label} @ [${c.short}] — drone dispatched`,'yolo');
  document.getElementById('yoloInf').textContent=(14+Math.floor(Math.random()*8))+'ms';
}
function simEmergencyStop(){SIM_DRONES_STATE[0].tx=SIM_DRONES_STATE[0].x;SIM_DRONES_STATE[0].ty=SIM_DRONES_STATE[0].y;addLog('MAVSDK: EMERGENCY STOP — drone holding position','alert');document.getElementById('mavMode').textContent='HOLD';document.getElementById('mavSpeed').textContent='0.0 m/s';}

// ═══════════════════════════════════════════════════════════════════════════
