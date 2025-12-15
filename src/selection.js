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

        this.updateTimer = 0;
        this.updatePanel();

        window.addEventListener('mousedown', (event) => this.onMouseDown(event));
    }

    update(delta) {
        this.updateTimer += delta;
        if (this.updateTimer > 0.5) {
            this.updatePanel();
            this.updateTimer = 0;
        }
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
        this.updatePanel();
    }

    updatePanel() {
        // Shared Stats
        const idleCount = this.villagerManager.villagers.filter(v => v.state === 'idle' || v.state === 'wandering').length;
        const totalPop = this.villagerManager.populationCount;
        const maxPop = this.villagerManager.resourceManager.maxPopulation;

        if (!this.selectedBuilding) {
            // Global Info
            let html = `<h3>KINGDOM OVERVIEW</h3>`;
            html += `<p>Population: ${totalPop} / ${maxPop}</p>`;
            html += `<p>Idle Villagers: ${idleCount}</p>`;
            html += `<p>Soldiers: ${this.soldierManager ? this.soldierManager.soldiers.length : 0}</p>`;

            // Workforce Stats
            const stats = {
                wood: { assigned: 0, capacity: 0 },
                gold: { assigned: 0, capacity: 0 },
                stone: { assigned: 0, capacity: 0 },
                food: { assigned: 0, capacity: 0 }
            };

            this.buildingManager.buildings.forEach(b => {
                if (b.type === 'mill') stats.wood.capacity += (b.maxWorkers || 0);
                if (b.type === 'goldmine') stats.gold.capacity += (b.maxWorkers || 0);
                if (b.type === 'quarry') stats.stone.capacity += (b.maxWorkers || 0);
                if (b.type === 'farm' || b.type === 'hunter') stats.food.capacity += (b.maxWorkers || 0);
            });

            this.villagerManager.villagers.forEach(v => {
                if (v.assignedBuilding) {
                    const type = v.assignedBuilding.type;
                    if (type === 'mill') stats.wood.assigned++;
                    if (type === 'goldmine') stats.gold.assigned++;
                    if (type === 'quarry') stats.stone.assigned++;
                    if (type === 'farm' || type === 'hunter') stats.food.assigned++;
                }
            });

            html += `<h4>Workforce</h4>`;

            const makeRow = (label, stat, type) => {
                const addDisabled = (stat.assigned >= stat.capacity || idleCount === 0) ? 'disabled' : '';
                const subDisabled = (stat.assigned === 0) ? 'disabled' : '';
                return `<div class="stat-row">
                    <span>${label}: ${stat.assigned} / ${stat.capacity}</span>
                    <div class="stat-controls">
                        <button class="btn-mini" id="btn-add-${type}" ${addDisabled}>+</button>
                        <button class="btn-mini" id="btn-sub-${type}" ${subDisabled}>-</button>
                    </div>
                </div>`;
            };

            html += makeRow('Wood', stats.wood, 'wood');
            html += makeRow('Gold', stats.gold, 'gold');
            html += makeRow('Stone', stats.stone, 'stone');
            html += makeRow('Food', stats.food, 'food');

            html += `<p class="hint">Select a building to manage it.</p>`;
            this.info.innerHTML = html;
            this.actions.innerHTML = '';

            // Bind global buttons
            const types = ['wood', 'gold', 'stone', 'food'];
            types.forEach(type => {
                const btnAdd = document.getElementById(`btn-add-${type}`);
                if (btnAdd) btnAdd.onclick = () => this.assignGlobal(type);

                const btnSub = document.getElementById(`btn-sub-${type}`);
                if (btnSub) btnSub.onclick = () => this.unassignGlobal(type);
            });
            return;
        }

        const b = this.selectedBuilding;
        const assigned = this.villagerManager.getAssignedCount(b);

        let html = `<h3>${b.type.toUpperCase()}</h3>`;
        html += `<p>HP: ${b.hp} / ${b.maxHp}</p>`;

        let actionsHtml = '';

        // Worker Assignment
        if (['mill', 'goldmine', 'quarry', 'farm', 'hunter'].includes(b.type)) {
            const max = b.maxWorkers || 5;
            html += `<p>Workers: ${assigned} / ${max}</p>`;
            html += `<p class="small">Idle Villagers: ${idleCount}</p>`;

            const assignDisabled = (assigned >= max || idleCount === 0) ? 'disabled' : '';
            const unassignDisabled = (assigned === 0) ? 'disabled' : '';

            actionsHtml += `<button id="btn-assign" ${assignDisabled}>Assign Villager</button>`;
            actionsHtml += `<button id="btn-unassign" ${unassignDisabled}>Unassign Villager</button>`;
        }

        // Barracks Training
        if (b.type === 'barracks') {
            actionsHtml += `<button id="btn-train-soldier">Train Soldier (50F, 20G)</button>`;
        }

        this.info.innerHTML = html;
        this.actions.innerHTML = actionsHtml;

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
            // Check limit again
            const b = this.selectedBuilding;
            const assigned = this.villagerManager.getAssignedCount(b);
            const max = b.maxWorkers || 5;
            if (assigned < max) {
                this.villagerManager.assignVillagerTo(b);
                this.updatePanel();
            }
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

    assignGlobal(resourceType) {
        let buildingTypes = [];
        if (resourceType === 'wood') buildingTypes = ['mill'];
        if (resourceType === 'gold') buildingTypes = ['goldmine'];
        if (resourceType === 'stone') buildingTypes = ['quarry'];
        if (resourceType === 'food') buildingTypes = ['farm', 'hunter'];

        // Find candidate building with space
        const candidates = this.buildingManager.buildings.filter(b =>
            buildingTypes.includes(b.type) &&
            this.villagerManager.getAssignedCount(b) < (b.maxWorkers || 5)
        );

        if (candidates.length > 0) {
            this.villagerManager.assignVillagerTo(candidates[0]);
            this.updatePanel();
        }
    }

    unassignGlobal(resourceType) {
        let buildingTypes = [];
        if (resourceType === 'wood') buildingTypes = ['mill'];
        if (resourceType === 'gold') buildingTypes = ['goldmine'];
        if (resourceType === 'stone') buildingTypes = ['quarry'];
        if (resourceType === 'food') buildingTypes = ['farm', 'hunter'];

        // Find building with workers
        const candidates = this.buildingManager.buildings.filter(b =>
            buildingTypes.includes(b.type) &&
            this.villagerManager.getAssignedCount(b) > 0
        );

        if (candidates.length > 0) {
            this.villagerManager.unassignVillagerFrom(candidates[0]);
            this.updatePanel();
        }
    }

    deselect() {
        this.selectedBuilding = null;
        this.updatePanel();
    }
}
