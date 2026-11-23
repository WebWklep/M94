import * as THREE from 'three';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9aa9c4);
scene.fog = new THREE.Fog(0x9aa9c4, 90, 330);

const camera = new THREE.PerspectiveCamera(58, 1, .1, 800);
camera.position.set(0, 7, 16);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('stage').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdce7ff,0x4d4657,2.1));
const sun = new THREE.DirectionalLight(0xffdfc1,2.8);
sun.position.set(-35,65,35); scene.add(sun);
const fill = new THREE.PointLight(0xffb77b,90,150); fill.position.set(0,18,-90); scene.add(fill);

const mat = (color,roughness=.75,metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
const roadMat=mat(0x343946,.94), lineMat=mat(0xe6d7bb), grassMat=mat(0x697d78), darkMat=mat(0x202632), goldMat=mat(0xf4bd83,.35,.25);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900,900),mat(0x82928d));
ground.rotation.x=-Math.PI/2; ground.position.y=-.55; scene.add(ground);

const road = new THREE.Mesh(new THREE.BoxGeometry(13,.35,330),roadMat);
road.position.set(0,-.32,-75); scene.add(road);
for(let x of [-6.15,6.15]){
 const edge=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,330),lineMat);
 edge.position.set(x,-.13,-75); scene.add(edge);
}
for(let z=80;z>-235;z-=10){
 const dash=new THREE.Mesh(new THREE.BoxGeometry(.13,.025,4),mat(0xd5d0c5));
 dash.position.set(0,-.125,z); scene.add(dash);
}
for(const x of [-1,1]){
 const rail=new THREE.Mesh(new THREE.BoxGeometry(.12,.55,330),mat(0x777d88,.4,.45));
 rail.position.set(x*7,-.02,-75); scene.add(rail);
}

// Soft surreal landscape: low hills, distant monoliths and warm roadside lights.
for(let i=0;i<44;i++){
 const side=i%2?1:-1, z=70-Math.random()*290, x=side*(18+Math.random()*48);
 const h=5+Math.random()*24, w=5+Math.random()*13;
 const hill=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),mat(i%3?0x78858b:0x9b8d91));
 hill.scale.set(w,h,w*1.3); hill.position.set(x,h-.5,z); scene.add(hill);
}
for(let z=65;z>-205;z-=18){
 for(const side of [-1,1]){
  const pole=new THREE.Group(); pole.position.set(side*9,0,z);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.08,3.6,8),mat(0x333b49,.45,.6));stem.position.y=1.8;pole.add(stem);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),new THREE.MeshBasicMaterial({color:0xffd6a2}));bulb.position.y=3.65;pole.add(bulb);
  const glow=new THREE.PointLight(0xffc78d,9,15);glow.position.y=3.5;pole.add(glow);scene.add(pole);
 }
}

// Floating decorative shapes in the far distance.
for(let i=0;i<18;i++){
 const geo=i%2?new THREE.TorusGeometry(2+Math.random()*3,.09,8,32):new THREE.IcosahedronGeometry(2+Math.random()*2,0);
 const obj=new THREE.Mesh(geo, i%2?goldMat:mat(0xc5d0d8,.35,.25));
 obj.position.set((Math.random()-.5)*100,10+Math.random()*35,-20-Math.random()*210);
 obj.rotation.set(Math.random(),Math.random(),Math.random());scene.add(obj);
}

