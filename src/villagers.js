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

    update(delta) {
        // Check population count and spawn if needed
        const currentPop = Math.floor(this.resourceManager.population); // Should logic drive this or visual?
        // Let's say we visualize up to maxVillagers based on current Pop.
        // Actually, population grows. Let's just try to match `villagers.length` to `resourceManager.population`.
        // Note: resourceManager.population is currently 0 and grows with houses?
        // Wait, houses increase maxPopulation. Does population grow automatically?
        // In original plan: "House: +2 Population". This usually means Max Pop.
        // Where is current pop? `ResourceManager` has `population` and `maxPopulation`.
        // `BuildingManager` increases `maxPopulation`.
        // Who increases `population`?
        // Currently nothing increases `population` (actual people).
        // Let's assume population = maxPopulation for now, or we need a way to grow it.
        // Or simpler: We spawn 1 villager per House placed?
        // Let's make "Population" mean "Current Villagers".
        // Houses increase CAP. Town Center spawns them?
        // Let's just spawn villagers up to the cap slowly?
        // Or just make it so Houses spawn villagers immediately.
        // `BuildingManager` increases `maxPopulation`. Let's treat that as "Space".
        // Let's automatically spawn villagers if population < maxPopulation.

        if (this.populationCount < this.resourceManager.maxPopulation) {
             if (Math.random() < 0.05) { // Random spawn chance per frame
                 this.spawnVillager();
             }
        }

        // Update Villagers
        for (const villager of this.villagers) {
            this.updateVillager(villager, delta);

            // Update Mesh
            this.dummy.position.copy(villager.worldPos);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(villager.instanceId, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;

        // Update Resource Manager count for UI
        this.resourceManager.population = this.populationCount;
        this.resourceManager.updateUI();
    }

    spawnVillager() {
        if (this.freeIndices.length === 0) return;

        const instanceId = this.freeIndices.pop();
        const startPos = new THREE.Vector3(0, 0.25, 0); // Town Center roughly

        this.villagers.push({
            instanceId: instanceId,
            worldPos: startPos,
            state: 'idle',
            target: null,
            timer: 0
        });

        this.populationCount++;
    }

    updateVillager(villager, delta) {
        const speed = 1.5;

        if (villager.state === 'idle') {
            // Find a job
            // Look for Mills or GoldMines
            const producers = this.buildingManager.buildings.filter(b => b.type === 'mill' || b.type === 'goldmine');

            if (producers.length > 0) {
                const target = producers[Math.floor(Math.random() * producers.length)];
                villager.target = this.grid.gridToWorld(target.x, target.y);
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
            this.moveTo(villager, villager.target, speed, delta, () => {
                villager.state = 'working';
                villager.timer = 0;
            });
        } else if (villager.state === 'working') {
            villager.timer += delta;
            if (villager.timer > 5.0) {
                // Return to Town Center
                villager.target = new THREE.Vector3(0, 0.25, 0);
                villager.state = 'returning';
            }
        } else if (villager.state === 'returning') {
            this.moveTo(villager, villager.target, speed, delta, () => {
                villager.state = 'idle';
            });
        } else if (villager.state === 'wandering') {
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
