const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#displayCanvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
const sourceImg=new Image(), avatarImg=new Image();
sourceImg.src='assets/study-room-source.png'; avatarImg.src='assets/avatar-source.png';
let currentPalette=[], dither='ordered', view='processed', renderTimer;
const controls={resolution:$('#resolution'),colors:$('#colors'),contrast:$('#contrast'),saturation:$('#saturation'),edges:$('#edges')};
const defaults={resolution:192,colors:16,contrast:12,saturation:-18,dither:'ordered',edges:true};

function medianCut(data,count){
  const samples=[];
  for(let i=0;i<data.length;i+=64){const a=data[i+3];if(a>20)samples.push([data[i],data[i+1],data[i+2]])}
  let boxes=[samples];
  while(boxes.length<count){
    let bi=-1,best=-1,channel=0;
    boxes.forEach((box,i)=>{if(box.length<2)return;for(let c=0;c<3;c++){let min=255,max=0;for(const p of box){min=Math.min(min,p[c]);max=Math.max(max,p[c])}if(max-min>best){best=max-min;bi=i;channel=c}}});
    if(bi<0)break;const box=boxes.splice(bi,1)[0];box.sort((a,b)=>a[channel]-b[channel]);const mid=box.length>>1;boxes.push(box.slice(0,mid),box.slice(mid));
  }
  return boxes.map(box=>{const sum=box.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]);return sum.map(v=>Math.round(v/box.length))});
}
function nearest(r,g,b,palette){let best=palette[0],dist=Infinity;for(const p of palette){const d=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;if(d<dist){dist=d;best=p}}return best}
function tune(data,contrast,saturation){
  const cf=(259*(contrast+255))/(255*(259-contrast));
  for(let i=0;i<data.length;i+=4){let r=cf*(data[i]-128)+128,g=cf*(data[i+1]-128)+128,b=cf*(data[i+2]-128)+128;const gray=.299*r+.587*g+.114*b,s=1+saturation/100;data[i]=gray+(r-gray)*s;data[i+1]=gray+(g-gray)*s;data[i+2]=gray+(b-gray)*s}
}
const bayer=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function quantize(image,palette,mode,edges){
  const {data,width:w,height:h}=image, original=new Uint8ClampedArray(data);
  if(mode==='floyd'){
    const f=new Float32Array(data);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4,p=nearest(f[i],f[i+1],f[i+2],palette);
      const er=f[i]-p[0],eg=f[i+1]-p[1],eb=f[i+2]-p[2];
      data[i]=p[0];data[i+1]=p[1];data[i+2]=p[2];
      [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]].forEach(([dx,dy,k])=>{
        const nx=x+dx,ny=y+dy;
        if(nx>=0&&nx<w&&ny<h){const n=(ny*w+nx)*4;f[n]+=er*k;f[n+1]+=eg*k;f[n+2]+=eb*k}
      });
    }
  }else{
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4,off=mode==='ordered'?(bayer[y%4][x%4]-7.5)*2.3:0;
      const p=nearest(data[i]+off,data[i+1]+off,data[i+2]+off,palette);
      data[i]=p[0];data[i+1]=p[1];data[i+2]=p[2];
    }
  }
  if(edges) for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const i=(y*w+x)*4,l=.299*original[i]+.587*original[i+1]+.114*original[i+2];
    const j=(y*w+x+1)*4,k=((y+1)*w+x)*4;
    const edge=Math.abs(l-(.299*original[j]+.587*original[j+1]+.114*original[j+2]))+Math.abs(l-(.299*original[k]+.587*original[k+1]+.114*original[k+2]));
    if(edge>55){data[i]*=.78;data[i+1]*=.78;data[i+2]*=.78}
  }
  return image;
}
function cropCover(img,aspect){const a=img.width/img.height;if(a>aspect){const sw=img.height*aspect;return[(img.width-sw)/2,0,sw,img.height]}const sh=img.width/aspect;return[0,(img.height-sh)/2,img.width,sh]}
function render(){
  if(!sourceImg.complete)return;$('#processing').classList.add('show');requestAnimationFrame(()=>{
    const base=+controls.resolution.value,aspect=$('#viewport').clientWidth/$('#viewport').clientHeight,w=Math.round(base*aspect),h=base;
    const off=document.createElement('canvas');off.width=w;off.height=h;const oc=off.getContext('2d',{willReadFrequently:true});oc.imageSmoothingEnabled=true;oc.drawImage(sourceImg,...cropCover(sourceImg,aspect),0,0,w,h);
    let image=oc.getImageData(0,0,w,h);tune(image.data,+controls.contrast.value,+controls.saturation.value);currentPalette=medianCut(image.data,+controls.colors.value);image=quantize(image,currentPalette,dither,controls.edges.checked);oc.putImageData(image,0,0);
    canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0);
    updatePalette();renderAvatars();$('#exportSize').textContent=`${w} × ${h}`;$('#processing').classList.remove('show')
  })
}
function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(render,90)}
function updatePalette(){$('#paletteStrip').innerHTML=currentPalette.map(p=>`<i title="rgb(${p})" style="background:rgb(${p})"></i>`).join('')}
function processCrop(img,sx,sw,out,palette){const w=96,h=128,oc=document.createElement('canvas').getContext('2d',{willReadFrequently:true});oc.canvas.width=w;oc.canvas.height=h;oc.drawImage(img,sx,0,sw,img.height,0,0,w,h);let im=oc.getImageData(0,0,w,h);tune(im.data,+controls.contrast.value,+controls.saturation.value);quantize(im,palette,dither,controls.edges.checked);oc.putImageData(im,0,0);out.width=w;out.height=h;out.getContext('2d').drawImage(oc.canvas,0,0)}
function renderAvatars(){if(!avatarImg.complete||!currentPalette.length)return;$$('[data-avatar]').forEach((c,i)=>processCrop(avatarImg,avatarImg.width*i/4,avatarImg.width/4,c,currentPalette))}