// E34-inspired squared 1990s executive sedan, built into the postcard.
function buildCar(){
 const car=new THREE.Group(); const wheels=[];
 const bodyPaint=mat(0x26394c,.28,.72), trim=mat(0x111820,.4,.45), glass= new THREE.MeshPhysicalMaterial({color:0x172b3b,metalness:.3,roughness:.12,transparent:true,opacity:.88});
 const chrome=mat(0xb9c5ce,.22,.85), tire=mat(0x111315,.92), lamp=new THREE.MeshBasicMaterial({color:0xfff0cf});
 function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);car.add(o);return o;}
 box(2.05,.58,4.45,bodyPaint,0,.88,0);
 box(1.92,.18,4.25,trim,0,.58,0);
 // Long squared cabin and bonnet.
 box(1.78,.78,2.25,bodyPaint,0,1.48,-.28);
 box(1.7,.62,1.98,glass,0,1.52,-.29);
 box(1.96,.18,1.18,bodyPaint,0,1.05,-1.56);
 box(1.96,.16,.68,bodyPaint,0,1.04,1.88);
 // Window pillars, side belt line and chrome bumpers.
 for(const x of [-.91,.91]) for(const z of [-1.05,.55]){
  box(.08,.78,.09,trim,x,1.48,z);
 }
 for(const z of [-2.22,2.22]) box(2.08,.18,.16,chrome,0,.72,z);
 for(const x of [-.72,.72]){
  box(.42,.19,.035,lamp,x,1.02,-2.245);
  box(.42,.19,.035,mat(0xb52d32),x,1.02,2.245);
  const head=new THREE.SpotLight(0xffedcf,22,32,.42,.5,1.2);head.position.set(x,.95,-2.1);head.target.position.set(x,0,-14);car.add(head,head.target);
 }
 // Classic twin-kidney grille and four round lamps.
 box(.56,.42,.06,trim,0,.91,-2.27);
 for(const x of [-.68,-.34,.34,.68]){
  const lampMesh=new THREE.Mesh(new THREE.CircleGeometry(.145,24),lamp);lampMesh.position.set(x,.98,-2.255);car.add(lampMesh);
 }
 for(const x of [-1,1]) for(const z of [-1.48,1.48]){
  const wheel=new THREE.Group();wheel.position.set(x,.48,z);
  const rubber=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.25,28),tire);rubber.rotation.z=Math.PI/2;wheel.add(rubber);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.265,20),chrome);rim.rotation.z=Math.PI/2;wheel.add(rim);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.28,16),trim);hub.rotation.z=Math.PI/2;wheel.add(hub);
  car.add(wheel);wheels.push(wheel);
 }
 // Subtle side mirrors.
 for(const x of [-1.02,1.02]) box(.22,.14,.28,trim,x,1.35,-1.22);
 car.userData.wheels=wheels;
 return car;
}
const car=buildCar();car.position.set(0,0,25);scene.add(car);

// A clear, wide launch ramp.
const ramp = new THREE.Mesh(new THREE.BoxGeometry(10,.65,13),mat(0x555d6b,.45,.25));
ramp.position.set(0,.12,-76);ramp.rotation.x=.22;scene.add(ramp);
const rampStripe=new THREE.Mesh(new THREE.BoxGeometry(10,.08,.55),goldMat);rampStripe.position.set(0,.48,-81.7);rampStripe.rotation.x=.22;scene.add(rampStripe);
for(const x of [-4.7,4.7]){
 const arrow=new THREE.Mesh(new THREE.ConeGeometry(.35,.9,4),goldMat);arrow.rotation.x=Math.PI/2;arrow.position.set(x,.85,-77);scene.add(arrow);
}

// Birthday destination sign.
const sign=new THREE.Group();sign.position.set(0,0,-145);scene.add(sign);
const postMat=mat(0x252d3b,.5,.45);
for(const x of [-7,7]){
 const post=new THREE.Mesh(new THREE.BoxGeometry(.35,8,.45),postMat);post.position.set(x,4,0);sign.add(post);
}
const board=new THREE.Mesh(new THREE.BoxGeometry(15,5.2,.65),mat(0x22283a,.28,.4));board.position.y=7.2;sign.add(board);
const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=500;
const ctx=canvas.getContext('2d');
const grad=ctx.createLinearGradient(0,0,1400,500);grad.addColorStop(0,'#f7c68f');grad.addColorStop(1,'#fff0d7');
ctx.fillStyle=grad;ctx.fillRect(0,0,1400,500);
ctx.strokeStyle='#fff7e8';ctx.lineWidth=12;ctx.strokeRect(20,20,1360,460);
ctx.textAlign='center';ctx.textBaseline='middle';
ctx.fillStyle='#22283a';ctx.font='900 116px Arial';ctx.fillText('HAPPY',700,170);
ctx.font='900 150px Arial';ctx.fillText('BIRTHDAY!',700,340);
const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
const signFace=new THREE.Mesh(new THREE.PlaneGeometry(14.65,4.85),new THREE.MeshBasicMaterial({map:tex}));
signFace.position.set(0,7.2,.34);sign.add(signFace);
for(let i=0;i<14;i++){
 const a=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),new THREE.MeshBasicMaterial({color:i%2?0xffe2b6:0xffc47e}));
 const x=-6.5+(i%7)*2.16,y=i<7?4.85:9.55;a.position.set(x,y,.48);sign.add(a);
}

