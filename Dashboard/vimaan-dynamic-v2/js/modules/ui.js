// VIMAAN DYNAMIC v2 — // UI RENDERING + FEEDS

//  RENDER: DRONE LIST
// ═══════════════════════════════════════════════════════════════════════════
function renderDrones(){
  const list=document.getElementById('droneList');
  list.innerHTML=STATE.drones.map(d=>{
    const batClass=d.battery>60?'bat-high':d.battery>30?'bat-mid':'bat-low';
    const statusClass=d.status==='standby'?'status-standby':d.status==='dispatched'?'status-dispatched':d.status==='returning'?'status-returning':d.status==='avoiding'?'status-avoiding':'status-charging';
    const cardClass=`${d.status==='dispatched'?'dispatched':''} ${d.battery<25?'low-battery':''} ${d.boundaryBreach?'boundary-breach':''}`.trim();
    const col=getDroneColor(d.status);const spinning=d.status==='dispatched'||d.status==='returning'||d.status==='avoiding';
    const statusLabel=d.status==='avoiding'?`AVOID: ${(d.avoidingObstacle||'OBSTACLE').substring(0,10)}`:d.status.toUpperCase();
    // ★ NEW: Include current lat/lng in drone card
    const coords=xyToCoordStr(d.x,d.y);
    return`<div class="drone-card ${cardClass}">
      <div class="drone-top"><div class="drone-left"><div class="drone-icon-card">${droneSVG(col,spinning)}</div><span class="drone-id">${d.id}</span></div><span class="drone-status-tag ${statusClass}">${statusLabel}</span></div>
      <div class="drone-metrics">
        <div class="metric">BAT <span class="metric-val">${d.battery.toFixed(0)}%</span></div>
        <div class="metric">ALT <span class="metric-val">${d.altitude.toFixed(0)}m</span></div>
        <div class="metric">HDG <span class="metric-val">${((d.heading||0)*180/Math.PI).toFixed(0)}°</span></div>
        <div class="metric">ETA <span class="metric-val">${d.eta?d.eta+'s':'--'}</span></div>
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:7px;color:rgba(56,189,248,.6);margin-top:4px;letter-spacing:.3px;">${coords.lat}°N, ${coords.lng}°E</div>
      <div class="battery-bar"><div class="battery-fill ${batClass}" style="width:${d.battery}%"></div></div>
    </div>`;
  }).join('');
  document.getElementById('activeCount').textContent=STATE.drones.filter(d=>d.status==='standby').length;
  document.getElementById('dispatchCount').textContent=STATE.drones.filter(d=>d.status==='dispatched').length;
  document.getElementById('avoidingCount').textContent=STATE.drones.filter(d=>d.status==='avoiding').length;
  updateLeafletDrones();
}

