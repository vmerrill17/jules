// Logic for spawning and moving enemies
import * as THREE from 'three';
import { Pathfinding } from './pathfinding.js';

export class EnemyManager {
    constructor(scene, grid, buildingManager, particleSystem) {
        this.scene = scene;
        this.grid = grid;
        this.buildingManager = buildingManager;
        this.particleSystem = particleSystem;
        this.enemies = [];
        this.projectiles = []; // Enemy projectiles

        this.pathfinding = new Pathfinding(grid);

        // Initial Target: Center of grid
        this.target = { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
        this.pathfinding.setTarget(this.target.x, this.target.y);

        this.spawnTimer = 0;
        this.spawnInterval = 1.0;
        this.isNight = false;

        // Enemy Types Configuration
        this.types = {
            standard: { color: 0xFF0000, size: 0.4, speed: 2.0, hp: 20 },
            fast: { color: 0xFFFF00, size: 0.3, speed: 4.0, hp: 10 },
            tank: { color: 0x000000, size: 0.6, speed: 1.0, hp: 50 },
            ranged: { color: 0x800080, size: 0.4, speed: 1.5, hp: 15, range: 4, damage: 5, reload: 2.0 }, // Purple
            siege: { color: 0x8B4513, size: 0.7, speed: 0.8, hp: 80, bonusVsWalls: 3.0 } // Brown
        };

        this.meshes = {};
        this.freeIndices = {};
        this.maxEnemiesPerType = 500;

        // Initialize Meshes for each type
        this.dummy = new THREE.Object3D();
        this.dummy.position.set(0, -100, 0);
        this.dummy.updateMatrix();

        // Projectile setup
        this.projectileGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        this.projectileMaterial = new THREE.MeshBasicMaterial({ color: 0x800080 });

        for (const [key, config] of Object.entries(this.types)) {
            let geometry;
            if (key === 'ranged') {
                geometry = new THREE.TetrahedronGeometry(config.size);
            } else if (key === 'siege') {
                geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
            } else {
                geometry = new THREE.SphereGeometry(config.size, 8, 8);
            }

            const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.5 });
            const mesh = new THREE.InstancedMesh(geometry, material, this.maxEnemiesPerType);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
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

    setNight(isNight, dayCount = 1) {
        this.isNight = isNight;
        this.dayCount = dayCount;
        this.spawnInterval = Math.max(0.2, 1.0 - (this.dayCount * 0.1));

        if (isNight) {
             this.pathfinding.calculateFlowField();
        }
    }

    spawnEnemy() {
        let typeKey = 'standard';
        const rand = Math.random();

        // Progression Logic
        if (this.dayCount >= 5) {
            if (rand < 0.1) typeKey = 'siege';
            else if (rand < 0.25) typeKey = 'tank';
            else if (rand < 0.4) typeKey = 'ranged';
            else if (rand < 0.6) typeKey = 'fast';
            else typeKey = 'standard';
        } else if (this.dayCount >= 3) {
            if (rand < 0.1) typeKey = 'tank';
            else if (rand < 0.25) typeKey = 'ranged';
            else if (rand < 0.5) typeKey = 'fast';
            else typeKey = 'standard';
        } else {
            if (rand < 0.1) typeKey = 'fast';
            else typeKey = 'standard';
        }

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

        if (this.grid.getTile(x, y) !== 0) return;

        const pos = this.grid.gridToWorld(x, y);

        if (this.freeIndices[typeKey].length === 0) return;

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
            hp: config.hp,
            // Ranged specific
            cooldown: 0,
            range: config.range || 0,
            damage: config.damage || 5,
            bonusVsWalls: config.bonusVsWalls || 1.0
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

        this.updateProjectiles(delta);

        // Move enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (enemy.hp <= 0) {
                // Kill enemy
                if (this.particleSystem) {
                    this.particleSystem.emit(enemy.worldPos, new THREE.Color(this.types[enemy.type].color));
                }

                this.dummy.position.set(0, -100, 0);
                this.dummy.updateMatrix();
                this.meshes[enemy.type].setMatrixAt(enemy.instanceId, this.dummy.matrix);
                this.meshes[enemy.type].instanceMatrix.needsUpdate = true;

                this.freeIndices[enemy.type].push(enemy.instanceId);
                this.enemies.splice(i, 1);
                continue;
            }

            // Logic
            if (enemy.type === 'ranged') {
                this.updateRanged(enemy, delta);
            } else {
                this.updateMelee(enemy, delta);
            }

            // Re-sync logical x,y
            const newGridPos = this.grid.worldToGrid(enemy.worldPos.x, enemy.worldPos.z);
            enemy.x = newGridPos.x;
            enemy.y = newGridPos.y;
        }
    }

    updateMelee(enemy, delta) {
        const gridPos = this.grid.worldToGrid(enemy.worldPos.x, enemy.worldPos.z);
        const flow = this.pathfinding.getFlow(gridPos.x, gridPos.y);

        if (flow) {
            const targetX = gridPos.x + flow.x;
            const targetY = gridPos.y + flow.y;

            const tileType = this.grid.getTile(targetX, targetY);
            if (tileType === 1) { // Building
                const building = this.buildingManager.getBuildingAt(targetX, targetY);
                if (building) {
                    let dmg = 10 * delta;
                    if (enemy.type === 'siege' && (building.type === 'wall' || building.type === 'tower')) {
                        dmg *= enemy.bonusVsWalls;
                    }
                    this.attackBuilding(enemy, building, dmg);
                } else {
                     this.moveEnemy(enemy, flow, delta);
                }
            } else {
                this.moveEnemy(enemy, flow, delta);
            }
        }
    }

    updateRanged(enemy, delta) {
        // Find nearest building
        // Optimization: Just check buildings list? Too slow (hundreds of buildings).
        // Check grid within range?
        // Simple: Just check if we are within range of ANY building towards the center?
        // Or check nearest building.
        // Let's iterate buildings... optimize later if needed.

        let target = null;
        let minDist = enemy.range + 0.1;

        // Scan limited radius?
        // For now, simple distance check to nearest building.
        // If we want them to siege, they should follow flow field until they see a building.

        // Re-use Flow Field logic: If I follow flow field for 'Range' steps, do I hit a building?
        // That's complex.

        // Fallback: Behave like melee until within range of 'something'.
        // Let's just check distance to the Town Center first.
        const centerPos = this.grid.gridToWorld(Math.floor(this.grid.width/2), Math.floor(this.grid.height/2));
        const distToCenter = enemy.worldPos.distanceTo(centerPos);

        // If close to center, attack center
        if (distToCenter <= enemy.range + 1) { // +1 for building size
             // Attack Center
             const center = this.buildingManager.getBuildingAt(Math.floor(this.grid.width/2), Math.floor(this.grid.height/2));
             if (center) target = center;
        }

        // Also check if any wall/tower is close
        // We can do a quick check of surrounding tiles in radius
        if (!target) {
            const r = Math.ceil(enemy.range);
            const gx = enemy.x;
            const gy = enemy.y;

            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    const tx = gx + dx;
                    const ty = gy + dy;
                    if (this.grid.isValid(tx, ty) && this.grid.getTile(tx, ty) === 1) {
                         // Found a building
                         const b = this.buildingManager.getBuildingAt(tx, ty);
                         if (b) {
                             const dist = enemy.worldPos.distanceTo(b.mesh ? b.mesh.position : new THREE.Vector3(0,0,0)); // Instanced walls don't have mesh.position
                             // Need robust position getting
                             let bPos;
                             if (b.isInstanced) {
                                 bPos = this.grid.gridToWorld(b.x, b.y);
                             } else {
                                 bPos = b.mesh.position;
                             }

                             if (dist <= enemy.range) {
                                 target = b;
                                 break;
                             }
                         }
                    }
                }
                if (target) break;
            }
        }

        if (target) {
            // Attack
            enemy.cooldown -= delta;
            if (enemy.cooldown <= 0) {
                this.spawnProjectile(enemy, target);
                enemy.cooldown = 2.0; // Slow fire
            }
        } else {
            // Move
            this.updateMelee(enemy, delta);
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

        // Rotate to face direction
        // atan2(x, z)
        const angle = Math.atan2(dir.x, dir.z);
        dummy.rotation.y = angle;

        dummy.updateMatrix();
        this.meshes[enemy.type].setMatrixAt(enemy.instanceId, dummy.matrix);
        this.meshes[enemy.type].instanceMatrix.needsUpdate = true;
    }

    attackBuilding(enemy, building, damage) {
        this.buildingManager.damageBuilding(building, damage);
    }

    spawnProjectile(enemy, targetBuilding) {
        let targetPos;
        if (targetBuilding.isInstanced) {
            const p = this.grid.gridToWorld(targetBuilding.x, targetBuilding.y);
            targetPos = new THREE.Vector3(p.x, 0.5, p.z);
        } else {
            targetPos = targetBuilding.mesh.position.clone();
        }

        const mesh = new THREE.Mesh(this.projectileGeometry, this.projectileMaterial);
        mesh.position.copy(enemy.worldPos);
        mesh.position.y += 0.5;
        this.scene.add(mesh);

        this.projectiles.push({
            mesh: mesh,
            target: targetPos,
            damage: enemy.damage,
            targetBuilding: targetBuilding
        });
    }

    updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dir = new THREE.Vector3().subVectors(p.target, p.mesh.position).normalize();
            const dist = p.mesh.position.distanceTo(p.target);

            if (dist < 0.5) { // Hit
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);

                // Damage
                if (this.buildingManager.buildings.includes(p.targetBuilding)) {
                    this.buildingManager.damageBuilding(p.targetBuilding, p.damage);
                    if (this.particleSystem) {
                         this.particleSystem.emit(p.mesh.position, new THREE.Color(0xFFA500));
                    }
                }
            } else {
                p.mesh.position.addScaledVector(dir, 8 * delta);
            }
        }
    }
}
