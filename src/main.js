// Setup Three.js scene, camera, renderer
import * as THREE from 'three';
import { GameLoop } from './gameLoop.js';
import { Grid } from './grid.js';
import { BuildingManager } from './buildings.js';
import { EnemyManager } from './enemies.js';
import { VillagerManager } from './villagers.js';
import { SoldierManager } from './soldiers.js';
import { CameraControls } from './controls.js';
import { ResourceManager } from './resources.js';
import { ParticleSystem } from './particles.js';
import { SelectionManager } from './selection.js';
import { InteractionManager } from './interaction.js';
import { TechManager } from './tech.js';

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Lower ambient for better contrast
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(20, 30, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
scene.add(dirLight);

// Grid
const grid = new Grid(scene, 50, 50); // 50x50 grid

// Resources
const resourceManager = new ResourceManager();
resourceManager.wood = 100; // Starting wood
resourceManager.gold = 100; // Starting gold
resourceManager.updateUI();

// Tech
const techManager = new TechManager(resourceManager);

// Particles
const particleSystem = new ParticleSystem(scene);

// Managers
const buildingManager = new BuildingManager(scene, grid, resourceManager, particleSystem);
const enemyManager = new EnemyManager(scene, grid, buildingManager, particleSystem);
const villagerManager = new VillagerManager(scene, grid, resourceManager, buildingManager);
const soldierManager = new SoldierManager(scene, grid, enemyManager);
const gameLoop = new GameLoop(scene, grid, resourceManager, enemyManager);

// Selection
const selectionManager = new SelectionManager(scene, camera, grid, buildingManager, villagerManager, soldierManager, techManager);

// Interaction
const interactionManager = new InteractionManager(scene, camera, grid, buildingManager, selectionManager);
interactionManager.setTool('wall'); // Default tool

// Controls
const controls = new CameraControls(camera, renderer.domElement);

// UI bindings
const buttons = {
    'house': document.getElementById('btn-house'),
    'mill': document.getElementById('btn-mill'),
    'wall': document.getElementById('btn-wall'),
    'tower': document.getElementById('btn-tower'),
    'goldmine': document.getElementById('btn-goldmine'),
    'quarry': document.getElementById('btn-quarry'),
    'farm': document.getElementById('btn-farm'),
    'hunter': document.getElementById('btn-hunter'),
    'barracks': document.getElementById('btn-barracks'),
    'trap': document.getElementById('btn-trap')
};

for (const [key, btn] of Object.entries(buttons)) {
    btn.addEventListener('click', () => {
        if (techManager.isUnlocked(key)) {
            interactionManager.setTool(key);
        }
    });
}

// UI Update Loop for buttons
setInterval(() => {
    for (const [key, btn] of Object.entries(buttons)) {
        if (techManager.isUnlocked(key)) {
            btn.style.opacity = 1.0;
            btn.disabled = false;
        } else {
            btn.style.opacity = 0.3;
            btn.disabled = true;
        }
    }
}, 500);

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
    soldierManager.update(delta);
    selectionManager.update(delta); // Update UI
    particleSystem.update(delta);

    controls.update(delta);
    interactionManager.update(delta);

    renderer.render(scene, camera);
}

animate();

export { scene, camera, renderer };
