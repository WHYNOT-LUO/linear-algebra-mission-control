/* ════════════════════════════════════════════
   VISUALIZATIONS
════════════════════════════════════════════ */
const VIS_H=260;
// Size the backing store for the device pixel ratio so lines stay sharp on retina screens;
// drawing code keeps working in CSS pixels.
function getVis(id){
  const c=document.getElementById(id);if(!c)return null;
  const ctx=c.getContext('2d');
  const w=c.clientWidth||300,dpr=window.devicePixelRatio||1;
  c.width=Math.round(w*dpr);c.height=Math.round(VIS_H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return{ctx,w,h:VIS_H};
}
function drawAllVisuals(){drawTransform();drawEigen();drawProjection();drawSVD();}
function cssx(v){return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v).trim())||0;}

function getColor(name){
  const map={'--blue':'#4a90ff','--green':'#20d47e','--gold':'#f0c040','--red':'#ff4060','--purple':'#9b6bff','--muted':'#7a8aa6','--dim':'#2e3b55','--line':'#1e2638','--bright':'#eef2ff','--text':'#c2ccdf','--bg':'#060810','--bg2':'#0b0e1a','--bg3':'#101425'};
  return map[name]||'#fff';
}

function setupGrid(ctx,w,h,ox,oy,scale){
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle=getColor('--line');ctx.lineWidth=1;
  for(let x=-10;x<=10;x++){const px=ox+x*scale;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke();}
  for(let y=-10;y<=10;y++){const py=oy+y*scale;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke();}
  ctx.strokeStyle=getColor('--dim');ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(w,oy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,h);ctx.stroke();
}

function drawArrow(ctx,ox,oy,scale,vx,vy,color,label,lw=2.5){
  const tx=ox+vx*scale,ty=oy-vy*scale;
  const ang=Math.atan2(oy-ty,tx-ox);
  const al=10,aa=0.4;
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=lw;
  ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(tx,ty);ctx.stroke();
  ctx.beginPath();ctx.moveTo(tx,ty);
  ctx.lineTo(tx-al*Math.cos(ang-aa),ty-al*Math.sin(ang-aa));
  ctx.lineTo(tx-al*Math.cos(ang+aa),ty-al*Math.sin(ang+aa));
  ctx.closePath();ctx.fill();
  if(label){ctx.font='bold 13px Space Mono,monospace';ctx.fillStyle=color;ctx.fillText(label,tx+8,ty-6);}
}

function drawTransform(){
  const v=getVis('c-transform');if(!v)return;
  const{ctx,w,h}=v;
  const a=parseFloat(document.getElementById('mt-a').value);
  const b=parseFloat(document.getElementById('mt-b').value);
  const c=parseFloat(document.getElementById('mt-c').value);
  const d=parseFloat(document.getElementById('mt-d').value);
  document.getElementById('mt-a-val').textContent=a.toFixed(1);
  document.getElementById('mt-b-val').textContent=b.toFixed(1);
  document.getElementById('mt-c-val').textContent=c.toFixed(1);
  document.getElementById('mt-d-val').textContent=d.toFixed(1);
  const scale=55,ox=w/2,oy=h/2;
  setupGrid(ctx,w,h,ox,oy,scale);
  // original unit square (faint)
  ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
  ctx.strokeRect(ox,oy-scale,scale,scale);ctx.setLineDash([]);
  // transformed square
  const pts=[[0,0],[1,0],[1,1],[0,1]];
  const tpts=pts.map(([x,y])=>[a*x+b*y,c*x+d*y]);
  ctx.beginPath();
  tpts.forEach(([x,y],i)=>{const px=ox+x*scale,py=oy-y*scale;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);});
  ctx.closePath();ctx.fillStyle='rgba(74,144,255,0.1)';ctx.fill();
  ctx.strokeStyle=getColor('--blue');ctx.lineWidth=1.5;ctx.stroke();
  // basis vectors transformed
  drawArrow(ctx,ox,oy,scale,a,c,getColor('--blue'),'Ae₁');
  drawArrow(ctx,ox,oy,scale,b,d,getColor('--green'),'Ae₂');
  // det label
  const det=a*d-b*c;
  ctx.font='12px Space Mono,monospace';ctx.fillStyle=det>=0?getColor('--gold'):getColor('--red');
  ctx.fillText('det = '+(det).toFixed(2),10,20);
  ctx.fillStyle=getColor('--muted');ctx.font='11px Space Mono,monospace';
  ctx.fillText('[['+a.toFixed(1)+', '+b.toFixed(1)+'],['+c.toFixed(1)+', '+d.toFixed(1)+']]',10,h-10);
}

