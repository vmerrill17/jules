import * as THREE from 'three';
import { Car } from './car.js';
import { AICar } from './aiCar.js';
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
const aiCars = [];

// State
let gameState = 'MENU'; // MENU, PLAYING

// UI Logic
const menuDiv = document.getElementById('menu');
const hudDiv = document.getElementById('hud');

function startGame(trackType) {
    track.loadTrack(trackType);
    car.reset(track.startPoint);
    car.velocity.set(0,0,0);
    car.heading = 0;

    // Spawn AI
    // Clear old AI
    aiCars.forEach(ai => scene.remove(ai.mesh));
    aiCars.length = 0;

    const colors = [0x0000FF, 0x00FF00, 0xFFFF00, 0xFF00FF];
    for(let i=0; i<3; i++) {
        const ai = new AICar(scene, colors[i]);
        // Offset start positions
        const offsetZ = (i+1) * -8;
        const offsetX = ((i % 2) === 0 ? 5 : -5);

        ai.reset(new THREE.Vector3(track.startPoint.x + offsetX, 0.1, track.startPoint.z + offsetZ));
        aiCars.push(ai);
    }

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
        car.update(input, delta, track);

        // Update AI
        aiCars.forEach(ai => ai.update(delta, track));

        // Collisions (Simple Sphere)
        const allCars = [car, ...aiCars];
        for (let i = 0; i < allCars.length; i++) {
            for (let j = i + 1; j < allCars.length; j++) {
                const c1 = allCars[i];
                const c2 = allCars[j];
                const dist = c1.position.distanceTo(c2.position);
                const minDist = 2.5; // Car radii sum approx

                if (dist < minDist) {
                    // Push apart
                    const dir = new THREE.Vector3().subVectors(c1.position, c2.position).normalize();
                    const push = dir.multiplyScalar((minDist - dist) * 0.5);
                    c1.position.add(push);
                    c2.position.sub(push);

                    // Transfer energy? For now just position resolve + minor friction
                    c1.velocity.multiplyScalar(0.9);
                    c2.velocity.multiplyScalar(0.9);
                }
            }
        }

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
