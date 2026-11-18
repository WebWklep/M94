import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const host = document.querySelector('#stage');
const loading = document.querySelector('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101522);
scene.fog = new THREE.FogExp2(0x101522, 0.027);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
camera.position.set(8, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
host.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.set(0, 1, 0);
controls.maxDistance = 45;
controls.minDistance = 1.5;

scene.add(new THREE.HemisphereLight(0xbac9e8, 0x25202a, 2.0));
const key = new THREE.DirectionalLight(0xffe4c2, 3.2);
key.position.set(-5, 10, 7);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8ca9ff, 2.2);
rim.position.set(7, 5, -8);
scene.add(rim);

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x171d29, roughness: 0.92, metalness: 0.04 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.035;
scene.add(ground);

const grid = new THREE.GridHelper(100, 50, 0x526078, 0x293347);
grid.position.y = -0.02;
scene.add(grid);

// A simple road gives scale and a direction to the empty dream space.
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(5.5, 100),
  new THREE.MeshStandardMaterial({ color: 0x252a34, roughness: 0.96 })
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.002, -28);
scene.add(road);

const centerLineMaterial = new THREE.MeshBasicMaterial({ color: 0xb7b39c, transparent: true, opacity: 0.48 });
for (let z = 12; z > -75; z -= 7) {
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 3.2), centerLineMaterial);
  dash.rotation.x = -Math.PI / 2;
  dash.position.set(0, 0.012, z);
  scene.add(dash);
}

// Sparse silhouettes: intentionally strange and quiet, not a finished level.
const silhouetteMaterial = new THREE.MeshStandardMaterial({ color: 0x343c4b, roughness: 1 });
for (let i = 0; i < 18; i++) {
  const h = 1.5 + Math.random() * 5;
  const w = 1.2 + Math.random() * 2.8;
  const shape = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.2 + Math.random() * 2), silhouetteMaterial);
  const side = i % 2 ? 1 : -1;
  shape.position.set(side * (6 + Math.random() * 12), h / 2 - 0.02, -i * 5 - 4);
  shape.rotation.y = (Math.random() - 0.5) * 0.5;
  scene.add(shape);
}

let loadedModel = null;
let groundVisible = true;
let gridVisible = true;

function resize() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();
loading.style.display = 'none';

document.querySelector('#reset-view').addEventListener('click', () => {
  camera.position.set(8, 6, 10);
  controls.target.set(0, 1, 0);
  controls.update();
});
document.querySelector('#toggle-grid').addEventListener('click', (event) => {
  gridVisible = !gridVisible;
  grid.visible = gridVisible;
  event.currentTarget.classList.toggle('active', gridVisible);
  event.currentTarget.querySelector('b').textContent = gridVisible ? 'ON' : 'OFF';
});
document.querySelector('#toggle-ground').addEventListener('click', (event) => {
  groundVisible = !groundVisible;
  ground.visible = groundVisible;
  road.visible = groundVisible;
  event.currentTarget.classList.toggle('active', groundVisible);
  event.currentTarget.querySelector('b').textContent = groundVisible ? 'ON' : 'OFF';
});

const fileInput = document.querySelector('#scan-file');
const loader = new GLTFLoader();

function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 5 / maxDim;
  object.scale.multiplyScalar(scale);
  object.position.y += (size.y * scale) / 2;
  controls.target.set(0, Math.max(0.5, size.y * scale * 0.42), 0);
  camera.position.set(7, 5, 8);
  controls.update();
}

function loadScan(file) {
  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    alert('For this first test, please choose a .GLB file. It keeps the model and textures together.');
    return;
  }
  const url = URL.createObjectURL(file);
  loading.textContent = 'LOADING SCAN...';
  loading.style.display = 'block';
  loader.load(url, (gltf) => {
    if (loadedModel) {
      scene.remove(loadedModel);
      loadedModel.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material?.dispose());
        }
      });
    }
    loadedModel = gltf.scene;
    scene.add(loadedModel);
    frameObject(loadedModel);
    document.querySelector('#model-name').textContent = file.name;
    document.querySelector('#model-detail').textContent = 'Scan loaded · orbit to inspect · scroll to zoom';
    loading.style.display = 'none';
    URL.revokeObjectURL(url);
  }, undefined, (error) => {
    console.error(error);
    loading.textContent = 'COULD NOT LOAD THIS FILE';
    setTimeout(() => { loading.style.display = 'none'; }, 2200);
    URL.revokeObjectURL(url);
  });
}
fileInput.addEventListener('change', (event) => loadScan(event.target.files[0]));

host.addEventListener('dragover', (event) => {
  event.preventDefault();
  host.classList.add('dragging');
});
host.addEventListener('dragleave', () => host.classList.remove('dragging'));
host.addEventListener('drop', (event) => {
  event.preventDefault();
  host.classList.remove('dragging');
  loadScan(event.dataTransfer.files[0]);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
