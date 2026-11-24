import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DFFLoader } from './dff-loader.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#aeb9c6');
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
camera.position.set(32, 27, 38);
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(stage.clientWidth, stage.clientHeight);
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x626b76, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-35, 65, 25);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshStandardMaterial({ color:0x858c88, roughness:1, side:THREE.DoubleSide })
);
ground.rotation.x = -Math.PI/2;
ground.position.y = -0.08;
scene.add(ground);
const grid = new THREE.GridHelper(300, 60, 0x59636b, 0x7e898e);
grid.position.y = -0.065;
scene.add(grid);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0, 1, 0);
orbit.maxPolarAngle = Math.PI * 0.49;

const gizmo = new TransformControls(camera, renderer.domElement);
scene.add(gizmo);
gizmo.addEventListener('dragging-changed', e => orbit.enabled = !e.value);
let model = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dffLoader = new DFFLoader();
const gltfLoader = new GLTFLoader();

function setStatus(message){ $('status').textContent = message; }
function setModel(next, name){
  if(model){ scene.remove(model); }
  model = next;
  model.name = name;
  model.traverse(o => {
    if(o.isMesh){
      o.castShadow = true;
      o.receiveShadow = true;
      if(o.material){
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if(m.color && m.color.getHex() === 0) m.color.set(0xb8b8b8); });
      }
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  if(!box.isEmpty()){
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const factor = 8 / Math.max(size.x,size.y,size.z,0.001);
    model.scale.multiplyScalar(factor);
    model.position.set(-center.x*factor, -box.min.y*factor + 0.05, -center.z*factor);
  }
  scene.add(model);
  gizmo.attach(model);
  $('remove').disabled = false;
  $('message').classList.add('hidden');
  setStatus('МОДЕЛЬ ЗАГРУЖЕНА · ' + name.toUpperCase());
  focusModel();
}
function focusModel(){
  const target = model ? new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()) : new THREE.Vector3(0,0,0);
  orbit.target.copy(target);
  camera.position.copy(target).add(new THREE.Vector3(22,17,25));
  orbit.update();
}
$('import-model').addEventListener('click', () => $('model-file').click());
$('model-file').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  setStatus('ИМПОРТ ' + file.name.toUpperCase() + '…');
  try{
    let object;
    if(/\.dff$/i.test(file.name)){
      object = dffLoader.parse(await file.arrayBuffer());
      if(!object) throw new Error('В файле не найдена DFF-модель');
    }else{
      const url = URL.createObjectURL(file);
      try{ object = (await gltfLoader.loadAsync(url)).scene; }
      finally{ URL.revokeObjectURL(url); }
    }
    setModel(object, file.name);
  }catch(err){
    console.error(err);
    setStatus('ОШИБКА ИМПОРТА');
    $('message').textContent = 'Не удалось открыть модель: ' + (err.message || file.name);
    $('message').classList.remove('hidden');
  }
  e.target.value = '';
});
$('focus').addEventListener('click', focusModel);
$('remove').addEventListener('click', () => {
  if(!model) return;
  gizmo.detach(); scene.remove(model); model = null;
  $('remove').disabled = true;
  $('message').textContent = 'Загрузи DFF-модель GTA кнопкой сверху';
  $('message').classList.remove('hidden');
  setStatus('ГОТОВ К РАБОТЕ');
});
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  gizmo.setMode(button.dataset.mode);
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b === button));
}));
['x','y','z'].forEach(axis => $(axis).addEventListener('change', () => {
  if(model) model.position[axis] = Number($(axis).value) || 0;
}));
function pick(e){
  if(gizmo.dragging || e.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1, -(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  if(!model) return;
  const hit = raycaster.intersectObject(model,true)[0];
  if(hit) gizmo.attach(model);
}
renderer.domElement.addEventListener('pointerdown',pick);
function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
}
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize',resize);
function animate(){ requestAnimationFrame(animate); orbit.update(); renderer.render(scene,camera); }
animate();
setStatus('ГОТОВ К РАБОТЕ');
