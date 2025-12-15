import * as THREE from 'three';
import { Car } from './car.js';
import { Track } from './track.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 300);

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

// State
let gameState = 'MENU'; // MENU, PLAYING

// UI Logic
const menuDiv = document.getElementById('menu');
const hudDiv = document.getElementById('hud');

function startGame(trackType) {
    track.loadTrack(trackType);
    car.reset(track.startPoint); // You might need to offset slightly so it's not Inside the track mesh
    car.position.set(0, 0.5, 0); // Hard reset to generic start, ideally track exposes start pos
    car.velocity.set(0,0,0);
    car.heading = 0;

    gameState = 'PLAYING';
    menuDiv.style.display = 'none';
    hudDiv.style.display = 'block';
}

document.getElementById('btn-oval').addEventListener('click', () => startGame('oval'));
document.getElementById('btn-figure8').addEventListener('click', () => startGame('figure8'));
document.getElementById('btn-complex').addEventListener('click', () => startGame('complex'));


// Input Handling
const input = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') input.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') input.down = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') input.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') input.right = true;

    // Esc to Menu
    if (e.key === 'Escape' && gameState === 'PLAYING') {
        gameState = 'MENU';
        menuDiv.style.display = 'flex';
        hudDiv.style.display = 'none';
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') input.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') input.down = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') input.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') input.right = false;
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING') {
        const delta = Math.min(clock.getDelta(), 0.1);

        // Update Car
        car.update(input, delta);

        // Camera Follow
        const relativeOffset = new THREE.Vector3(0, 6, -12); // Higher and further back

        // We want the camera to follow the car's Position, but align mostly with the Velocity (for drift feel)
        // Or just align with car Heading.
        // Aligning with Heading is standard.
        // To add "drift feel" to camera, we can interpolate camera rotation slower than car rotation.

        const cameraOffset = relativeOffset.applyMatrix4(car.mesh.matrixWorld);
        camera.position.lerp(cameraOffset, 0.1);
        camera.lookAt(car.mesh.position);

        // Update UI
        hudDiv.textContent = `SPEED: ${car.getSpeedKmh()} KM/H`;
    }

    renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
