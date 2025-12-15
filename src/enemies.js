// Logic for spawning and moving enemies
import * as THREE from 'three';
import { Pathfinding } from './pathfinding.js';

export class EnemyManager {
    constructor(scene, grid, buildingManager) {
        this.scene = scene;
        this.grid = grid;
        this.buildingManager = buildingManager;
        this.enemies = [];
        this.pathfinding = new Pathfinding(grid);

        // Initial Target: Center of grid
        this.target = { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
        this.pathfinding.setTarget(this.target.x, this.target.y);

        this.spawnTimer = 0;
        this.spawnInterval = 1.0; // Seconds between spawns
        this.isNight = false;

        // Enemy Types Configuration
        this.types = {
            standard: { color: 0xFF0000, size: 0.4, speed: 2.0, hp: 20 },
            fast: { color: 0xFFFF00, size: 0.3, speed: 4.0, hp: 10 },
            tank: { color: 0x000000, size: 0.6, speed: 1.0, hp: 50 }
        };

        this.meshes = {};
        this.freeIndices = {};
        this.maxEnemiesPerType = 500;

        // Initialize Meshes for each type
        this.dummy = new THREE.Object3D();
        this.dummy.position.set(0, -100, 0);
        this.dummy.updateMatrix();

        for (const [key, config] of Object.entries(this.types)) {
            const geometry = new THREE.SphereGeometry(config.size, 8, 8);
            const material = new THREE.MeshStandardMaterial({ color: config.color });
            const mesh = new THREE.InstancedMesh(geometry, material, this.maxEnemiesPerType);
            mesh.frustumCulled = false;
            this.scene.add(mesh);
            this.meshes[key] = mesh;

            // Init hidden
            for (let i = 0; i < this.maxEnemiesPerType; i++) {
                mesh.setMatrixAt(i, this.dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;

            // Free indices
            this.freeIndices[key] = [];
            for (let i = 0; i < this.maxEnemiesPerType; i++) {
                this.freeIndices[key].push(i);
            }
        }
    }

    setNight(isNight) {
        this.isNight = isNight;
        // Recalculate flow field when night starts in case walls changed
        if (isNight) {
             this.pathfinding.calculateFlowField();
        }
    }

    spawnEnemy() {
        // Pick random type
        const keys = Object.keys(this.types);
        const typeKey = keys[Math.floor(Math.random() * keys.length)];
        const config = this.types[typeKey];

        // Pick random edge
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 : this.grid.width - 1;
            y = Math.floor(Math.random() * this.grid.height);
        } else {
            x = Math.floor(Math.random() * this.grid.width);
            y = Math.random() < 0.5 ? 0 : this.grid.height - 1;
        }

        if (this.grid.getTile(x, y) !== 0) return; // Only spawn on grass

        const pos = this.grid.gridToWorld(x, y);

        if (this.freeIndices[typeKey].length === 0) return; // Full

        const instanceId = this.freeIndices[typeKey].pop();

        const dummy = new THREE.Object3D();
        dummy.position.set(pos.x, 0.4, pos.z);
        dummy.updateMatrix();

        this.meshes[typeKey].setMatrixAt(instanceId, dummy.matrix);
        this.meshes[typeKey].instanceMatrix.needsUpdate = true;

        this.enemies.push({
            type: typeKey,
            instanceId: instanceId,
            x: x,
            y: y,
            worldPos: new THREE.Vector3(pos.x, 0.4, pos.z),
            speed: config.speed,
            hp: config.hp
        });
    }

    update(delta) {
        if (this.isNight) {
            this.spawnTimer += delta;
            if (this.spawnTimer > this.spawnInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        }

        // Move enemies
        let needsUpdate = false;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (enemy.hp <= 0) {
                // Kill enemy
                this.dummy.position.set(0, -100, 0);
                this.dummy.updateMatrix();
                this.meshes[enemy.type].setMatrixAt(enemy.instanceId, this.dummy.matrix);
                this.meshes[enemy.type].instanceMatrix.needsUpdate = true;

                this.freeIndices[enemy.type].push(enemy.instanceId);
                this.enemies.splice(i, 1);
                continue;
            }

            // Get current grid pos
            const gridPos = this.grid.worldToGrid(enemy.worldPos.x, enemy.worldPos.z);

            // Get flow direction
            const flow = this.pathfinding.getFlow(gridPos.x, gridPos.y);

            // Check current tile for building to attack
            // But wait, flow field directs them. If they are blocked by a wall, flow field might point INTO the wall
            // if we treated walls as walkable in distance map but high cost?
            // Or if we treated them as obstacles, flow field would be null if completely blocked.
            // But if path is valid, they just move.

            // Collision detection with buildings
            // For simplicity: Check if next tile is a building.
            // Or check if current tile is a building (which shouldn't happen if they are on top of it).

            // Better: If they are close to a building, they stop and attack.
            // Let's check the tile they are standing on OR the one they are trying to move to.

            if (flow) {
                const targetX = gridPos.x + flow.x;
                const targetY = gridPos.y + flow.y;

                // Check if target tile has a building
                const tileType = this.grid.getTile(targetX, targetY);
                if (tileType === 1) { // 1 = Building/Wall
                    // Attack!
                    const building = this.buildingManager.getBuildingAt(targetX, targetY);
                    if (building) {
                        this.attackBuilding(enemy, building, delta);
                    } else {
                        // Weird state: tile says building but manager says no. Just move.
                         this.moveEnemy(enemy, flow, delta);
                    }
                } else {
                    this.moveEnemy(enemy, flow, delta);
                }
            }

            // Re-sync logical x,y
            const newGridPos = this.grid.worldToGrid(enemy.worldPos.x, enemy.worldPos.z);
            enemy.x = newGridPos.x;
            enemy.y = newGridPos.y;
        }
    }

    moveEnemy(enemy, flow, delta) {
        const gridPos = this.grid.worldToGrid(enemy.worldPos.x, enemy.worldPos.z);
        const targetX = gridPos.x + flow.x;
        const targetY = gridPos.y + flow.y;
        const targetWorld = this.grid.gridToWorld(targetX, targetY);

        const dir = new THREE.Vector3(targetWorld.x - enemy.worldPos.x, 0, targetWorld.z - enemy.worldPos.z);
        dir.normalize();

        enemy.worldPos.addScaledVector(dir, enemy.speed * delta);

        // Update InstancedMesh
        const dummy = new THREE.Object3D();
        dummy.position.copy(enemy.worldPos);
        dummy.updateMatrix();
        this.meshes[enemy.type].setMatrixAt(enemy.instanceId, dummy.matrix);
        this.meshes[enemy.type].instanceMatrix.needsUpdate = true;
    }

    attackBuilding(enemy, building, delta) {
        // Simple attack logic
        // Damage building
        // Visual feedback?
        this.buildingManager.damageBuilding(building, 10 * delta); // 10 DPS
    }
}
