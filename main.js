import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const gate = $('gate'), app = $('app'), password = $('password');
const editorTools = $('editor-tools'), sidebar = $('sidebar');
let mode = 'locked', selected = null, playerCar = null, playing = false;
let speed = 0, steering = 0;
const keys = new Set();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfc4c3);
scene.fog = new THREE.Fog(0xbfc4c3, 35, 180);
const camera = new THREE.PerspectiveCamera(55, 1, .1, 1500);
camera.position.set(8, 7, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
$('stage').appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0, 1, 0);
orbit.maxPolarAngle = Math.PI * .49;
orbit.maxDistance = 350;

scene.add(new THREE.HemisphereLight(0xffffff, 0x707678, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.position.set(-12, 22, 9);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshStandardMaterial({ color: 0x9da3a0, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.04;
scene.add(ground);

const grid = new THREE.GridHelper(200, 100, 0x777e7c, 0xaeb3b0);
grid.position.y = -.02;
scene.add(grid);

const world = new THREE.Group();
world.name = 'M94 World';
scene.add(world);

const transform = new TransformControls(camera, renderer.domElement);
transform.setMode('translate');
scene.add(transform);
transform.addEventListener('dragging-changed', e => { orbit.enabled = !e.value; });
transform.addEventListener('objectChange', syncInspector);

const gltfLoader = new GLTFLoader();
const objectLoader = new THREE.ObjectLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function resize() {
  const host = $('stage');
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe($('stage'));

function makePlaceholderCar() {
  const car = new THREE.Group();
  car.name = 'Машина';
  car.userData.label = 'Машина';
  car.userData.isPlayerCar = true;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x343b40, metalness: .55, roughness: .32 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x26343b, metalness: .25, roughness: .2 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: .9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, .62, 4.35), bodyMat);
  body.position.y = .83; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, .72, 2.15), glassMat);
  cabin.position.set(0, 1.48, -.25); car.add(cabin);
  for (const x of [-1.03, 1.03]) for (const z of [-1.42, 1.42]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .25, 24), tireMat);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .48, z); car.add(wheel);
  }
  car.position.set(0, 0, 5);
  world.add(car);
  return car;
}

function refreshObjects() {
  const root = $('objects');
  root.replaceChildren();
  $('object-count').textContent = String(world.children.length);
  if (!world.children.length) {
    const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Сцена пока пустая'; root.append(p);
    return;
  }
  world.children.forEach((obj, i) => {
    const button = document.createElement('button');
    button.className = 'object-item' + (obj === selected ? ' active' : '');
    button.textContent = (obj.userData.label || obj.name || 'Объект ' + (i + 1)) + (obj.userData.isPlayerCar ? '  · МАШИНА' : '');
    button.onclick = () => selectObject(obj);
    root.append(button);
  });
}
function syncInspector() {
  const disabled = !selected;
  ['pos-x', 'pos-y', 'pos-z', 'delete', 'make-car'].forEach(id => $(id).disabled = disabled);
  if (!selected) {
    ['pos-x', 'pos-y', 'pos-z'].forEach(id => $(id).value = '');
    return;
  }
  $('pos-x').value = selected.position.x.toFixed(2);
  $('pos-y').value = selected.position.y.toFixed(2);
  $('pos-z').value = selected.position.z.toFixed(2);
}
function selectObject(obj) {
  selected = obj;
  transform.detach();
  if (obj) transform.attach(obj);
  syncInspector();
  refreshObjects();
}
function addObject(obj, label) {
  obj.name = label;
  obj.userData.label = label;
  world.add(obj);
  selectObject(obj);
}
function addPrimitive(type) {
  let geometry, label;
  if (type === 'box') { geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5); label = 'Куб'; }
  if (type === 'sphere') { geometry = new THREE.SphereGeometry(.8, 32, 24); label = 'Сфера'; }
  if (type === 'cylinder') { geometry = new THREE.CylinderGeometry(.7, .7, 1.5, 32); label = 'Цилиндр'; }
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb8b8b4, roughness: .72 }));
  mesh.position.y = type === 'sphere' ? .8 : geometry.parameters.height ? geometry.parameters.height / 2 : .75;
  addObject(mesh, label);
}
$('add-box').onclick = () => addPrimitive('box');
$('add-sphere').onclick = () => addPrimitive('sphere');
$('add-cylinder').onclick = () => addPrimitive('cylinder');