// Decorative finish arch and warm confetti particles.
const arch=new THREE.Mesh(new THREE.TorusGeometry(10,.12,10,64,Math.PI),goldMat);arch.position.set(0,7,-143);scene.add(arch);
const confetti=[];
for(let i=0;i<160;i++){
 const p=new THREE.Mesh(new THREE.BoxGeometry(.12,.28,.06),mat([0xf5c38d,0xd7e1ee,0xd18f89,0xe9dfbd][i%4],.55));
 p.position.set((Math.random()-.5)*24,Math.random()*18,-137-Math.random()*24);p.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);scene.add(p);confetti.push(p);
}

let started=false, finished=false, speed=0, steering=0, jumping=false, jumpTime=0, jumpHeight=0;
const keys=new Set();
const maxSpeed=24;
function resize(){const w=$('stage').clientWidth,h=$('stage').clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('stage'));
function begin(){
 started=true;finished=false;speed=0;steering=0;jumping=false;jumpTime=0;
 car.position.set(0,0,25);car.rotation.set(0,0,0);
 $('intro').classList.add('hidden');$('finish').classList.add('hidden');$('bottom-hint').classList.remove('hidden');
 $('status').textContent='THE ROAD IS YOURS';
}
$('start').onclick=begin;
$('again').onclick=()=>{begin();};
function setKey(key,on){if(on)keys.add(key);else keys.delete(key);}
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){e.preventDefault();setKey(k,true);}
});
window.addEventListener('keyup',e=>setKey(e.key.toLowerCase(),false));
window.addEventListener('blur',()=>keys.clear());
for(const [id,key] of [['left','a'],['right','d'],['gas','w']]){
 const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);setKey(key,true);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>setKey(key,false));
}

function update(dt,t){
 if(started&&!finished){
  const forward=keys.has('w')||keys.has('arrowup');
  const reverse=keys.has('s')||keys.has('arrowdown');
  const left=keys.has('a')||keys.has('arrowleft');
  const right=keys.has('d')||keys.has('arrowright');
  if(forward)speed=Math.min(maxSpeed,speed+12*dt);
  else if(reverse)speed=Math.max(-5,speed-10*dt);
  else speed=Math.max(0,speed-2.5*dt);
  const steerTarget=(right?1:0)-(left?1:0);
  steering+=(steerTarget-steering)*Math.min(1,dt*4);
  car.rotation.y=THREE.MathUtils.clamp(steering*.38,-.42,.42);
  car.position.x=THREE.MathUtils.clamp(car.position.x+steering*speed*.055*dt,-3.8,3.8);
  car.position.z-=speed*dt;
  car.userData.wheels.forEach(w=>w.rotation.x-=speed*dt*1.8);
  if(car.position.z<-69&&!jumping){jumping=true;jumpTime=0;$('jump-flash').classList.remove('hidden');setTimeout(()=>$('jump-flash').classList.add('hidden'),1000);$('status').textContent='TAKE THE LEAP';}
  if(jumping){
   jumpTime+=dt;
   const duration=2.35, progress=Math.min(1,jumpTime/duration);
   jumpHeight=Math.sin(progress*Math.PI)*9;
   car.position.y=jumpHeight;
   if(progress>=1){jumping=false;car.position.y=0;$('status').textContent='ALMOST THERE';}
  }
  if(car.position.z<-136&&!jumping){
   finished=true;speed=0;$('finish').classList.remove('hidden');$('bottom-hint').classList.add('hidden');$('status').textContent='DELIVERY COMPLETE';
  }
 }
 // Follow camera, with a slight side drift for a cinematic view.
 const target=new THREE.Vector3(car.position.x*.45,3.6+car.position.y*.35,car.position.z+10.5);
 camera.position.lerp(target,1-Math.pow(.001,dt));
 const look=new THREE.Vector3(car.position.x*.25,1.2+car.position.y*.45,car.position.z-13);
 camera.lookAt(look);
 confetti.forEach((p,i)=>{p.rotation.x+=dt*(.4+i%3*.15);p.rotation.z+=dt*.35;if(finished)p.position.y+=Math.sin(t*2+i)*dt*.4;});
}
let last=performance.now();
function animate(now){
 requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;
 update(dt,now/1000);renderer.render(scene,camera);
}
resize();requestAnimationFrame(animate);
