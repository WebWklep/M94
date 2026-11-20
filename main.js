import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const editor=$('editor'),gate=$('gate'),password=$('password');
const host=$('stage');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xf4f4f2);
const camera=new THREE.PerspectiveCamera(45,1,.1,2000);
camera.position.set(8,7,9);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
host.appendChild(renderer.domElement);

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;
orbit.dampingFactor=.07;
orbit.target.set(0,.7,0);
orbit.minDistance=2;
orbit.maxDistance=250;
orbit.maxPolarAngle=Math.PI*.495;

scene.add(new THREE.HemisphereLight(0xffffff,0x858585,2));
const keyLight=new THREE.DirectionalLight(0xffffff,2.2);
keyLight.position.set(7,12,8);
scene.add(keyLight);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:0xfafafa,roughness:1}));
ground.rotation.x=-Math.PI/2;
ground.position.y=-.025;
scene.add(ground);
const grid=new THREE.GridHelper(100,100,0xc5c5c2,0xe2e2df);
grid.position.y=-.012;
scene.add(grid);
const group=new THREE.Group();
group.name='M94 Objects';
scene.add(group);

const gizmo=new TransformControls(camera,renderer.domElement);
gizmo.setMode('translate');
scene.add(gizmo);
gizmo.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
let selected=null;
const gltfLoader=new GLTFLoader();
const objectLoader=new THREE.ObjectLoader();

function resize(){
 const w=host.clientWidth,h=host.clientHeight;
 if(!w||!h)return;
 camera.aspect=w/h;
 camera.updateProjectionMatrix();
 renderer.setSize(w,h);
}
window.addEventListener('resize',resize);
new ResizeObserver(resize).observe(host);
window.addEventListener('m94:unlock',()=>requestAnimationFrame(resize));

function disposeObject(root){
 root.traverse(o=>{
  if(o.geometry)o.geometry.dispose();
  if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());
 });
}
function refreshList(){
 const root=$('objects');
 root.replaceChildren();
 $('object-count').textContent=group.children.length+' OBJECT'+(group.children.length===1?'':'S');
 if(!group.children.length){
  const p=document.createElement('p');p.className='empty';p.textContent='Здесь появятся объекты';root.append(p);
  return;
 }
 group.children.forEach((obj,i)=>{
  const b=document.createElement('button');
  b.className='object-item'+(obj===selected?' active':'');
  b.textContent=obj.userData.label||'Объект '+(i+1);
  b.title='Выбрать '+b.textContent;
  b.onclick=()=>select(obj);
  root.append(b);
 });
}
function syncInspector(){
 const disabled=!selected;
 ['pos-x','pos-y','pos-z','delete'].forEach(id=>$(id).disabled=disabled);
 if(!selected){
  ['pos-x','pos-y','pos-z'].forEach(id=>$(id).value='');
  return;
 }
 $('pos-x').value=selected.position.x.toFixed(2);
 $('pos-y').value=selected.position.y.toFixed(2);
 $('pos-z').value=selected.position.z.toFixed(2);
}
function select(obj){
 selected=obj;
 gizmo.detach();
 if(obj)gizmo.attach(obj);
 syncInspector();
 refreshList();
}
function add(obj,label){
 obj.name=label;
 obj.userData.label=label;
 group.add(obj);
 select(obj);
}
function primitive(type){
 let geometry,label;
 if(type==='box'){geometry=new THREE.BoxGeometry(1.5,1.5,1.5);label='Куб'}
 if(type==='sphere'){geometry=new THREE.SphereGeometry(.8,40,28);label='Сфера'}
 if(type==='cylinder'){geometry=new THREE.CylinderGeometry(.7,.7,1.5,40);label='Цилиндр'}
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xb9b9b6,roughness:.72,metalness:0}));
 mesh.position.y=geometry.parameters?.height?geometry.parameters.height/2:.8;
 if(type==='sphere')mesh.position.y=.8;
 add(mesh,label);
}
$('add-box').onclick=()=>primitive('box');
$('add-sphere').onclick=()=>primitive('sphere');
$('add-cylinder').onclick=()=>primitive('cylinder');
$('import-button').onclick=()=>$('file-input').click();

