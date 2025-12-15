// Logic for placing towers/houses
import * as THREE from 'three';
import { createHouseGeometry } from './utils.js';

export class BuildingManager {
    constructor(scene, grid, resourceManager, particleSystem) {
        this.scene = scene;
        this.grid = grid;
        this.resourceManager = resourceManager;
        this.particleSystem = particleSystem;
        this.buildings = [];

        // Projectiles
        this.projectiles = [];
        this.projectileGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        this.projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });

        // Geometries and Materials
        this.wallGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7 }); // Grey

        this.houseGeometry = createHouseGeometry();
        this.houseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Brown wood

        this.millGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.millMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D }); // Sienna

        this.towerGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5);
        this.towerMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 }); // Dim Gray

        this.townCenterGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        this.townCenterMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 }); // Royal Blue

        this.goldMineGeometry = new THREE.DodecahedronGeometry(0.5);
        this.goldMineMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 }); // Gold

        this.quarryGeometry = new THREE.DodecahedronGeometry(0.5);
        this.quarryMaterial = new THREE.MeshStandardMaterial({ color: 0x708090 }); // Slate Grey

        this.farmGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
        this.farmMaterial = new THREE.MeshStandardMaterial({ color: 0xF0E68C }); // Khaki

        this.hunterGeometry = new THREE.ConeGeometry(0.5, 1.0, 4);
        this.hunterMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Forest Green

        this.barracksGeometry = new THREE.BoxGeometry(1.2, 0.8, 1.2);
        this.barracksMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark Red

        this.trapGeometry = new THREE.ConeGeometry(0.2, 0.4, 4);
        this.trapMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Dark Grey

        // Instanced Mesh for Walls
        this.maxWalls = 1000;
        this.wallInstancedMesh = new THREE.InstancedMesh(this.wallGeometry, this.wallMaterial, this.maxWalls);
        this.wallInstancedMesh.castShadow = true;
        this.wallInstancedMesh.receiveShadow = true;
        this.wallInstancedMesh.frustumCulled = false;
        this.scene.add(this.wallInstancedMesh);

        // Free indices stack for recycling
        this.wallFreeIndices = [];
        for (let i = 0; i < this.maxWalls; i++) {
            this.wallFreeIndices.push(i);
        }

        // Matrix to hide unused instances
        const dummy = new THREE.Object3D();
        dummy.position.set(0, -100, 0);
        dummy.updateMatrix();
        for (let i = 0; i < this.maxWalls; i++) {
            this.wallInstancedMesh.setMatrixAt(i, dummy.matrix);
        }
        this.wallInstancedMesh.instanceMatrix.needsUpdate = true;


        this.costs = {
            'house': { wood: 10, gold: 0 },
            'mill': { wood: 0, gold: 50 },
            'wall': { wood: 5, gold: 0 },
            'tower': { wood: 20, gold: 10 },
            'goldmine': { wood: 50, gold: 0 },
            'quarry': { wood: 50, gold: 0 },
            'farm': { wood: 30, gold: 0 },
            'hunter': { wood: 20, gold: 0 },
            'barracks': { wood: 100, gold: 0, stone: 50 },
            'trap': { wood: 10, gold: 0 },
            'towncenter': { wood: 0, gold: 0 }
        };

        // Stats
        this.stats = {
            'house': { hp: 50 },
            'mill': { hp: 50, maxWorkers: 5 },
            'wall': { hp: 100 },
            'tower': { hp: 80, range: 5, damage: 10, fireRate: 1.0 },
            'goldmine': { hp: 50, maxWorkers: 5 },
            'quarry': { hp: 50, maxWorkers: 5 },
            'farm': { hp: 30, maxWorkers: 5 },
            'hunter': { hp: 40, maxWorkers: 5 },
            'barracks': { hp: 100 },
            'trap': { hp: 10, damage: 5 },
            'towncenter': { hp: 500 }
        };

        // Place initial Town Center
        const centerX = Math.floor(grid.width / 2);
        const centerY = Math.floor(grid.height / 2);
        this.placeBuilding(centerX, centerY, 'towncenter');
    }

    placeBuilding(x, y, type) {
        if (!this.grid.isValid(x, y)) return;
        if (this.grid.getTile(x, y) !== 0) return; // Occupied

        const cost = this.costs[type];
        if (!cost) return;

        // Check availability first
        if (type === 'wall' && this.wallFreeIndices.length === 0) {
            console.log("Max walls reached");
            return;
        }

        if (this.resourceManager.pay(cost)) {
            const pos = this.grid.gridToWorld(x, y);
            let mesh;

            if (type === 'wall') {
                const instanceId = this.wallFreeIndices.pop();

                const dummy = new THREE.Object3D();
                dummy.position.set(pos.x, 0.5, pos.z);
                dummy.updateMatrix();
                this.wallInstancedMesh.setMatrixAt(instanceId, dummy.matrix);
                this.wallInstancedMesh.instanceMatrix.needsUpdate = true;

                 const building = {
                    type: type,
                    x: x,
                    y: y,
                    instanceId: instanceId, // Track instance ID
                    isInstanced: true,
                    hp: this.stats[type].hp,
                    maxHp: this.stats[type].hp
                };
                this.buildings.push(building);
                this.grid.setTile(x, y, 1);
                return;
            } else if (type === 'house') {
                mesh = new THREE.Mesh(this.houseGeometry, this.houseMaterial);
                mesh.position.set(pos.x, 0, pos.z); // Geometry has offset
                this.resourceManager.maxPopulation += 2;
                this.resourceManager.updateUI();
            } else if (type === 'mill') {
                mesh = new THREE.Mesh(this.millGeometry, this.millMaterial);
                mesh.position.set(pos.x, 0.4, pos.z);
            } else if (type === 'tower') {
                mesh = new THREE.Mesh(this.towerGeometry, this.towerMaterial);
                mesh.position.set(pos.x, 0.75, pos.z);
            } else if (type === 'towncenter') {
                mesh = new THREE.Mesh(this.townCenterGeometry, this.townCenterMaterial);
                mesh.position.set(pos.x, 0.75, pos.z);
            } else if (type === 'goldmine') {
                mesh = new THREE.Mesh(this.goldMineGeometry, this.goldMineMaterial);
                mesh.position.set(pos.x, 0.4, pos.z);
            } else if (type === 'quarry') {
                mesh = new THREE.Mesh(this.quarryGeometry, this.quarryMaterial);
                mesh.position.set(pos.x, 0.4, pos.z);
            } else if (type === 'farm') {
                mesh = new THREE.Mesh(this.farmGeometry, this.farmMaterial);
                mesh.position.set(pos.x, 0.1, pos.z);
            } else if (type === 'hunter') {
                mesh = new THREE.Mesh(this.hunterGeometry, this.hunterMaterial);
                mesh.position.set(pos.x, 0.5, pos.z);
            } else if (type === 'barracks') {
                mesh = new THREE.Mesh(this.barracksGeometry, this.barracksMaterial);
                mesh.position.set(pos.x, 0.4, pos.z);
            } else if (type === 'trap') {
                mesh = new THREE.Mesh(this.trapGeometry, this.trapMaterial);
                mesh.position.set(pos.x, 0.2, pos.z);
            }

            if (mesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.grid.setTile(x, y, 1);

                const building = {
                    type: type,
                    x: x,
                    y: y,
                    mesh: mesh,
                    hp: this.stats[type].hp,
                    maxHp: this.stats[type].hp,
                    maxWorkers: this.stats[type].maxWorkers || 0,
                    // Tower specifics
                    range: this.stats[type].range,
                    damage: this.stats[type].damage,
                    fireRate: this.stats[type].fireRate,
                    cooldown: 0
                };
                this.buildings.push(building);
            }
        }
    }

    getBuildingAt(x, y) {
        return this.buildings.find(b => b.x === x && b.y === y);
    }

    damageBuilding(building, amount) {
        building.hp -= amount;
        if (building.hp <= 0) {
            this.destroyBuilding(building);
        }
    }

    destroyBuilding(building) {
        if (building.isInstanced) {
             if (building.type === 'wall') {
                 // Hide instance
                 const dummy = new THREE.Object3D();
                 dummy.position.set(0, -100, 0);
                 dummy.updateMatrix();
                 this.wallInstancedMesh.setMatrixAt(building.instanceId, dummy.matrix);
                 this.wallInstancedMesh.instanceMatrix.needsUpdate = true;

                 // Recycle index
                 this.wallFreeIndices.push(building.instanceId);
             }
        } else {
            this.scene.remove(building.mesh);
        }

        this.grid.setTile(building.x, building.y, 0); // Reset to Grass
        this.buildings = this.buildings.filter(b => b !== building);

        if (building.type === 'towncenter') {
            const gameOver = document.getElementById('game-over');
            if (gameOver) gameOver.style.display = 'flex';
        }
    }

    update(delta, enemies) {
        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dir = new THREE.Vector3().subVectors(p.target, p.mesh.position).normalize();
            const dist = p.mesh.position.distanceTo(p.target);

            if (dist < 0.5 || p.mesh.position.y < 0) { // Hit
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);

                if (p.enemy && p.enemy.hp > 0) {
                    p.enemy.hp -= p.damage;
                    if (this.particleSystem) {
                         this.particleSystem.emit(p.mesh.position, new THREE.Color(0xFFFF00));
                    }
                }
            } else {
                p.mesh.position.addScaledVector(dir, 10 * delta); // Speed 10
            }
        }

        // Traps logic
        if (enemies) {
             const traps = this.buildings.filter(b => b.type === 'trap');
             traps.forEach(trap => {
                 const trapPos = new THREE.Vector3(trap.mesh.position.x, 0, trap.mesh.position.z);
                 enemies.forEach(enemy => {
                     const enemyPos = enemy.worldPos;
                     const dist = trapPos.distanceTo(enemyPos);
                     if (dist < 0.5) { // Collision
                         if (!enemy.hp) enemy.hp = 20;
                         enemy.hp -= this.stats['trap'].damage * delta * 60;
                     }
                 });
             });
        }

        // Handle Towers firing
        this.buildings.forEach(building => {
            if (building.type === 'tower') {
                building.cooldown -= delta;
                if (building.cooldown <= 0) {
                    if (enemies) {
                        this.towerFire(building, enemies);
                    }
                }
            }
        });
    }

    towerFire(tower, enemies) {
        const towerPos = new THREE.Vector3(tower.mesh.position.x, 0, tower.mesh.position.z);

        let closestEnemy = null;
        let closestDist = Infinity;

        for (const enemy of enemies) {
            const enemyPos = enemy.worldPos; // Logic position
            const dist = towerPos.distanceTo(enemyPos);
            if (dist <= tower.range && dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }

        if (closestEnemy) {
            // Spawn Projectile
            this.spawnProjectile(tower.mesh.position, closestEnemy, tower.damage);
            tower.cooldown = 1.0 / tower.fireRate;
        }
    }

    spawnProjectile(start, enemy, damage) {
        const mesh = new THREE.Mesh(this.projectileGeometry, this.projectileMaterial);
        mesh.position.set(start.x, 1.5, start.z);
        this.scene.add(mesh);

        this.projectiles.push({
            mesh: mesh,
            target: enemy.worldPos,
            enemy: enemy,
            damage: damage
        });
    }
}