// ═══════════════════════════════════════════════════════════════════════════
//  RENDER: INCIDENTS
//  ★ MODIFIED: Now includes incident coordinates in the card display
// ═══════════════════════════════════════════════════════════════════════════
function renderIncidents(){
  const list=document.getElementById('incidentList');
  const active=STATE.incidents.filter(i=>i.status!=='resolved');
  document.getElementById('incidentBadge').textContent=`${active.length} ALERTS`;
  document.getElementById('headerAlert').textContent=`${active.length} ACTIVE INCIDENTS`;
  const dot=document.getElementById('incidentDot');
  dot.style.background=active.length>0?'var(--accent-danger)':'var(--text-dim)';
  dot.style.boxShadow=active.length>0?'0 0 6px var(--accent-danger)':'none';

  if(active.length===0){list.innerHTML=`<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-dim);text-align:center;padding:20px;">MONITORING — NO INCIDENTS<br><br><span style="font-size:8px">Scanning all feeds</span></div>`;updateLeafletIncidents();return;}
  if(list.children.length>0&&!list.children[0].classList.contains('incident-card')) list.innerHTML='';
  const activeIds=new Set(active.map(i=>`inc-${i.id}`));
  Array.from(list.children).forEach(child=>{if(!activeIds.has(child.id))child.remove();});
  active.slice().reverse().forEach((inc,index)=>{
    const sevClass=inc.severity==='critical'?'sev-critical':inc.severity==='high'?'sev-high':'sev-medium';
    const cardId=`inc-${inc.id}`;
    let card=document.getElementById(cardId);

    // ★ NEW: Compute and display incident coordinates
    const incCoords=xyToCoordStr(inc.x,inc.y);

    const content=`
      <div class="inc-top"><span class="inc-type">${inc.icon} ${inc.type}</span><span class="severity-tag ${sevClass}">${inc.severity.toUpperCase()}</span></div>
      <div class="inc-location">📍 ${inc.location} | CAM-${inc.cam+1}</div>
      <div class="inc-location">${inc.desc} | CONF: ${(inc.confidence*100).toFixed(1)}%</div>
      <div class="inc-coords">${incCoords.lat}°N, ${incCoords.lng}°E</div>
      <div class="inc-dispatch"><span class="inc-drone-assigned">${inc.droneId?'▶ '+inc.droneId:'⏳ QUEUED'}</span><span class="inc-eta">${inc.eta?'ETA '+inc.eta+'s':'--'}</span></div>`;

    if(!card){card=document.createElement('div');card.id=cardId;card.className=`incident-card ${inc.severity==='critical'?'critical':''}`;card.innerHTML=content;list.appendChild(card);}
    else{card.className=`incident-card ${inc.severity==='critical'?'critical':''}`;card.innerHTML=content;}
    if(list.children[index]!==card) list.insertBefore(card,list.children[index]);
  });
  updateLeafletIncidents();
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOG
// ═══════════════════════════════════════════════════════════════════════════
function addLog(msg,type=''){
  const time=new Date().toLocaleTimeString('en-GB',{hour12:false});
  STATE.logEntries.unshift({time,msg,type});if(STATE.logEntries.length>80)STATE.logEntries.pop();
  const list=document.getElementById('logList');
  const entry=document.createElement('div');entry.className='log-entry';
  entry.innerHTML=`<span class="log-time">${time}</span><span class="log-msg ${type}">${msg}</span>`;
  list.insertBefore(entry,list.firstChild);if(list.children.length>80)list.removeChild(list.lastChild);
}

// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO FEEDS
// ═══════════════════════════════════════════════════════════════════════════
const FEED_NAMES=['FC ROAD / SECTOR 7A','STATION PLAZA / SECTOR 3B','KOREGAON PARK / SECTOR 4C','VIMAN NAGAR / SECTOR 9D'];
const FEED_TYPES=['intersection','commercial','park','highway'];

function initFeeds(){
  STATE.feeds=FEED_NAMES.map((name,i)=>({name,type:FEED_TYPES[i],alerting:false,detections:[],noisePhase:Math.random()*Math.PI*2,people:Array.from({length:3+Math.floor(Math.random()*5)},()=>({x:Math.random(),y:.3+Math.random()*.6,vx:(Math.random()-.5)*.003,vy:(Math.random()-.5)*.001,size:3+Math.random()*3})),vehicles:Array.from({length:Math.floor(Math.random()*3)},()=>({x:Math.random(),y:.2+Math.random()*.7,vx:(Math.random()-.5)*.005,w:10+Math.random()*8,h:5+Math.random()*4}))}));
  const grid=document.getElementById('feedsGrid');grid.innerHTML='';
  STATE.feeds.forEach((feed,i)=>{
    const slot=document.createElement('div');slot.className='feed-slot';slot.id=`feedSlot${i}`;
    const webcamHtml=i===0?`<video id="webcamVideo" class="webcam-video" autoplay muted playsinline></video>`:'';
    slot.innerHTML=`${webcamHtml}<canvas class="feed-canvas" id="feedCanvas${i}"></canvas><div class="feed-alert-overlay"></div><div class="feed-label"><span id="feedLabel${i}">CAM-${i+1} | ${feed.name}</span><span id="feedStatus${i}" style="color:var(--accent-ok)">● LIVE</span></div>`;
    grid.appendChild(slot);
  });
}

function renderFeed(i,dt){
  const canvas=document.getElementById(`feedCanvas${i}`);if(!canvas)return;
  const slot=document.getElementById(`feedSlot${i}`);const feed=STATE.feeds[i];
  if(i===0&&STATE.webcamActive){renderWebcamOverlay(canvas,dt);if(feed.alerting)slot.classList.add('alerting');else slot.classList.remove('alerting');return;}
  const W=slot.clientWidth,H=slot.clientHeight;canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#0d0d0d');grad.addColorStop(1,'#050505');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.03)';ctx.lineWidth=1;for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.fillStyle='rgba(30,30,30,.6)';ctx.fillRect(0,H*.45,W,H*.15);ctx.strokeStyle='rgba(255,255,200,.08)';ctx.setLineDash([W*.05,W*.05]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H*.525);ctx.lineTo(W,H*.525);ctx.stroke();ctx.setLineDash([]);
  const bh2=[.5,.35,.45,.3,.4,.55,.35];bh2.forEach((h,bi)=>{const bw=W/bh2.length;ctx.fillStyle=`rgba(15,15,15,${.85+bi*.02})`;ctx.fillRect(bi*bw+1,H*(1-h),bw-2,H*h);for(let wr=0;wr<3;wr++){for(let wc=0;wc<2;wc++){if(Math.random()>.4){ctx.fillStyle='rgba(255,230,100,.2)';ctx.fillRect(bi*bw+4+wc*8,H*(1-h)+6+wr*10,5,4);}}}});
  for(const p of feed.people){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>1)p.vx*=-1;if(p.y<.2||p.y>.95)p.vy*=-1;const px=p.x*W,py=p.y*H;ctx.fillStyle='rgba(180,200,220,.6)';ctx.beginPath();ctx.arc(px,py-p.size,p.size*.6,0,Math.PI*2);ctx.fill();ctx.fillRect(px-p.size*.4,py-p.size,p.size*.8,p.size*1.5);}
  for(const v of feed.vehicles){v.x+=v.vx;if(v.x<-.1)v.x=1.1;if(v.x>1.1)v.x=-.1;ctx.fillStyle='rgba(60,80,100,.5)';ctx.fillRect(v.x*W,v.y*H,v.w,v.h);ctx.fillStyle='rgba(255,210,50,.5)';ctx.fillRect(v.vx>0?(v.x*W+v.w-2):v.x*W,v.y*H,2,v.h);}
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(2,2,122,14);ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='8px JetBrains Mono, monospace';ctx.fillText(new Date().toLocaleTimeString('en-GB',{hour12:false}),4,12);
  for(const det of feed.detections){const bx=det.x*W,by=det.y*H,bw=det.w*W,bh=det.h*H;ctx.strokeStyle='#a3e635';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,bw,bh);const cs=8;ctx.lineWidth=2.5;ctx.strokeStyle='#a3e635';ctx.beginPath();ctx.moveTo(bx,by+cs);ctx.lineTo(bx,by);ctx.lineTo(bx+cs,by);ctx.moveTo(bx+bw-cs,by);ctx.lineTo(bx+bw,by);ctx.lineTo(bx+bw,by+cs);ctx.moveTo(bx+bw,by+bh-cs);ctx.lineTo(bx+bw,by+bh);ctx.lineTo(bx+bw-cs,by+bh);ctx.moveTo(bx+cs,by+bh);ctx.lineTo(bx,by+bh);ctx.lineTo(bx,by+bh-cs);ctx.stroke();ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(bx,by-14,det.label.length*5.2+18,14);ctx.fillStyle='#a3e635';ctx.font='8px JetBrains Mono, monospace';ctx.fillText(`${det.label} ${(det.conf*100).toFixed(0)}%`,bx+2,by-3);ctx.fillStyle='rgba(163,230,53,.2)';ctx.fillRect(bx,by+bh+1,bw,2);ctx.fillStyle='#a3e635';ctx.fillRect(bx,by+bh+1,bw*det.conf,2);}
  if(feed.alerting)slot.classList.add('alerting');else slot.classList.remove('alerting');
  feed.noisePhase+=.05;const scanY2=((Math.sin(feed.noisePhase)*.5+.5)*H)|0;const sg=ctx.createLinearGradient(0,scanY2-3,0,scanY2+3);sg.addColorStop(0,'transparent');sg.addColorStop(.5,'rgba(255,255,255,.025)');sg.addColorStop(1,'transparent');ctx.fillStyle=sg;ctx.fillRect(0,scanY2-3,W,6);
}

// ═══════════════════════════════════════════════════════════════════════════