const names=[['NOAH','DEEP WORK'],['AMINA','RESEARCH'],['JIN','REVIEW'],['LEILA','NOTES']];
$('#characterGrid').innerHTML=names.map((n,i)=>`<article class="character-card"><div class="char-view"><span class="char-index">0${i+1} / AUTO-CROP</span><canvas data-avatar="${i}"></canvas></div><div class="char-meta"><div><b>${n[0]}</b><small>${n[1]} · LVL ${12+i*3}</small></div><span>● FOCUSED</span></div></article>`).join('');

Object.values(controls).forEach(el=>el.addEventListener('input',()=>{if(el===controls.resolution)$('#resOut').value=`${el.value} PX`;if(el===controls.colors)$('#colorsOut').value=el.value;if(el===controls.contrast)$('#contrastOut').value=(el.value>0?'+':'')+el.value;if(el===controls.saturation)$('#satOut').value=(el.value>0?'+':el.value<0?'−':'')+Math.abs(el.value);schedule()}));
$$('[data-dither]').forEach(b=>b.onclick=()=>{dither=b.dataset.dither;$$('[data-dither]').forEach(x=>x.classList.toggle('active',x===b));schedule()});
const presets={tactical:[192,16,12,-18,'ordered',true],lofi:[256,24,5,-5,'floyd',false],gameboy:[128,4,22,-72,'ordered',true]};
$$('[data-preset]').forEach(b=>b.onclick=()=>{const v=presets[b.dataset.preset];[controls.resolution.value,controls.colors.value,controls.contrast.value,controls.saturation.value,dither,controls.edges.checked]=v;$$('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-dither]').forEach(x=>x.classList.toggle('active',x.dataset.dither===dither));controls.resolution.dispatchEvent(new Event('input'))});
$('#resetBtn').onclick=()=>document.querySelector('[data-preset="tactical"]').click();
$('#scanlineToggle').onchange=e=>$('#viewport').classList.toggle('scan',e.target.checked);

function setView(v){view=v;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('#sourceLayer').classList.toggle('full',v==='source');$('#sourceLayer').style.clipPath=v==='split'?'inset(0 50% 0 0)':'';$('#splitLine').style.display=v==='split'?'block':'none'}
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
let dragging=false;$('#splitLine').onpointerdown=e=>{dragging=true;e.target.setPointerCapture(e.pointerId)};window.onpointerup=()=>dragging=false;window.onpointermove=e=>{if(!dragging)return;const r=$('#viewport').getBoundingClientRect(),pct=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100));$('#splitLine').style.left=pct+'%';$('#sourceLayer').style.clipPath=`inset(0 ${100-pct}% 0 0)`};
$('#exportBtn').onclick=()=>{const a=document.createElement('a');a.download=`study-room-${canvas.width}x${canvas.height}.png`;a.href=canvas.toDataURL('image/png');a.click()};
Promise.all([sourceImg.decode(),avatarImg.decode()]).then(render).catch(()=>{
  sourceImg.onload=render;
  avatarImg.onload=render;
});
window.addEventListener('resize',schedule);