$('import-button').onclick = () => $('model-input').click();
$('model-input').addEventListener('change', async e => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    try {
      const gltf = await gltfLoader.loadAsync(url);
      const object = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const max = Math.max(size.x, size.y, size.z) || 1;
      object.position.sub(center);
      object.scale.multiplyScalar(4 / max);
      object.position.y += (size.y * 4 / max) / 2;
      addObject(object, file.name.replace(/\.(glb|gltf)$/i, ''));
    } catch (err) {
      console.error(err);
      alert('Не удалось открыть модель. Попробуй файл GLB.');
    } finally { URL.revokeObjectURL(url); }
  }
  e.target.value = '';
});

document.querySelectorAll('[data-mode]').forEach(button => {
  button.onclick = () => {
    transform.setMode(button.dataset.mode);
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b === button));
  };
});
for (const [axis, id] of [['x', 'pos-x'], ['y', 'pos-y'], ['z', 'pos-z']]) {
  $(id).addEventListener('change', e => {
    if (!selected) return;
    selected.position[axis] = Number(e.target.value) || 0;
    selected.updateMatrixWorld(true);
  });
}
$('make-car').onclick = () => {
  if (!selected) return;
  world.children.forEach(obj => { obj.userData.isPlayerCar = false; });
  selected.userData.isPlayerCar = true;
  playerCar = selected;
  refreshObjects();
};
$('delete').onclick = () => {
  if (!selected) return;
  const old = selected;
  selectObject(null);
  world.remove(old);
  old.traverse(obj => {
    obj.geometry?.dispose();
    if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
  });
  if (playerCar === old) playerCar = null;
  refreshObjects();
};
$('grid-toggle').onchange = e => grid.visible = e.target.checked;
$('ground-toggle').onchange = e => ground.visible = e.target.checked;

function frameScene() {
  const bounds = new THREE.Box3().setFromObject(world);
  if (bounds.isEmpty()) {
    orbit.target.set(0, 1, 0); camera.position.set(8, 7, 10); orbit.update(); return;
  }
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 3);
  orbit.target.copy(center);
  const distance = radius * 1.65 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.copy(center).add(new THREE.Vector3(1, .8, 1).normalize().multiplyScalar(distance));
  camera.near = Math.max(.05, distance / 1000);
  camera.far = Math.max(1500, distance * 20);
  camera.updateProjectionMatrix();
  orbit.update();
}
$('frame-scene').onclick = frameScene;

function downloadScene() {
  const data = {
    format: 'M94_SCENE',
    version: 1,
    world: world.toJSON()
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'scene.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
$('save-scene').onclick = downloadScene;
$('load-scene').onclick = () => $('scene-input').click();
$('scene-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.format !== 'M94_SCENE' || !data.world) throw new Error('Wrong scene format');
    const loaded = await objectLoader.parseAsync(data.world);
    selectObject(null);
    [...world.children].forEach(child => world.remove(child));
    [...loaded.children].forEach(child => world.add(child));
    playerCar = world.children.find(obj => obj.userData.isPlayerCar) || null;
    refreshObjects();
    frameScene();
  } catch (err) {
    console.error(err);
    alert('Не удалось открыть сцену M94. Проверь JSON-файл.');
  } finally { e.target.value = ''; }
});

renderer.domElement.addEventListener('pointerdown', e => {
  if (mode !== 'editor' || e.button !== 0 || transform.dragging) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(world.children, true);
  if (!hits.length) { selectObject(null); return; }
  let obj = hits[0].object;
  while (obj.parent && obj.parent !== world) obj = obj.parent;
  selectObject(obj);
});