$('file-input').addEventListener('change',async e=>{
 for(const file of e.target.files){
  const url=URL.createObjectURL(file);
  try{
   const result=await gltfLoader.loadAsync(url);
   const object=result.scene;
   const bounds=new THREE.Box3().setFromObject(object);
   const size=bounds.getSize(new THREE.Vector3());
   const center=bounds.getCenter(new THREE.Vector3());
   const max=Math.max(size.x,size.y,size.z)||1;
   object.position.sub(center);
   object.scale.multiplyScalar(4/max);
   object.position.y+=(size.y*4/max)/2;
   add(object,file.name.replace(/\.(glb|gltf)$/i,''));
  }catch(err){
   console.error(err);
   alert('Не удалось импортировать '+file.name+'. Лучше всего работает формат GLB.');
  }finally{URL.revokeObjectURL(url)}
 }
 e.target.value='';
});

document.querySelectorAll('[data-mode]').forEach(button=>{
 button.addEventListener('click',()=>{
  gizmo.setMode(button.dataset.mode);
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));
 });
});
for(const [axis,id] of [['x','pos-x'],['y','pos-y'],['z','pos-z']]){
 $(id).addEventListener('change',e=>{
  if(!selected)return;
  selected.position[axis]=Number(e.target.value)||0;
  selected.updateMatrixWorld(true);
 });
}
function removeSelected(){
 if(!selected)return;
 const old=selected;
 select(null);
 group.remove(old);
 disposeObject(old);
 refreshList();
}
$('delete').onclick=removeSelected;
$('grid-toggle').onchange=e=>grid.visible=e.target.checked;
$('ground-toggle').onchange=e=>ground.visible=e.target.checked;

function frameScene(){
 const bounds=new THREE.Box3().setFromObject(group);
 if(bounds.isEmpty()){
  orbit.target.set(0,.7,0);
  camera.position.set(8,7,9);
  orbit.update();
  return;
 }
 const center=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 const radius=Math.max(size.x,size.y,size.z,2);
 orbit.target.copy(center);
 const distance=radius*1.8/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 camera.position.copy(center).add(new THREE.Vector3(1, .75, 1).normalize().multiplyScalar(distance));
 camera.near=Math.max(.01,distance/1000);
 camera.far=Math.max(2000,distance*20);
 camera.updateProjectionMatrix();
 orbit.update();
}
$('frame-scene').onclick=frameScene;

function saveScene(){
 const data={
  format:'M94_SCENE',
  version:1,
  group:group.toJSON(),
  camera:{position:camera.position.toArray(),target:orbit.target.toArray()}
 };
 const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download='M94-scene.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('save-scene').onclick=saveScene;
$('load-scene').onclick=()=>$('scene-input').click();
$('scene-input').addEventListener('change',async e=>{
 const file=e.target.files[0];
 if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(data.format!=='M94_SCENE'||!data.group)throw new Error('Это не файл сцены M94');
  const loaded=await objectLoader.parseAsync(data.group);
  select(null);
  [...group.children].forEach(child=>{group.remove(child);disposeObject(child)});
  [...loaded.children].forEach(child=>group.add(child));
  if(data.camera?.position&&data.camera?.target){
   camera.position.fromArray(data.camera.position);
   orbit.target.fromArray(data.camera.target);
   orbit.update();
  }else frameScene();
  refreshList();
 }catch(err){
  console.error(err);
  alert('Не удалось открыть сцену. Проверь, что это JSON-файл M94.');
 }finally{e.target.value=''}
});

const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.button!==0||gizmo.dragging)return;
 const rect=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(group.children,true);
 if(!hits.length){select(null);return}
 let obj=hits[0].object;
 while(obj.parent&&obj.parent!==group)obj=obj.parent;
 select(obj);
});
window.addEventListener('keydown',e=>{
 if(editor.classList.contains('hidden'))return;
 if(e.key==='Escape')select(null);
 if((e.key==='Delete'||e.key==='Backspace')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
  e.preventDefault();removeSelected();
 }
});
$('logout').onclick=()=>{
 editor.classList.add('hidden');
 gate.classList.remove('hidden');
 password.value='';
 $('login-error').textContent='';
};
function animate(){
 requestAnimationFrame(animate);
 orbit.update();
 renderer.render(scene,camera);
}
refreshList();
animate();
