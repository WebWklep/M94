import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DFFLoader, TXDLoader } from './dff-loader.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#aeb9c6');
const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 10000);
camera.position.set(18, 12, 20);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x626b76, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(-30, 55, 25);
scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:0x858c88,roughness:1,side:THREE.DoubleSide}));
floor.rotation.x=-Math.PI/2; floor.position.y=-0.03; scene.add(floor);
const grid = new THREE.GridHelper(300,60,0x59636b,0x7e898e); grid.position.y=-0.02; scene.add(grid);
const orbit = new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true; orbit.target.set(0,1,0); orbit.maxPolarAngle=Math.PI*0.495;

const dffLoader = new DFFLoader();
const txdLoader = new TXDLoader();
let dffBuffer=null, txdMap=null, model=null, wireframe=false, unlit=false;
let textureNames=[];
const logLines=[];
function log(message){logLines.push(message); if(logLines.length>35)logLines.shift(); $('log').textContent=logLines.join('\n');}
function status(message,state=''){ $('status').textContent=message; $('status-dot').className=state; }
function fit(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
}
new ResizeObserver(fit).observe(stage); window.addEventListener('resize',fit); fit();

function clearModel(){
  if(!model)return;
  scene.remove(model);
  model.traverse(o=>{if(o.isMesh){o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m?.dispose());}});
  model=null;
}
function updateStats(root){
  let meshCount=0, materialCount=0;
  const geometries=new Set();
  root.traverse(o=>{if(o.isMesh){meshCount++;geometries.add(o.geometry);materialCount+=Array.isArray(o.material)?o.material.length:1;}});
  $('geometries').textContent=String(geometries.size);
  $('meshes').textContent=String(meshCount);
  $('materials').textContent=String(materialCount);
  $('textures').textContent=String(txdMap?.size ?? 0);
}
function fitModel(root){
  const box=new THREE.Box3().setFromObject(root);
  if(box.isEmpty())throw new Error('Парсер создал пустую сцену: в DFF не найдена отображаемая геометрия');
  const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  const factor=9/Math.max(size.x,size.y,size.z,0.001);
  root.scale.multiplyScalar(factor);
  root.position.set(-center.x*factor,-box.min.y*factor+0.04,-center.z*factor);
  orbit.target.set(0,1,0);
  camera.position.set(13,9,16);
  orbit.update();
}
function rebuild(){
  if(!dffBuffer)return;
  try{
    clearModel();
    if(txdMap)dffLoader.setTextureDictionary(txdMap);
    const parsed = dffLoader.parse(dffBuffer);
    if(!parsed)throw new Error('DFF не содержит CLUMP');
    model=parsed;
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;o.receiveShadow=true;
      const list=Array.isArray(o.material)?o.material:[o.material];
      list.forEach(mat=>{
        if(mat.map){mat.map.colorSpace=THREE.SRGBColorSpace;mat.map.needsUpdate=true;}
        mat.side=THREE.DoubleSide;
        mat.needsUpdate=true;
      });
    });
    scene.add(model);fitModel(model);
    updateStats(model);
    $('message').classList.add('hidden');
    status(txdMap?'DFF + TXD ЗАГРУЖЕНЫ':'DFF ЗАГРУЖЕН · TXD НЕ ВЫБРАН','good');
    log('Модель собрана. Meshes: '+$('meshes').textContent+', materials: '+$('materials').textContent+'.');
    if(!txdMap)log('Текстуры не назначены: откройте TXD и модель пересоберётся автоматически.');
  }catch(error){
    console.error(error);clearModel();status('ОШИБКА ПАРСЕРА','bad');
    const errorText=(error?.name?error.name+': ':'')+(error?.message||String(error));
    $('message').textContent='Не удалось собрать модель: '+errorText;
    $('message').classList.remove('hidden');
    log('ОШИБКА: '+errorText);
    if(error?.stack)log(String(error.stack).split('\n').slice(1,5).join(' | '));
  }
}
$('load-dff').addEventListener('click',()=>$('dff-file').click());
$('load-txd').addEventListener('click',()=>$('txd-file').click());
$('dff-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    status('ЧТЕНИЕ DFF…');dffBuffer=await file.arrayBuffer();
    $('dff-name').textContent=file.name;
    log('DFF: '+file.name+' ('+(file.size/1048576).toFixed(2)+' MB)');
    rebuild();
  }catch(error){status('ОШИБКА DFF','bad');log('DFF ERROR: '+error.message);}
  e.target.value='';
});
$('txd-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    status('ЧТЕНИЕ TXD…');const buffer=await file.arrayBuffer();
    $('txd-name').textContent=file.name;
    txdMap=txdLoader.parse(buffer);
    textureNames=[...txdMap.keys()];
    $('textures').textContent=String(txdMap.size);
    $('texture-list').innerHTML='';
    textureNames.forEach(name=>{
      const item=document.createElement('div');item.className='texture-item';
      const entry=txdMap.get(name);item.textContent=name;
      const meta=document.createElement('em');meta.textContent=entry?.texture?.image?.width+' × '+entry?.texture?.image?.height;
      item.appendChild(meta);$('texture-list').appendChild(item);
    });
    log('TXD: '+file.name+' ('+(file.size/1048576).toFixed(2)+' MB), текстур: '+txdMap.size);
    if(dffBuffer)rebuild();else status('TXD ЗАГРУЖЕН · ОЖИДАЕТ DFF','good');
  }catch(error){console.error(error);status('ОШИБКА TXD','bad');log('TXD ERROR: '+(error?.stack||error));}
  e.target.value='';
});
$('focus').addEventListener('click',()=>{if(model)fitModel(model);else{orbit.target.set(0,0,0);camera.position.set(18,12,20);orbit.update();}});
$('wire').addEventListener('click',()=>{
  wireframe=!wireframe;$('wire').textContent='WIREFRAME: '+(wireframe?'ON':'OFF');
  model?.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.wireframe=wireframe);});
});
$('unlit').addEventListener('click',()=>{
  unlit=!unlit;$('unlit').textContent='UNLIT: '+(unlit?'ON':'OFF');
  model?.traverse(o=>{
    if(!o.isMesh)return;
    if(!o.userData.standardMaterials)o.userData.standardMaterials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.clone());
    const next=unlit
      ? o.userData.standardMaterials.map(m=>{const n=new THREE.MeshBasicMaterial().copy(m);n.wireframe=wireframe;return n;})
      : o.userData.standardMaterials.map(m=>{const n=m.clone();n.wireframe=wireframe;return n;});
    o.material=Array.isArray(o.material)?next:next[0];
  });
});
function animate(){requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);}animate();
status('ОЖИДАНИЕ ФАЙЛОВ');
