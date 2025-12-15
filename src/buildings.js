// Logic for placing towers/houses
import * as THREE from 'three';

export class BuildingManager {
    constructor(scene, grid, resourceManager) {
        this.scene = scene;
        this.grid = grid;
        this.resourceManager = resourceManager;
        this.buildings = [];

        // Geometries and Materials
        this.wallGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Grey

        this.houseGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.houseMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00 }); // Green

        this.millGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.millMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown

        this.towerGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5);
        this.towerMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // Red

        this.townCenterGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        this.townCenterMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF }); // Blue

        // Instanced Mesh for Walls
        this.maxWalls = 1000;
        this.wallInstancedMesh = new THREE.InstancedMesh(this.wallGeometry, this.wallMaterial, this.maxWalls);
        this.scene.add(this.wallInstancedMesh);
        this.wallCount = 0;
        // Matrix to hide unused instances
        const dummy = new THREE.Object3D();
        dummy.position.set(0, -100, 0); // Hide below ground
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
            'towncenter': { wood: 0, gold: 0 } // Free, initial placement
        };

        // Stats
        this.stats = {
            'house': { hp: 50 },
            'mill': { hp: 50 },
            'wall': { hp: 100 },
            'tower': { hp: 80, range: 5, damage: 10, fireRate: 1.0 },
            'towncenter': { hp: 500 }
        };

        // Place initial Town Center
        this.placeBuilding(0, 0, 'towncenter');
    }

    placeBuilding(x, y, type) {
        if (!this.grid.isValid(x, y)) return;
        if (this.grid.getTile(x, y) !== 0) return; // Occupied

        const cost = this.costs[type];
        if (!cost) return;

        if (this.resourceManager.pay(cost)) {
            const pos = this.grid.gridToWorld(x, y);
            let mesh;

            if (type === 'wall') {
                if (this.wallCount < this.maxWalls) {
                    const dummy = new THREE.Object3D();
                    dummy.position.set(pos.x, 0.5, pos.z);
                    dummy.updateMatrix();
                    this.wallInstancedMesh.setMatrixAt(this.wallCount, dummy.matrix);
                    this.wallInstancedMesh.instanceMatrix.needsUpdate = true;

                    // We don't create a mesh for scene.add, but we need an object for game logic?
                    // Game logic tracks buildings in `this.buildings`.
                    // We need a way to map logic object to instance index.
                    const instanceId = this.wallCount;
                    this.wallCount++;

                    // Add logic object
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
                    console.log(`Placed ${type} at ${x}, ${y}`);
                    return; // Return early as we handled it
                } else {
                     console.log("Max walls reached");
                     return;
                }
            } else if (type === 'house') {
                mesh = new THREE.Mesh(this.houseGeometry, this.houseMaterial);
                mesh.position.set(pos.x, 0.4, pos.z);
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
            }

            if (mesh) {
                this.scene.add(mesh);
                this.grid.setTile(x, y, 1);

                const building = {
                    type: type,
                    x: x,
                    y: y,
                    mesh: mesh,
                    hp: this.stats[type].hp,
                    maxHp: this.stats[type].hp,
                    // Tower specifics
                    range: this.stats[type].range,
                    damage: this.stats[type].damage,
                    fireRate: this.stats[type].fireRate,
                    cooldown: 0
                };
                this.buildings.push(building);

                console.log(`Placed ${type} at ${x}, ${y}`);
            }
        } else {
            console.log("Not enough resources");
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
             }
        } else {
            this.scene.remove(building.mesh);
        }

        this.grid.setTile(building.x, building.y, 0); // Reset to Grass
        this.buildings = this.buildings.filter(b => b !== building);
        console.log(`Building destroyed at ${building.x}, ${building.y}`);

        if (building.type === 'towncenter') {
            alert("Game Over! Town Center Destroyed.");
            // Reload or stop game
            window.location.reload();
        }
    }

    update(delta, enemies) {
        // Handle passive income from mills
        const mills = this.buildings.filter(b => b.type === 'mill').length;
        if (mills > 0) {
            this.resourceManager.addResource('wood', mills * delta);
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
            // Enemy structure changed to InstancedMesh, but we kept worldPos in logic object.
            const enemyPos = enemy.worldPos; // Logic position
            const dist = towerPos.distanceTo(enemyPos);
            if (dist <= tower.range && dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }

        if (closestEnemy) {
            // Shoot!
            // console.log("Tower fired!"); // Log spam
            this.drawProjectile(tower.mesh.position, closestEnemy.worldPos);

            if (!closestEnemy.hp) closestEnemy.hp = 20;
            closestEnemy.hp -= tower.damage;

            tower.cooldown = 1.0 / tower.fireRate;
        }
    }

    drawProjectile(start, end) {
        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const points = [];
        points.push(new THREE.Vector3(start.x, 1.5, start.z)); // Tower top
        points.push(new THREE.Vector3(end.x, 0.4, end.z)); // Enemy center
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Remove after short duration
        setTimeout(() => {
            this.scene.remove(line);
            geometry.dispose();
            material.dispose();
        }, 100);
    }
}
