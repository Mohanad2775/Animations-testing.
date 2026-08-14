const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const room=$('#roomCanvas'), roomCtx=room.getContext('2d',{willReadFrequently:true});
const rigs=$('#rigCanvas'), rigCtx=rigs.getContext('2d');
const density=$('#density'), colorDepth=$('#colorDepth');
const roomImage=new Image();roomImage.src='assets/room-empty.png';
let selected=0, sourceMode=false, paused=false, bones=false, start=performance.now(), bgBuffer;

const people=[
 {name:'NOAH',x:.355,y:.425,scale:.72,flip:1,layer:'rear',action:'write',skin:'#b78268',hair:'#1b1d1b',shirt:'#66754f',pants:'#252b2b'},
 {name:'AMINA',x:.665,y:.445,scale:.69,flip:-1,layer:'rear',action:'read',skin:'#b9795e',hair:'#191b1d',shirt:'#47566d',pants:'#242b32'},
 {name:'LEILA',x:.345,y:.675,scale:.78,flip:-1,layer:'front',action:'think',skin:'#9c6750',hair:'#191817',shirt:'#716257',pants:'#272a2b'},
 {name:'JIN',x:.68,y:.69,scale:.77,flip:1,layer:'front',action:'type',skin:'#c39574',hair:'#202329',shirt:'#414b4d',pants:'#222728'}
];