function drawEigen(){
  const v=getVis('c-eigen');if(!v)return;
  const{ctx,w,h}=v;
  const l1=parseFloat(document.getElementById('ev-l1').value);
  const l2=parseFloat(document.getElementById('ev-l2').value);
  const theta=parseFloat(document.getElementById('ev-theta').value)*Math.PI/180;
  document.getElementById('ev-l1-val').textContent=l1.toFixed(1);
  document.getElementById('ev-l2-val').textContent=l2.toFixed(1);
  document.getElementById('ev-theta-val').textContent=document.getElementById('ev-theta').value+'°';
  const scale=50,ox=w/2,oy=h/2;
  setupGrid(ctx,w,h,ox,oy,scale);
  // Eigenvectors: v1 at angle theta, v2 perpendicular
  const v1x=Math.cos(theta),v1y=Math.sin(theta);
  const v2x=-Math.sin(theta),v2y=Math.cos(theta);
  // A = S * diag(l1,l2) * S^-1
  // Draw some non-eigenvectors getting rotated
  const nonEig=[[1,0.3],[0.5,0.8],[-0.6,0.7],[-0.9,-0.2]];
  nonEig.forEach(([x,y])=>{
    // transform: project onto eigenvectors, scale, reconstruct
    const c1=(x*v1x+y*v1y);const c2=(x*v2x+y*v2y);
    const tx=c1*l1*v1x+c2*l2*v2x,ty=c1*l1*v1y+c2*l2*v2y;
    ctx.strokeStyle='rgba(90,106,133,0.4)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(ox+x*scale,oy-y*scale);ctx.lineTo(ox+tx*scale,oy-ty*scale);ctx.stroke();
    ctx.setLineDash([]);
    drawArrow(ctx,ox,oy,scale,x,y,'rgba(90,106,133,0.5)','',1.5);
    drawArrow(ctx,ox,oy,scale,tx,ty,'rgba(155,107,255,0.5)','',1.5);
  });
  // Draw eigenvectors (unchanged direction, only scaled)
  drawArrow(ctx,ox,oy,scale,v1x,v1y,'rgba(74,144,255,0.35)','v₁',1.5);
  drawArrow(ctx,ox,oy,scale,l1*v1x,l1*v1y,getColor('--blue'),'λ₁v₁',2.5);
  drawArrow(ctx,ox,oy,scale,v2x,v2y,'rgba(32,212,126,0.35)','v₂',1.5);
  drawArrow(ctx,ox,oy,scale,l2*v2x,l2*v2y,getColor('--green'),'λ₂v₂',2.5);
  ctx.font='11px Space Mono,monospace';ctx.fillStyle=getColor('--muted');
  ctx.fillText('λ₁='+l1.toFixed(1)+'  λ₂='+l2.toFixed(1),10,20);
}