async function loadPublishedScene() {
  try {
    const response = await fetch('./scene.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.format !== 'M94_SCENE' || !data.world) return;
    const loaded = await objectLoader.parseAsync(data.world);
    [...world.children].forEach(child => world.remove(child));
    [...loaded.children].forEach(child => world.add(child));
    playerCar = world.children.find(obj => obj.userData.isPlayerCar) || null;
    refreshObjects();
  } catch (err) { console.warn('Using an empty starter scene:', err); }
}

async function enter(nextMode) {
  await sceneReady;
  mode = nextMode;
  gate.classList.add('hidden');
  app.classList.remove('hidden');
  const editor = mode === 'editor';
  editorTools.classList.toggle('hidden', !editor);
  sidebar.classList.toggle('hidden', !editor);
  $('play-button').classList.toggle('hidden', !editor);
  $('edit-button').classList.toggle('hidden', editor);
  $('editor-hint').classList.toggle('hidden', !editor);
  $('game-hint').classList.toggle('hidden', editor);
  $('game-title').classList.toggle('hidden', editor);
  $('mode-label').textContent = editor ? 'SCENE EDITOR' : 'DREAM DRIVE';
  $('view-label').textContent = editor ? 'SCENE VIEW' : 'DREAM WORLD';
  grid.visible = editor && $('grid-toggle').checked;
  ground.visible = true;
  if (!playerCar) playerCar = world.children.find(obj => obj.userData.isPlayerCar) || makePlaceholderCar();
  if (editor) {
    playing = false;
    orbit.enabled = true;
    frameScene();
  } else {
    startGame();
  }
  requestAnimationFrame(resize);
}
function startGame() {
  playing = true;
  orbit.enabled = false;
  speed = 0; steering = 0;
  if (!playerCar) playerCar = makePlaceholderCar();
  camera.position.copy(playerCar.position).add(new THREE.Vector3(0, 5.5, 10));
}
$('play-button').onclick = () => enter('game');
$('edit-button').onclick = () => enter('editor');
$('logout').onclick = () => {
  mode = 'locked'; playing = false; keys.clear();
  app.classList.add('hidden'); gate.classList.remove('hidden');
  password.value = ''; $('login-error').textContent = '';
};
function unlock() {
  const code = password.value.trim();
  if (code === '94') enter('game');
  else if (code === '21101991') enter('editor');
  else $('login-error').textContent = 'Неверный код';
}
$('login').addEventListener('submit', e => { e.preventDefault(); unlock(); });
password.addEventListener('input', () => {
  if (password.value.trim() === '94' || password.value.trim() === '21101991') unlock();
  else $('login-error').textContent = '';
});

window.addEventListener('keydown', e => {
  if (mode !== 'game') return;
  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
    keys.add(key); e.preventDefault();
  }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function updateGame(dt) {
  if (!playing || !playerCar) return;
  const forward = keys.has('w') || keys.has('arrowup');
  const backward = keys.has('s') || keys.has('arrowdown');
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright');
  const brake = keys.has(' ');
  if (forward) speed = Math.min(speed + 8 * dt, 22);
  else if (backward) speed = Math.max(speed - 10 * dt, -7);
  else speed *= Math.pow(.35, dt);
  if (brake) speed *= Math.pow(.025, dt);
  const targetSteer = (left ? 1 : 0) - (right ? 1 : 0);
  steering += (targetSteer - steering) * Math.min(1, dt * 5);
  playerCar.rotation.y += steering * speed * .035 * dt;
  const direction = new THREE.Vector3(Math.sin(playerCar.rotation.y), 0, Math.cos(playerCar.rotation.y));
  playerCar.position.addScaledVector(direction, -speed * dt);
  const desired = playerCar.position.clone().add(new THREE.Vector3(0, 5.2, 10).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerCar.rotation.y));
  camera.position.lerp(desired, Math.min(1, dt * 4));
  camera.lookAt(playerCar.position.x, playerCar.position.y + 1, playerCar.position.z);
}

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, .04); last = now;
  if (mode === 'editor') orbit.update();
  if (mode === 'game') updateGame(dt);
  renderer.render(scene, camera);
}
refreshObjects();
const sceneReady = loadPublishedScene();
requestAnimationFrame(animate);
