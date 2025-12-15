// Simple particle system
import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = 500;

        // Geometry
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        this.material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        // Initialize logic data
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                active: false,
                life: 0,
                velocity: new THREE.Vector3()
            });
            // Hide initial
            this.positions[i * 3 + 1] = -100;
        }
    }

    emit(pos, color, count = 10) {
        let spawned = 0;
        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.particles[i].active) {
                const p = this.particles[i];
                p.active = true;
                p.life = 1.0; // 1 second

                // Position
                this.positions[i * 3] = pos.x;
                this.positions[i * 3 + 1] = pos.y;
                this.positions[i * 3 + 2] = pos.z;

                // Color
                this.colors[i * 3] = color.r;
                this.colors[i * 3 + 1] = color.g;
                this.colors[i * 3 + 2] = color.b;

                // Velocity (Random explosion)
                p.velocity.set(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5 + 2, // Upward bias
                    (Math.random() - 0.5) * 5
                );

                spawned++;
                if (spawned >= count) break;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    update(delta) {
        let activeCount = 0;
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (p.active) {
                p.life -= delta;
                if (p.life <= 0) {
                    p.active = false;
                    this.positions[i * 3 + 1] = -100; // Hide
                } else {
                    // Move
                    p.velocity.y -= 9.8 * delta; // Gravity
                    this.positions[i * 3] += p.velocity.x * delta;
                    this.positions[i * 3 + 1] += p.velocity.y * delta;
                    this.positions[i * 3 + 2] += p.velocity.z * delta;

                    // Ground collision
                    if (this.positions[i * 3 + 1] < 0) {
                        this.positions[i * 3 + 1] = 0;
                        p.velocity.y *= -0.5; // Bounce
                        p.velocity.x *= 0.8; // Friction
                        p.velocity.z *= 0.8;
                    }
                }
                activeCount++;
            }
        }

        if (activeCount > 0) {
            this.geometry.attributes.position.needsUpdate = true;
        }
    }
}
