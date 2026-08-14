const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const roomCanvas=$('#roomCanvas'), roomCtx=roomCanvas.getContext('2d');
const density=$('#density'), colorDepth=$('#colorDepth');
const sources=['assets/room-empty.png','assets/player-northwest.png','assets/player-northeast.png','assets/player-southwest.png','assets/player-southeast.png'];
const images=sources.map(src=>{const img=new Image();img.src=src;return img});
let selected=0, sourceMode=false, renderTimer, paused=false;

function load(img){return img.decode ? img.decode() : new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject})}
function processImage(img,canvas,w,h,raw=false){
  canvas.width=Math.max(1,Math.round(w));canvas.height=Math.max(1,Math.round(h));
  const c=canvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=true;c.drawImage(img,0,0,canvas.width,canvas.height);
  if(raw)return;
  const image=c.getImageData(0,0,canvas.width,canvas.height),d=image.data;
  const colors=+colorDepth.value,levels=Math.max(2,Math.round(Math.cbrt(colors))),step=255/(levels-1);
  const matrix=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const i=(y*canvas.width+x)*4;if(d[i+3]<20){d[i+3]=0;continue}
    const n=(matrix[y&3][x&3]-7.5)*2.1;
    d[i]=Math.round(Math.max(0,Math.min(255,d[i]+n))/step)*step;
    d[i+1]=Math.round(Math.max(0,Math.min(255,d[i+1]+n))/step)*step;
    d[i+2]=Math.round(Math.max(0,Math.min(255,d[i+2]+n))/step)*step;
  }
  c.putImageData(image,0,0);
}
function render(){
  $('#loading').classList.add('show');requestAnimationFrame(()=>{
    const px=+density.value;processImage(images[0],roomCanvas,px,px,sourceMode);
    $$('.player').forEach((rig,i)=>{
      const ratio=rig.clientWidth/$('#scene').clientWidth;
      const w=Math.max(28,px*ratio),h=w*(images[i+1].height/images[i+1].width);
      rig.querySelectorAll('canvas').forEach(c=>processImage(images[i+1],c,w,h,false));
    });
    $('#loading').classList.remove('show');
  });
}
function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(render,80)}

// Create low-cost rain motion over the window; this remains separate from the image plate.
for(let i=0;i<22;i++){const drop=document.createElement('i');drop.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${-Math.random()}s;animation-duration:${.55+Math.random()*.65}s`;$('#rain').append(drop)}

function selectPlayer(index){selected=index;$$('[data-select]').forEach((b,i)=>b.classList.toggle('active',i===index));$$('.player').forEach((p,i)=>p.classList.toggle('selected',i===index));$('#selectedName').textContent=['NOAH','AMINA','LEILA','JIN'][index];const player=$$('.player')[index],state=[...player.classList].find(c=>c.startsWith('state-'))?.slice(6)||'focus';$$('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion===state))}
$$('[data-select]').forEach((b,i)=>b.onclick=()=>selectPlayer(i));$$('.player').forEach((p,i)=>p.onclick=()=>selectPlayer(i));selectPlayer(0);
$$('[data-motion]').forEach(button=>button.onclick=()=>{
  const player=$$('.player')[selected];player.classList.remove('state-focus','state-think','state-break','state-done');player.classList.add(`state-${button.dataset.motion}`);
  $$('[data-motion]').forEach(b=>b.classList.toggle('active',b===button));
  const labels={focus:['FOCUSED','FOCUS'],think:['THINKING','···'],break:['ON BREAK','Z'],done:['SESSION DONE','✓']},d=labels[button.dataset.motion];
  player.querySelector('.tag small').textContent=d[0];player.querySelector('.activity').textContent=d[1];
});

density.oninput=()=>{$('#densityOut').value=density.value;schedule()};colorDepth.oninput=()=>{$('#colorOut').value=colorDepth.value;schedule()};
$('#sourceToggle').onclick=()=>{sourceMode=!sourceMode;$('#scene').classList.toggle('source',sourceMode);$('#sourceToggle').textContent=sourceMode?'▦ PIXEL VIEW':'◐ SOURCE';render()};
$('#motionToggle').onclick=()=>{paused=!paused;$('#scene').classList.toggle('paused',paused);$('#motionToggle').textContent=paused?'▶ RESUME':'Ⅱ PAUSE'};
$('#fullscreenBtn').onclick=()=>{const stage=$('#scene');if(document.fullscreenElement)document.exitFullscreen();else stage.requestFullscreen?.()};
setInterval(()=>{const d=new Date();$('#clock').textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':')},1000);

$('#loading').classList.add('show');Promise.all(images.map(load)).then(render).catch(error=>{console.error(error);$('#loading span').textContent='ASSET LOAD FAILED'});window.addEventListener('resize',schedule);