function load(img){return img.decode?img.decode():new Promise((ok,no)=>{img.onload=ok;img.onerror=no})}
function pixelateBackground(raw=false){
 const size=+density.value;room.width=room.height=rigs.width=rigs.height=size;
 roomCtx.imageSmoothingEnabled=raw;roomCtx.clearRect(0,0,size,size);roomCtx.drawImage(roomImage,0,0,size,size);
 if(!raw){const im=roomCtx.getImageData(0,0,size,size),d=im.data,levels=Math.max(2,Math.ceil(Math.cbrt(+colorDepth.value))),step=255/(levels-1),m=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,n=(m[y&3][x&3]-7.5)*1.7;d[i]=Math.round(Math.max(0,Math.min(255,d[i]+n))/step)*step;d[i+1]=Math.round(Math.max(0,Math.min(255,d[i+1]+n))/step)*step;d[i+2]=Math.round(Math.max(0,Math.min(255,d[i+2]+n))/step)*step}roomCtx.putImageData(im,0,0)}
 bgBuffer=document.createElement('canvas');bgBuffer.width=bgBuffer.height=size;bgBuffer.getContext('2d').drawImage(room,0,0);
}
const pt=(x,y)=>({x,y});
function lerp(a,b,t){return a+(b-a)*t}
function pose(person,t){
 const breath=Math.sin(t*1.6+person.x*10)*.7, type=Math.sin(t*7), slow=Math.sin(t*1.2), done=person.action==='done';
 let p={pelvis:pt(0,0),chest:pt(0,-24-breath),neck:pt(0,-37-breath),head:pt(1,-49-breath),lh:pt(-8,-17),rh:pt(8,-17),lk:pt(-13,19),rk:pt(14,18),lf:pt(-17,35),rf:pt(19,34)};
 if(person.action==='write'){p.le=pt(-14,-12);p.lw=pt(-5,-4);p.re=pt(14,-11);p.rw=pt(8+type*1.7,-2+Math.abs(type));p.head.x=3+slow}
 else if(person.action==='read'){p.le=pt(-15,-10);p.lw=pt(-10,-1);p.re=pt(15,-10);p.rw=pt(10,-1);p.head.y+=1;p.head.x=slow*.7}
 else if(person.action==='type'){p.le=pt(-16,-11);p.lw=pt(-7+type,-3+Math.max(0,type));p.re=pt(16,-11);p.rw=pt(7-type,-3+Math.max(0,-type));p.head.x=slow}
 else if(person.action==='think'){p.le=pt(-15,-11);p.lw=pt(-7,-2);p.re=pt(14,-18);p.rw=pt(6,-35);p.head.x=2+slow*1.2}
 else if(person.action==='break'){p.chest.x=-3;p.neck.x=-5;p.head.x=-7;p.le=pt(-18,-5);p.lw=pt(-20,8);p.re=pt(18,-5);p.rw=pt(20,8)}
 else if(done){const lift=Math.min(1,(Math.sin(t*4)+1)/2);p.le=pt(-19,-30);p.lw=pt(-22,-48-lift*3);p.re=pt(19,-30);p.rw=pt(22,-48-lift*3)}
 else{p.le=pt(-15,-10);p.lw=pt(-8,-2);p.re=pt(15,-10);p.rw=pt(8,-2)}
 return p;
}
function line(c,a,b,width,color){c.strokeStyle='#121716';c.lineWidth=width+3;c.lineCap='butt';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function joint(c,p,r,color){c.fillStyle='#121716';c.fillRect(Math.round(p.x-r-1),Math.round(p.y-r-1),r*2+2,r*2+2);c.fillStyle=color;c.fillRect(Math.round(p.x-r),Math.round(p.y-r),r*2,r*2)}
function drawPerson(c,person,time){
 const P=pose(person,time);c.save();c.translate(person.x*rigs.width,person.y*rigs.height);const s=rigs.width/256*person.scale;c.scale(s*person.flip,s);
 // seated legs behind torso
 line(c,P.pelvis,P.lk,9,person.pants);line(c,P.lk,P.lf,8,person.pants);line(c,P.pelvis,P.rk,9,person.pants);line(c,P.rk,P.rf,8,person.pants);
 line(c,P.pelvis,P.chest,17,person.shirt);joint(c,P.pelvis,8,person.shirt);line(c,P.chest,P.neck,12,person.shirt);
 // arms are true two-bone chains
 line(c,P.chest,P.le,7,person.shirt);line(c,P.le,P.lw,6,person.shirt);joint(c,P.lw,3,person.skin);
 line(c,P.chest,P.re,7,person.shirt);line(c,P.re,P.rw,6,person.shirt);joint(c,P.rw,3,person.skin);
 // neck, adult-proportioned head, hair and one-pixel expression
 line(c,P.neck,P.head,5,person.skin);c.fillStyle='#121716';c.fillRect(P.head.x-8,P.head.y-8,16,17);c.fillStyle=person.skin;c.fillRect(P.head.x-6,P.head.y-6,12,13);c.fillStyle=person.hair;c.fillRect(P.head.x-7,P.head.y-8,14,6);c.fillRect(P.head.x-7,P.head.y-3,3,6);
 const blinking=((time+person.x*7)%4.7)<.13;c.fillStyle='#242626';c.fillRect(P.head.x-3,P.head.y+(blinking?0:-1),blinking?6:2,1);if(!blinking)c.fillRect(P.head.x+2,P.head.y-1,2,1);
 c.fillStyle='#111616';c.fillRect(P.lf.x-5,P.lf.y-2,11,5);c.fillRect(P.rf.x-5,P.rf.y-2,11,5);
 if(bones){c.strokeStyle='#b7d56b';c.lineWidth=1;c.beginPath();['pelvis','chest','neck','head'].forEach((k,i)=>i?c.lineTo(P[k].x,P[k].y):c.moveTo(P[k].x,P[k].y));c.stroke();['pelvis','chest','neck','head','le','lw','re','rw','lk','rk','lf','rf'].forEach(k=>{c.fillStyle='#d7ef88';c.fillRect(P[k].x-1,P[k].y-1,3,3)})}
 if(person===people[selected]){c.strokeStyle='#b7d56b';c.lineWidth=1;c.strokeRect(-28,-65,56,105);c.fillStyle='#b7d56b';c.font='5px Geist Mono';c.fillText(`0${selected+1} ${person.name}`, -27,-69)}
 c.restore();
}
function redrawTableMask(){
 const s=rigs.width,c=rigCtx;c.save();c.beginPath();c.moveTo(.18*s,.43*s);c.lineTo(.53*s,.35*s);c.lineTo(.88*s,.52*s);c.lineTo(.51*s,.80*s);c.closePath();c.clip();c.drawImage(bgBuffer,0,0);c.restore();
}
function frame(now){
 if(!paused&&!sourceMode){const t=(now-start)/1000;rigCtx.clearRect(0,0,rigs.width,rigs.height);people.filter(p=>p.layer==='rear').forEach(p=>drawPerson(rigCtx,p,t));redrawTableMask();people.filter(p=>p.layer==='front').forEach(p=>drawPerson(rigCtx,p,t))}
 requestAnimationFrame(frame);
}
function rebuild(){pixelateBackground(sourceMode)}
for(let i=0;i<22;i++){const d=document.createElement('i');d.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${-Math.random()}s`;$('#rain').append(d)}
function selectPlayer(i){selected=i;$$('[data-select]').forEach((b,n)=>b.classList.toggle('active',n===i));$('#selectedName').textContent=people[i].name;$$('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion===people[i].action.replace('write','focus').replace('read','focus').replace('type','focus')))}
$$('[data-select]').forEach((b,i)=>b.onclick=()=>selectPlayer(i));$$('.rig-hit').forEach(b=>b.onclick=()=>selectPlayer(+b.dataset.player));
$$('[data-motion]').forEach(b=>b.onclick=()=>{people[selected].action=b.dataset.motion==='focus'?['write','read','think','type'][selected]:b.dataset.motion;$$('[data-motion]').forEach(x=>x.classList.toggle('active',x===b))});
density.oninput=()=>{$('#densityOut').value=density.value;rebuild()};colorDepth.oninput=()=>{$('#colorOut').value=colorDepth.value;rebuild()};
$('#bonesToggle').onclick=()=>{bones=!bones;$('#bonesToggle').textContent=bones?'× HIDE BONES':'⌘ BONES'};
$('#sourceToggle').onclick=()=>{sourceMode=!sourceMode;$('#scene').classList.toggle('source',sourceMode);$('#sourceToggle').textContent=sourceMode?'▦ RIG VIEW':'◐ SOURCE';rigCtx.clearRect(0,0,rigs.width,rigs.height);rebuild()};
$('#motionToggle').onclick=()=>{paused=!paused;$('#scene').classList.toggle('paused',paused);$('#motionToggle').textContent=paused?'▶ RESUME':'Ⅱ PAUSE'};
$('#fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('#scene').requestFullscreen?.();
setInterval(()=>{const d=new Date();$('#clock').textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':')},1000);
$('#loading').classList.add('show');load(roomImage).then(()=>{rebuild();$('#loading').classList.remove('show');requestAnimationFrame(frame)}).catch(()=>{$('#loading span').textContent='ROOM ASSET FAILED'});
