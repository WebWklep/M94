import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const gate=document.querySelector('#gate'),editor=document.querySelector('#editor'),password=document.querySelector('#password');
document.querySelector('#login').addEventListener('submit',e=>{e.preventDefault();if(password.value==='21101991'){gate.classList.add('hidden');editor.classList.remove('hidden');resize()}else{document.querySelector('#login-error').textContent='Неверный пароль';password.select()}});
document.querySelector('#logout').onclick=()=>{editor.classList.add('hidden');gate.classList.remove('hidden');password.value='';document.querySelector('#login-error').textContent=''};

const host=document.querySelector('#stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf7f7f7);
const camera=new THREE.PerspectiveCamera(45,1,.1,1000);camera.position.set(7,6,8);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.target.set(0,0.8,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const light=new THREE.DirectionalLight(0xffffff,2.1);light.position.set(5,10,7);scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
const grid=new THREE.GridHelper(100,100,0xaaaaaa,0xdddddd);grid.position.y=-.015;scene.add(grid);
const group=new THREE.Group();scene.add(group);
const gizmo=new TransformControls(camera,renderer.domElement);scene.add(gizmo.getHelper());gizmo.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
let selected=null;const loader=new GLTFLoader();
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(host);
function refreshList(){const root=document.querySelector('#objects');root.innerHTML='';if(!group.children.length){root.innerHTML='<p class="empty">Сцена пока пустая</p>';return}group.children.forEach((obj,i)=>{const b=document.createElement('button');b.className='object-item'+(obj===selected?' active':'');b.textContent=obj.userData.label||'Объект '+(i+1);b.onclick=()=>select(obj);root.append(b)})}
function syncPosition(){if(!selected)return;for(const [axis,id] of [['x','pos-x'],['y','pos-y'],['z','pos-z']])document.querySelector('#'+id).value=selected.position[axis].toFixed(2)}
function select(obj){selected=obj;gizmo.detach();if(obj)gizmo.attach(obj);syncPosition();refreshList()}
function add(obj,label){obj.userData.label=label;group.add(obj);select(obj)}
function primitive(type){let geometry;if(type==='box')geometry=new THREE.BoxGeometry(1.5,1.5,1.5);if(type==='sphere')geometry=new THREE.SphereGeometry(.8,32,24);if(type==='cylinder')geometry=new THREE.CylinderGeometry(.7,.7,1.5,32);const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xb8b8b8,roughness:.65}));mesh.position.y=.8;add(mesh,type==='box'?'Куб':type==='sphere'?'Сфера':'Цилиндр')}
document.querySelector('#add-box').onclick=()=>primitive('box');document.querySelector('#add-sphere').onclick=()=>primitive('sphere');document.querySelector('#add-cylinder').onclick=()=>primitive('cylinder');
document.querySelector('#import-button').onclick=()=>document.querySelector('#file-input').click();
document.querySelector('#file-input').addEventListener('change',async e=>{for(const file of e.target.files){const url=URL.createObjectURL(file);try{let object;if(file.name.toLowerCase().endsWith('.glb')||file.name.toLowerCase().endsWith('.gltf'))object=(await loader.loadAsync(url)).scene;else throw new Error('Поддерживаются GLB и GLTF');const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z)||1;object.position.sub(center);object.scale.multiplyScalar(4/max);object.position.y+=(size.y*4/max)/2;add(object,file.name); }catch(err){console.error(err);alert('Не удалось загрузить '+file.name+'. Попробуй GLB или GLTF.')}finally{URL.revokeObjectURL(url)}}e.target.value=''});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{gizmo.setMode(b.dataset.mode);document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b))});
for(const [axis,id] of [['x','pos-x'],['y','pos-y'],['z','pos-z']])document.querySelector('#'+id).addEventListener('change',e=>{if(selected){selected.position[axis]=Number(e.target.value)||0;gizmo.updateMatrixWorld();}});
document.querySelector('#delete').onclick=()=>{if(!selected)return;group.remove(selected);selected.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});selected=null;gizmo.detach();refreshList();syncPosition()};
document.querySelector('#grid-toggle').onchange=e=>grid.visible=e.target.checked;document.querySelector('#ground-toggle').onchange=e=>ground.visible=e.target.checked;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerdown',e=>{if(gizmo.dragging)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(group.children,true);if(hits.length){let obj=hits[0].object;while(obj.parent&&obj.parent!==group)obj=obj.parent;select(obj)}});
function animate(){requestAnimationFrame(animate);orbit.update();if(selected&&!gizmo.dragging)syncPosition();renderer.render(scene,camera)}animate();