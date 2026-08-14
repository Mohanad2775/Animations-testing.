const players = [
  {name:'NORA', role:'Research', skin:'#b9805f', hair:'#201b1a', cloth:'#687c78', accent:'#b8d46b'},
  {name:'ELIAS', role:'Reviewing', skin:'#d0a17d', hair:'#49362e', cloth:'#6d788d', accent:'#7da0a5'},
  {name:'MAYA', role:'Writing', skin:'#8f604b', hair:'#17191a', cloth:'#86695d', accent:'#c69b68'},
  {name:'JIN', role:'Reading', skin:'#c59677', hair:'#20252a', cloth:'#4f6667', accent:'#a8be72'}
];
const positions=['north','west','east','south'];
const $=s=>document.querySelector(s);

function roomFurniture(){
  return `<div class="table-leg l"></div><div class="table-leg r"></div><div class="iso-table"></div>
  <div class="table-item laptop item-a"></div><div class="table-item laptop item-b"></div>
  <div class="table-item book-item item-c"></div><div class="table-item cup item-d"></div>`;
}
function makeCssScene(){
  $('#cssScene').innerHTML=roomFurniture()+players.map((p,i)=>`<div class="seat ${positions[i]}">
    <div class="pixel-person" style="--skin:${p.skin};--hair:${p.hair};--cloth:${p.cloth}"></div>
    <div class="nameplate"><i></i>${p.name}</div></div>`).join('');
}
const maps={
  hair:['.HHHHH.','HH...HH'], face:['.SSSSS.','.SSSSS.','..SSS..'], body:['CCCCCCC','CCCCCCC','CCCCCCC','.CCCCC.']
};
function domAvatar(p){
  const rows=[...maps.hair,...maps.face,...maps.body];
  return `<div class="dom-pixel-person" style="--skin:${p.skin};--hair:${p.hair};--cloth:${p.cloth}">${rows.join('').split('').map(c=>`<i style="background:${c==='H'?p.hair:c==='S'?p.skin:c==='C'?p.cloth:'transparent'}"></i>`).join('')}</div>`;
}
function makeDomScene(){
  $('#domScene').innerHTML=roomFurniture()+players.map((p,i)=>`<div class="seat ${positions[i]}">${domAvatar(p)}<div class="nameplate"><i></i>${p.name}</div></div>`).join('');
}
makeCssScene(); makeDomScene();

// Pixel-perfect canvas engine: all geometry is snapped to a 4px virtual grid.
const canvas=$('#roomCanvas'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
let running=true,tick=0;
function poly(points,fill,stroke){ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=4;ctx.stroke()}}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x/4)*4,Math.round(y/4)*4,w,h)}
function canvasPerson(p,x,y,scale=1,flip=false){
  ctx.save();ctx.translate(x,y+(Math.floor(tick/28)%2)*2);ctx.scale(scale*(flip?-1:1),scale);
  rect(-16,38,32,12,'#080b0c88');
  rect(-12,0,24,8,p.hair);rect(-16,8,32,8,p.hair);rect(-12,12,24,20,p.skin);
  rect(-8,20,4,4,'#202525');rect(4,20,4,4,'#202525');
  rect(-16,32,32,32,p.cloth);rect(-24,36,8,24,p.cloth);rect(16,36,8,24,p.cloth);
  rect(-12,64,8,16,'#262d2c');rect(4,64,8,16,'#262d2c');
  rect(-16,80,12,4,'#101414');rect(4,80,12,4,'#101414');ctx.restore();
}
function canvasLaptop(x,y,accent){rect(x,y,60,36,'#17201f');rect(x+4,y+4,52,25,accent);rect(x-4,y+32,68,5,'#0b0e0e')}
function drawCanvas(){
  ctx.clearRect(0,0,960,600);
  // floor detail
  ctx.strokeStyle='#29333266';ctx.lineWidth=1;
  for(let i=-300;i<1200;i+=64){ctx.beginPath();ctx.moveTo(i,600);ctx.lineTo(i+500,100);ctx.stroke();ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+600,600);ctx.stroke()}
  // chairs behind the table
  rect(438,92,84,56,'#151d1c');rect(450,80,60,24,'#273230');
  canvasPerson(players[0],480,82,.82);
  rect(205,274,76,60,'#18201f');rect(216,258,55,25,'#2a3533');canvasPerson(players[1],240,225,.92);
  rect(680,274,76,60,'#18201f');rect(690,258,55,25,'#2a3533');canvasPerson(players[2],720,225,.92,true);
  // isometric table shadow + slab
  poly([[276,250],[492,154],[718,296],[490,416]],'#070a0a99');
  poly([[264,226],[478,142],[724,274],[490,390]],'#202a28','#111716');
  poly([[280,224],[478,154],[705,275],[490,374]],'#35423e','#59655f');
  poly([[264,226],[490,390],[490,414],[264,250]],'#19211f');poly([[490,390],[724,274],[724,298],[490,414]],'#111817');
  rect(338,342,16,100,'#17201f');rect(622,316,16,98,'#17201f');
  canvasLaptop(354,200,'#6c8f8199');canvasLaptop(546,246,'#84986699');
  rect(455,296,48,32,'#765746');rect(462,300,34,4,'#b28c68');rect(524,207,20,24,'#607778');
  // front player / chair
  rect(430,478,120,46,'#151d1c');rect(445,456,90,32,'#2b3634');canvasPerson(players[3],490,408,1.2);
  requestAnimationFrame(()=>{if(running){tick++;drawCanvas()}});
}
drawCanvas();

