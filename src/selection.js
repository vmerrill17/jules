// Handles selection of buildings and units
import * as THREE from 'three';

export class SelectionManager {
    constructor(scene, camera, grid, buildingManager, villagerManager, soldierManager) {
        this.scene = scene;
        this.camera = camera;
        this.grid = grid;
        this.buildingManager = buildingManager;
        this.villagerManager = villagerManager;
        this.soldierManager = soldierManager;

        this.selectedBuilding = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // UI
        this.panel = document.getElementById('selection-panel');
        this.info = document.getElementById('selection-info');
        this.actions = document.getElementById('selection-actions');

        window.addEventListener('mousedown', (event) => this.onMouseDown(event));
    }

    onMouseDown(event) {
        if (event.target.tagName !== 'CANVAS') return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Raycast against grid plane to find tile
        // We know the plane is at y=0 roughly.
        // Actually, let's use the building manager's meshes if possible, or just grid logic.
        // Grid logic is easiest: raycast to plane, get x,y.

        const intersects = this.raycaster.intersectObject(this.grid.plane);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const gridPos = this.grid.worldToGrid(point.x, point.z);

            const building = this.buildingManager.getBuildingAt(gridPos.x, gridPos.y);
            if (building) {
                this.selectBuilding(building);
            } else {
                this.deselect();
            }
        }
    }

    selectBuilding(building) {
        this.selectedBuilding = building;
        this.panel.style.display = 'block';

        this.updatePanel();
    }

    updatePanel() {
        if (!this.selectedBuilding) return;

        const b = this.selectedBuilding;
        const assigned = this.villagerManager.getAssignedCount(b);
        const idleCount = this.villagerManager.villagers.filter(v => v.state === 'idle' || v.state === 'wandering').length;

        let html = `<h3>${b.type.toUpperCase()}</h3>`;
        html += `<p>HP: ${b.hp} / ${b.maxHp}</p>`;

        // Worker Assignment
        if (['mill', 'goldmine', 'quarry', 'farm', 'hunter'].includes(b.type)) {
            html += `<p>Workers: ${assigned}</p>`;
            html += `<p class="small">Idle Villagers: ${idleCount}</p>`;
            html += `<button id="btn-assign">Assign Villager</button>`;
            html += `<button id="btn-unassign">Unassign Villager</button>`;
        }

        // Barracks Training
        if (b.type === 'barracks') {
            html += `<button id="btn-train-soldier">Train Soldier (50F, 20G)</button>`;
        }

        this.info.innerHTML = html;

        // Bind buttons
        const btnAssign = document.getElementById('btn-assign');
        if (btnAssign) btnAssign.onclick = () => this.assignVillager();

        const btnUnassign = document.getElementById('btn-unassign');
        if (btnUnassign) btnUnassign.onclick = () => this.unassignVillager();

        const btnTrain = document.getElementById('btn-train-soldier');
        if (btnTrain) btnTrain.onclick = () => this.trainSoldier();
    }

    assignVillager() {
        if (this.selectedBuilding) {
            this.villagerManager.assignVillagerTo(this.selectedBuilding);
            this.updatePanel();
        }
    }

    unassignVillager() {
        if (this.selectedBuilding) {
            this.villagerManager.unassignVillagerFrom(this.selectedBuilding);
            this.updatePanel();
        }
    }

    trainSoldier() {
        if (this.soldierManager) {
            this.soldierManager.trainSoldier(this.selectedBuilding);
        }
    }

    deselect() {
        this.selectedBuilding = null;
        this.panel.style.display = 'none';
    }
}
