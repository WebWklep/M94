import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171b21);
scene.fog = new THREE.Fog(0x171b21, 32, 95);

const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 500);
camera.rotation.order = 'YXZ';
camera.position.set(0, 1.65, 10);

const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdce8f5, 0x59616a, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(-8, 18, 10);
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(240,240),
  new THREE.MeshStandardMaterial({color:0x555c61, roughness:1})
);
floor.rotation.x = -Math.PI/2;
floor.position.y = -0.025;
scene.add(floor);
const grid = new THREE.GridHelper(120,120,0x737d85,0x343b42);
grid.position.y = 0.002;
scene.add(grid);

let vehicle = null;
let vehicleGeometry = null;
let modelRadius = 5;
let yaw = 0, pitch = 0;
let locked = false;
const keys = new Set();
const clock = new THREE.Clock();
const loader = new PLYLoader();

function status(s){ $('status').textContent = s; }

function clearModel(){
  if(vehicle){
    scene.remove(vehicle);
    if(vehicle.material) vehicle.material.dispose();
    vehicle = null;
  }
  if(vehicleGeometry){ vehicleGeometry.dispose(); vehicleGeometry = null; }
}

function centerAndScale(geometry){
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if(!box || !Number.isFinite(box.min.x)) throw new Error('В PLY не найдены координаты вершин');
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const maxDim = Math.max(size.x,size.y,size.z);
  if(!Number.isFinite(maxDim) || maxDim < 0.00001) throw new Error('Пустая или некорректная геометрия');
  geometry.translate(-center.x, -box.min.y, -center.z);
  geometry.scale(8/maxDim,8/maxDim,8/maxDim);
  geometry.computeBoundingBox();
  return geometry.boundingBox;
}

function installGeometry(geometry, filename){
  clearModel();
  const box = centerAndScale(geometry);
  vehicleGeometry = geometry;
  const hasFaces = !!geometry.index || (geometry.getAttribute('normal') && geometry.getAttribute('normal').count > 0 && geometry.getAttribute('position').count < 150000);
  const hasColors = !!geometry.getAttribute('color');
  if(hasFaces){
    if(!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: hasColors ? 0xffffff : 0xb7bdc4,
      vertexColors:hasColors, roughness:0.88, metalness:0.02,
      side:THREE.DoubleSide
    });
    vehicle = new THREE.Mesh(geometry, material);
  }else{
    const material = new THREE.PointsMaterial({
      color:hasColors ? 0xffffff : 0xc4cbd2,
      vertexColors:hasColors,
      size:0.026,
      sizeAttenuation:true
    });
    vehicle = new THREE.Points(geometry, material);
  }
  vehicle.frustumCulled = true;
  vehicle.name = filename;
  scene.add(vehicle);
  const s = new THREE.Vector3();
  box.getSize(s);
  modelRadius = Math.max(s.x,s.z,2) * 0.5;
  camera.position.set(0,1.65,Math.max(8,modelRadius*2.4));
  yaw = 0; pitch = 0;
  camera.rotation.set(0,0,0);
  $('message').classList.add('hidden');
  $('walk').disabled = false;
  status('ЗАГРУЖЕНА · ' + filename);
}

async function loadFile(file){
  if(!file) return;
  status('ЧТЕНИЕ PLY…');
  $('message').classList.add('hidden');
  try{
    const buffer = await file.arrayBuffer();
    status('РАЗБОР ГЕОМЕТРИИ…');
    const geometry = loader.parse(buffer);
    installGeometry(geometry,file.name);
  }catch(err){
    console.error(err);
    status('ОШИБКА ЗАГРУЗКИ');
    $('message').innerHTML = '<h1>Не удалось открыть PLY</h1><p>'+(err.message || 'Проверь файл и попробуй ещё раз.')+'</p><button id="retry" class="primary">ВЫБРАТЬ ДРУГОЙ ФАЙЛ</button>';
    $('message').classList.remove('hidden');
    $('retry').addEventListener('click',()=>$('file').click());
  }
}

$('load').addEventListener('click',()=>$('file').click());
$('choose').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',e=>{loadFile(e.target.files?.[0]);e.target.value='';});

function beginWalk(){
  if(!vehicle) return;
  renderer.domElement.requestPointerLock?.();
}
$('walk').addEventListener('click',beginWalk);
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;});
document.addEventListener('mousemove',e=>{
  if(!locked) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0020;
  pitch = THREE.MathUtils.clamp(pitch,-1.35,1.35);
  camera.rotation.set(pitch,yaw,0);
});
document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);e.preventDefault();}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());

function move(dt){
  if(!locked) return;
  const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const direction = new THREE.Vector3();
  if(keys.has('KeyW')) direction.add(forward);
  if(keys.has('KeyS')) direction.sub(forward);
  if(keys.has('KeyD')) direction.add(right);
  if(keys.has('KeyA')) direction.sub(right);
  if(direction.lengthSq()>0){
    direction.normalize().multiplyScalar(4.2*dt);
    camera.position.add(direction);
  }
  camera.position.y = 1.65;
  const limit = Math.max(22,modelRadius*5);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x,-limit,limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z,-limit,limit);
}
function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
}
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize',resize);
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  move(dt);
  renderer.render(scene,camera);
}
animate();
status('ОЖИДАНИЕ МОДЕЛИ');