function drawMini(canvas,p,index){
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,128,128);
  c.fillStyle='#17201f';c.fillRect(28,94,72,8);
  const old=ctx; // stand-alone version of canvasPerson
  function r(x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h)}
  r(48,18,32,8,p.hair);r(44,26,40,12,p.hair);r(48,34,32,28,p.skin);
  if(index===0){r(42,28,6,28,p.hair);r(80,28,6,28,p.hair)}
  if(index===1){r(48,34,32,4,'#25201e');r(52,45,8,4,'#a9b4ac');r(68,45,8,4,'#a9b4ac')}
  if(index===2){r(44,22,40,12,p.hair);r(40,30,8,24,p.hair)}
  if(index===3){r(46,18,36,5,p.hair);r(44,22,8,12,p.hair)}
  r(42,62,44,44,p.cloth);r(30,68,12,32,p.cloth);r(86,68,12,32,p.cloth);
  r(48,106,14,10,'#29302f');r(68,106,14,10,'#29302f');
}
$('#identityGrid').innerHTML=players.map((p,i)=>`<article class="identity-card"><div class="mini-character"><canvas width="128" height="128" data-mini="${i}"></canvas></div><div class="card-meta"><div><b>${p.name}</b><small>${p.role.toUpperCase()} · SLOT 0${i+1}</small></div><span><i class="state-dot"></i>FOCUS</span></div></article>`).join('');
document.querySelectorAll('[data-mini]').forEach(c=>drawMini(c,players[+c.dataset.mini],+c.dataset.mini));

const engineData={
 shadow:{no:'01',label:'CSS SHADOW ENGINE',nodes:'29',weight:'LIGHT',edit:'LOW',bars:['18%','24%','32%'],note:'A pixel map becomes a single box-shadow declaration. Extremely lean markup; painful to hand-author, but ideal when generated from a tiny matrix.',verdict:'Best for small, fixed avatars',code:`.avatar {\n  width: 4px; height: 4px;\n  box-shadow: var(--pixel-map);\n  animation: focus 1.8s steps(2);\n}`},
 dom:{no:'02',label:'DOM GRID ENGINE',nodes:'241',weight:'MEDIUM',edit:'HIGH',bars:['72%','54%','88%'],note:'Each visible cell is a tiny DOM element generated from a readable character matrix. Parts are easy to recolor or swap, but node count grows quickly.',verdict:'Best for customizable identities',code:`const map = [\n  '.HHHHH.',\n  '.SSSSS.',\n  'CCCCCCC'\n];\nrenderPixels(map, palette);`},
 canvas:{no:'03',label:'CANVAS ENGINE',nodes:'1',weight:'LIGHT',edit:'MEDIUM',bars:['3%','20%','62%'],note:'The whole room is painted on one canvas using snapped rectangles and isometric polygons. Excellent runtime performance and total control at larger scale.',verdict:'Best for a production room',code:`ctx.imageSmoothingEnabled = false;\nrect(x, y, 24, 8, hair);\nrect(x-4, y+8, 32, 24, skin);\nrequestAnimationFrame(drawRoom);`}
};
function setEngine(engine){
  document.querySelectorAll('.engine-tab').forEach(b=>b.classList.toggle('active',b.dataset.engine===engine));
  document.querySelectorAll('.scene-layer').forEach(s=>s.classList.remove('active'));
  ({shadow:$('#cssScene'),dom:$('#domScene'),canvas})[engine].classList.add('active');
  const d=engineData[engine];$('#engineNo').textContent=d.no;$('#engineLabel').textContent=d.label;$('#nodes').textContent=d.nodes;$('#weight').textContent=d.weight;$('#edit').textContent=d.edit;
  ['nodeBar','weightBar','editBar'].forEach((id,i)=>$('#'+id).style.width=d.bars[i]);$('#engineNote').textContent=d.note;$('#verdict').textContent=d.verdict;$('#code').textContent=d.code;
}
document.querySelectorAll('.engine-tab').forEach(b=>b.onclick=()=>setEngine(b.dataset.engine));
$('#motionToggle').onclick=()=>{running=!running;$('#viewport').classList.toggle('paused',!running);$('#motionToggle').innerHTML=running?'Ⅱ&nbsp; PAUSE MOTION':'▶&nbsp; RESUME MOTION';if(running)drawCanvas()};
$('#gridToggle').onclick=()=>{$('#viewport').classList.toggle('show-grid');$('#gridToggle').classList.toggle('on')};
$('#copyCode').onclick=async()=>{try{await navigator.clipboard.writeText($('#code').textContent)}catch{}$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1400)};
