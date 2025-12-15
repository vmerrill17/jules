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

        this.enemyGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        this.enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red as per checklist

        // Instanced Mesh for Enemies
        this.maxEnemies = 1000;
        this.enemyInstancedMesh = new THREE.InstancedMesh(this.enemyGeometry, this.enemyMaterial, this.maxEnemies);
        this.enemyInstancedMesh.frustumCulled = false; // Prevent culling when instances move
        this.scene.add(this.enemyInstancedMesh);

        // Initialize all instances to hidden
        this.dummy = new THREE.Object3D();
        this.dummy.position.set(0, -100, 0);
        this.dummy.updateMatrix();
        for (let i = 0; i < this.maxEnemies; i++) {
            this.enemyInstancedMesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.enemyInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    setNight(isNight) {
        this.isNight = isNight;
        // Recalculate flow field when night starts in case walls changed
        if (isNight) {
             this.pathfinding.calculateFlowField();
        }
    }

    spawnEnemy() {
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

        // Find available instance slot
        // For simplicity, let's just use indices. We need to manage free indices.
        // Or simpler: We keep a list of active enemies and map them to indices 0..N-1?
        // No, better to have each enemy object hold its instance ID.

        // Naive pool: linear search for first hole? Or just append if we don't care about fragmentation?
        // Better: Stack of free indices.
        if (!this.freeIndices) {
            this.freeIndices = [];
            for (let i = 0; i < this.maxEnemies; i++) {
                this.freeIndices.push(i);
            }
        }

        if (this.freeIndices.length === 0) return; // Full

        const instanceId = this.freeIndices.pop();

        const dummy = new THREE.Object3D();
        dummy.position.set(pos.x, 0.4, pos.z);
        dummy.updateMatrix();
        this.enemyInstancedMesh.setMatrixAt(instanceId, dummy.matrix);
        this.enemyInstancedMesh.instanceMatrix.needsUpdate = true;

        this.enemies.push({
            instanceId: instanceId, // Track instance ID
            x: x,
            y: y,
            worldPos: new THREE.Vector3(pos.x, 0.4, pos.z),
            speed: 2.0,
            hp: 20
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
                this.enemyInstancedMesh.setMatrixAt(enemy.instanceId, this.dummy.matrix);
                needsUpdate = true;

                this.freeIndices.push(enemy.instanceId);
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
        this.enemyInstancedMesh.setMatrixAt(enemy.instanceId, dummy.matrix);
        this.enemyInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    attackBuilding(enemy, building, delta) {
        // Simple attack logic
        // Damage building
        // Visual feedback?
        this.buildingManager.damageBuilding(building, 10 * delta); // 10 DPS
    }
}
