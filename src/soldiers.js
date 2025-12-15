// Logic for soldiers
import * as THREE from 'three';

export class SoldierManager {
    constructor(scene, grid, enemyManager, resourceManager) {
        this.scene = scene;
        this.grid = grid;
        this.enemyManager = enemyManager;
        this.resourceManager = resourceManager;
        this.soldiers = [];
        this.maxSoldiers = 100;

        // Geometry
        this.geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.6);
        this.material = new THREE.MeshStandardMaterial({ color: 0x00008B }); // Dark Blue

        // Instanced Mesh
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxSoldiers);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        this.dummy = new THREE.Object3D();
        this.dummy.position.set(0, -100, 0);
        this.dummy.updateMatrix();

        for (let i = 0; i < this.maxSoldiers; i++) {
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;

        this.freeIndices = [];
        for (let i = 0; i < this.maxSoldiers; i++) {
            this.freeIndices.push(i);
        }
    }

    trainSoldier(barracks) {
        if (this.freeIndices.length === 0) return;

        const cost = { food: 50, gold: 20 };
        if (this.resourceManager && !this.resourceManager.pay(cost)) {
            return;
        }

        const instanceId = this.freeIndices.pop();
        const startPos = this.grid.gridToWorld(barracks.x, barracks.y);

        this.soldiers.push({
            instanceId: instanceId,
            worldPos: new THREE.Vector3(startPos.x, 0.3, startPos.z),
            targetEnemy: null,
            state: 'idle', // idle, chasing, attacking
            hp: 50,
            damage: 5,
            attackCooldown: 0
        });

        console.log("Soldier trained!");
    }

    update(delta) {
        let needsUpdate = false;

        for (let i = this.soldiers.length - 1; i >= 0; i--) {
            const soldier = this.soldiers[i];

            // Check HP
            if (soldier.hp <= 0) {
                 this.dummy.position.set(0, -100, 0);
                 this.dummy.updateMatrix();
                 this.mesh.setMatrixAt(soldier.instanceId, this.dummy.matrix);
                 needsUpdate = true;
                 this.freeIndices.push(soldier.instanceId);
                 this.soldiers.splice(i, 1);
                 continue;
            }

            this.updateSoldier(soldier, delta);

            // Update Mesh
            this.dummy.position.copy(soldier.worldPos);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(soldier.instanceId, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    updateSoldier(soldier, delta) {
        const speed = 2.5;
        const attackRange = 1.0;

        if (soldier.targetEnemy && soldier.targetEnemy.hp <= 0) {
            soldier.targetEnemy = null;
            soldier.state = 'idle';
        }

        if (soldier.state === 'idle') {
            // Find closest enemy
            let closest = null;
            let closestDist = Infinity;

            // Access enemies from EnemyManager
            // Note: EnemyManager uses InstancedMesh but keeps logic objects in `this.enemies`.
            if (this.enemyManager && this.enemyManager.enemies) {
                for (const enemy of this.enemyManager.enemies) {
                    const dist = soldier.worldPos.distanceTo(enemy.worldPos);
                    if (dist < 15 && dist < closestDist) { // Detection range
                        closestDist = dist;
                        closest = enemy;
                    }
                }
            }

            if (closest) {
                soldier.targetEnemy = closest;
                soldier.state = 'chasing';
            }
        } else if (soldier.state === 'chasing') {
            if (!soldier.targetEnemy) { soldier.state = 'idle'; return; }

            const dist = soldier.worldPos.distanceTo(soldier.targetEnemy.worldPos);

            if (dist <= attackRange) {
                soldier.state = 'attacking';
            } else {
                // Move towards
                const dir = new THREE.Vector3().subVectors(soldier.targetEnemy.worldPos, soldier.worldPos);
                dir.y = 0;
                dir.normalize();
                soldier.worldPos.addScaledVector(dir, speed * delta);
            }
        } else if (soldier.state === 'attacking') {
            if (!soldier.targetEnemy) { soldier.state = 'idle'; return; }

            const dist = soldier.worldPos.distanceTo(soldier.targetEnemy.worldPos);
            if (dist > attackRange) {
                soldier.state = 'chasing';
                return;
            }

            soldier.attackCooldown -= delta;
            if (soldier.attackCooldown <= 0) {
                // Attack
                soldier.targetEnemy.hp -= soldier.damage;
                soldier.attackCooldown = 1.0;
                // Visual feedback?
            }
        }
    }
}