function drawProjection(){
  const v=getVis('c-proj');if(!v)return;
  const{ctx,w,h}=v;
  const angle=parseFloat(document.getElementById('proj-angle').value)*Math.PI/180;
  const bx=parseFloat(document.getElementById('proj-bx').value);
  const by=parseFloat(document.getElementById('proj-bx').value)*0.8+0.4;
  document.getElementById('proj-angle-val').textContent=document.getElementById('proj-angle').value+'°';
  document.getElementById('proj-bx-val').textContent=bx.toFixed(1);
  const scale=55,ox=w/2,oy=h/2;
  setupGrid(ctx,w,h,ox,oy,scale);
  // line direction
  const ax=Math.cos(angle),ay=Math.sin(angle);
  // draw line through origin
  ctx.strokeStyle=getColor('--gold');ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
  const far=3;
  ctx.beginPath();ctx.moveTo(ox-far*ax*scale,oy+far*ay*scale);ctx.lineTo(ox+far*ax*scale,oy-far*ay*scale);
  ctx.stroke();ctx.setLineDash([]);
  // vector b
  const bxv=bx,byv=1.2;
  // projection scalar
  const dot=bxv*ax+byv*ay;
  const ata=ax*ax+ay*ay;
  const s=dot/ata;
  const px=s*ax,py=s*ay;
  // error
  const ex=bxv-px,ey=byv-py;
  // draw b
  drawArrow(ctx,ox,oy,scale,bxv,byv,getColor('--blue'),'b');
  // draw projection p
  drawArrow(ctx,ox,oy,scale,px,py,getColor('--green'),'p');
  // draw error e (from p to b)
  const epx=ox+px*scale,epy=oy-py*scale;
  drawArrow(ctx,epx,epy,scale,ex,ey,getColor('--red'),'e');
  // right angle marker at p
  const size=8;const nx=-ay,ny=-ax;
  ctx.strokeStyle=getColor('--dim');ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(epx+size*nx,epy-size*ny);
  ctx.lineTo(epx+size*nx+size*ax,epy-size*ny-size*ay);
  ctx.lineTo(epx+size*ax,epy-size*ay);
  ctx.stroke();
  ctx.font='11px Space Mono,monospace';ctx.fillStyle=getColor('--muted');
  ctx.fillText('e ⊥ a',10,20);
  ctx.fillStyle=getColor('--gold');ctx.fillText('a',ox+far*ax*scale-15,oy-far*ay*scale+5);
}

function drawSVD(){
  const v=getVis('c-svd');if(!v)return;
  const{ctx,w,h}=v;
  const s1=parseFloat(document.getElementById('svd-s1').value);
  const s2=parseFloat(document.getElementById('svd-s2').value);
  const rot=parseFloat(document.getElementById('svd-rot').value)*Math.PI/180;
  document.getElementById('svd-s1-val').textContent=s1.toFixed(1);
  document.getElementById('svd-s2-val').textContent=s2.toFixed(1);
  document.getElementById('svd-rot-val').textContent=document.getElementById('svd-rot').value+'°';
  const scale=50,ox=w/2,oy=h/2;
  setupGrid(ctx,w,h,ox,oy,scale);
  // unit circle (faint)
  ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.arc(ox,oy,scale,0,2*Math.PI);ctx.stroke();ctx.setLineDash([]);
  // transformed ellipse A = U Σ Vᵀ — we draw U Σ (the output ellipse rotated by rotation)
  ctx.save();ctx.translate(ox,oy);ctx.rotate(rot);
  ctx.strokeStyle=getColor('--blue');ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,s1*scale,s2*scale,0,0,2*Math.PI);ctx.stroke();
  ctx.fillStyle='rgba(74,144,255,0.07)';ctx.fill();
  // singular vectors U
  ctx.strokeStyle=getColor('--blue');ctx.fillStyle=getColor('--blue');ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(s1*scale,0);ctx.stroke();
  ctx.font='bold 12px Space Mono,monospace';ctx.fillText('σ₁u₁',s1*scale+5,-4);
  ctx.strokeStyle=getColor('--gold');ctx.fillStyle=getColor('--gold');ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-s2*scale);ctx.stroke();
  ctx.fillText('σ₂u₂',4,-s2*scale-5);
  ctx.restore();
  // input singular vectors V (before rotation)
  drawArrow(ctx,ox,oy,scale,1,0,'rgba(74,144,255,0.4)','v₁',1.5);
  drawArrow(ctx,ox,oy,scale,0,1,'rgba(240,192,64,0.4)','v₂',1.5);
  ctx.font='11px Space Mono,monospace';ctx.fillStyle=getColor('--muted');
  ctx.fillText('σ₁='+s1.toFixed(1)+'  σ₂='+s2.toFixed(1),10,20);
}
