// Setup Three.js scene, camera, renderer
import * as THREE from 'three';
import { GameLoop } from './gameLoop.js';
import { Grid } from './grid.js';
import { BuildingManager } from './buildings.js';
import { EnemyManager } from './enemies.js';
import { VillagerManager } from './villagers.js';
import { CameraControls } from './controls.js';
import { ResourceManager } from './resources.js';
import { ParticleSystem } from './particles.js';

console.log('Game starting...');

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Day sky

// Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 40, 40); // Top-down angled view, zoomed out for bigger map
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Grid
const grid = new Grid(scene, 50, 50); // 50x50 grid

// Resources
const resourceManager = new ResourceManager();
resourceManager.wood = 100; // Starting wood
resourceManager.gold = 100; // Starting gold
resourceManager.updateUI();

// Particles
const particleSystem = new ParticleSystem(scene);

// Managers
const buildingManager = new BuildingManager(scene, grid, resourceManager, particleSystem);
const enemyManager = new EnemyManager(scene, grid, buildingManager, particleSystem);
const villagerManager = new VillagerManager(scene, grid, resourceManager, buildingManager);
const gameLoop = new GameLoop(scene, grid, resourceManager, enemyManager);

// Controls
const controls = new CameraControls(camera, renderer.domElement);

// Input handling
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const highlightMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
);
highlightMesh.rotation.x = -Math.PI / 2;
scene.add(highlightMesh);

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', (event) => {
    if (event.target.tagName !== 'CANVAS') return; // Ignore clicks on UI

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(grid.plane);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const gridPos = grid.worldToGrid(point.x, point.z);
        // Place selected building
        buildingManager.placeBuilding(gridPos.x, gridPos.y, selectedBuilding);
    }
});

let selectedBuilding = 'wall';
document.getElementById('btn-house').addEventListener('click', () => selectedBuilding = 'house');
document.getElementById('btn-mill').addEventListener('click', () => selectedBuilding = 'mill');
document.getElementById('btn-wall').addEventListener('click', () => selectedBuilding = 'wall');
document.getElementById('btn-tower').addEventListener('click', () => selectedBuilding = 'tower');
document.getElementById('btn-goldmine').addEventListener('click', () => selectedBuilding = 'goldmine');
document.getElementById('btn-trap').addEventListener('click', () => selectedBuilding = 'trap');

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    const delta = 0.016; // Approx 60fps
    gameLoop.update(delta);

    // Pass enemies to building manager for towers
    buildingManager.update(delta, enemyManager.enemies);

    enemyManager.update(delta);
    villagerManager.update(delta);
    particleSystem.update(delta);

    controls.update(delta);

    // Raycast for highlight
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(grid.plane);
    if (intersects.length > 0) {
        const point = intersects[0].point;
        const gridPos = grid.worldToGrid(point.x, point.z);
        const worldPos = grid.gridToWorld(gridPos.x, gridPos.y);
        highlightMesh.position.set(worldPos.x, 0.01, worldPos.z);
    }

    renderer.render(scene, camera);
}

animate();

export { scene, camera, renderer };
