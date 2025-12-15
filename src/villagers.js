// Logic for villagers
import * as THREE from 'three';

export class VillagerManager {
    constructor(scene, grid, resourceManager, buildingManager) {
        this.scene = scene;
        this.grid = grid;
        this.resourceManager = resourceManager;
        this.buildingManager = buildingManager;
        this.villagers = [];
        this.maxVillagers = 500;

        // Geometry
        this.geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5);
        this.material = new THREE.MeshStandardMaterial({ color: 0x00FFFF }); // Cyan

        // Instanced Mesh
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxVillagers);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        this.dummy = new THREE.Object3D();
        this.dummy.position.set(0, -100, 0);
        this.dummy.updateMatrix();

        for (let i = 0; i < this.maxVillagers; i++) {
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;

        this.freeIndices = [];
        for (let i = 0; i < this.maxVillagers; i++) {
            this.freeIndices.push(i);
        }

        this.populationCount = 0;
    }

    getAssignedCount(building) {
        return this.villagers.filter(v => v.assignedBuilding === building).length;
    }

    assignVillagerTo(building) {
        // Find idle villager
        const villager = this.villagers.find(v => v.state === 'idle' || v.state === 'wandering');
        if (villager) {
            villager.assignedBuilding = building;
            villager.state = 'idle'; // Reset state to trigger logic
        }
    }

    unassignVillagerFrom(building) {
        const villager = this.villagers.find(v => v.assignedBuilding === building);
        if (villager) {
            villager.assignedBuilding = null;
            villager.state = 'idle';
        }
    }

    update(delta) {
        if (this.populationCount < this.resourceManager.maxPopulation) {
             if (Math.random() < 0.05) {
                 this.spawnVillager();
             }
        }

        for (const villager of this.villagers) {
            this.updateVillager(villager, delta);

            this.dummy.position.copy(villager.worldPos);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(villager.instanceId, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;

        this.resourceManager.population = this.populationCount;
        this.resourceManager.updateUI();
    }

    spawnVillager() {
        if (this.freeIndices.length === 0) return;

        const instanceId = this.freeIndices.pop();
        const startPos = new THREE.Vector3(0, 0.25, 0);

        this.villagers.push({
            instanceId: instanceId,
            worldPos: startPos,
            state: 'idle',
            target: null,
            timer: 0,
            assignedBuilding: null
        });

        this.populationCount++;
    }

    updateVillager(villager, delta) {
        const speed = 1.5;

        if (villager.state === 'idle') {
            if (villager.assignedBuilding) {
                // Go to assigned building
                const b = villager.assignedBuilding;
                villager.target = this.grid.gridToWorld(b.x, b.y);
                villager.state = 'moving_to_work';
            } else {
                // Wander
                villager.timer += delta;
                if (villager.timer > 2.0) {
                    villager.target = new THREE.Vector3((Math.random() - 0.5) * 10, 0.25, (Math.random() - 0.5) * 10);
                    villager.state = 'wandering';
                    villager.timer = 0;
                }
            }
        } else if (villager.state === 'moving_to_work') {
            if (!villager.assignedBuilding) { villager.state = 'idle'; return; }

            this.moveTo(villager, villager.target, speed, delta, () => {
                villager.state = 'working';
                villager.timer = 0;
            });
        } else if (villager.state === 'working') {
            if (!villager.assignedBuilding) { villager.state = 'idle'; return; }

            villager.timer += delta;
            if (villager.timer > 5.0) {
                // Generate Resource based on building type
                const type = villager.assignedBuilding.type;
                if (type === 'mill') this.resourceManager.addResource('wood', 10);
                if (type === 'goldmine') this.resourceManager.addResource('gold', 10);
                if (type === 'quarry') this.resourceManager.addResource('stone', 10);
                if (type === 'farm') this.resourceManager.addResource('food', 10);
                if (type === 'hunter') this.resourceManager.addResource('food', 10);

                // Return to Town Center
                villager.target = new THREE.Vector3(0, 0.25, 0);
                villager.state = 'returning';
            }
        } else if (villager.state === 'returning') {
            this.moveTo(villager, villager.target, speed, delta, () => {
                villager.state = 'idle'; // Restart loop
            });
        } else if (villager.state === 'wandering') {
            if (villager.assignedBuilding) { villager.state = 'idle'; return; } // Interrupt wander

            this.moveTo(villager, villager.target, speed * 0.5, delta, () => {
                villager.state = 'idle';
            });
        }
    }

    moveTo(villager, target, speed, delta, onComplete) {
        const dir = new THREE.Vector3().subVectors(target, villager.worldPos);
        dir.y = 0;
        const dist = dir.length();

        if (dist < 0.1) {
            onComplete();
        } else {
            dir.normalize();
            villager.worldPos.addScaledVector(dir, speed * delta);
        }
    }
}
