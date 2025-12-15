import * as THREE from 'three';
import { Car } from './car.js';
import { Track } from './track.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 200);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 300;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

// Game Objects
const track = new Track(scene);
const car = new Car(scene);

// Input Handling
const input = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') input.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') input.down = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') input.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') input.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') input.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') input.down = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') input.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') input.right = false;
});

// UI
const speedDiv = document.createElement('div');
speedDiv.style.position = 'absolute';
speedDiv.style.bottom = '20px';
speedDiv.style.left = '20px';
speedDiv.style.color = 'white';
speedDiv.style.fontFamily = 'monospace';
speedDiv.style.fontSize = '30px';
speedDiv.style.fontWeight = 'bold';
speedDiv.style.textShadow = '2px 2px 2px black';
document.body.appendChild(speedDiv);

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1); // Cap delta

    // Update Car
    car.update(input, delta);

    // Camera Follow
    // Target position: Behind and above car
    const relativeOffset = new THREE.Vector3(0, 5, -10);
    const cameraOffset = relativeOffset.applyMatrix4(car.mesh.matrixWorld);

    // Smooth camera lerp
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(car.mesh.position);

    // Update UI
    speedDiv.textContent = `SPEED: ${car.getSpeedKmh()} KM/H`;

    renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
