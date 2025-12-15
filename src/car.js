import * as THREE from 'three';

export class Car {
    constructor(scene) {
        this.scene = scene;

        // Car Physics
        this.speed = 0;
        this.maxSpeed = 50;
        this.acceleration = 30;
        this.friction = 0.98;
        this.steeringAngle = 0;
        this.maxSteeringAngle = 0.04; // Radians per frame approx
        this.heading = 0; // Radians

        // Position
        this.position = new THREE.Vector3(0, 0.5, 0); // Lowered to sit on track (y=0.1) + wheel radius
        this.velocity = new THREE.Vector3();

        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();

        // Chassis
        const chassisGeo = new THREE.BoxGeometry(2, 1, 4);
        const chassisMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, metalness: 0.6, roughness: 0.4 });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 0.5;
        chassis.castShadow = true;
        this.mesh.add(chassis);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.8, 0.8, 2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.4, -0.5);
        cabin.castShadow = true;
        this.mesh.add(cabin);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        wheelGeo.rotateZ(Math.PI / 2);

        const positions = [
            { x: -1.1, y: 0.4, z: 1.2 },
            { x: 1.1, y: 0.4, z: 1.2 },
            { x: -1.1, y: 0.4, z: -1.2 },
            { x: 1.1, y: 0.4, z: -1.2 }
        ];

        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            this.mesh.add(wheel);
        });

        // Headlights
        const lightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0xFFFF00 });
        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-0.6, 0.6, 2.0);
        this.mesh.add(leftLight);

        const rightLight = new THREE.Mesh(lightGeo, lightMat);
        rightLight.position.set(0.6, 0.6, 2.0);
        this.mesh.add(rightLight);

        // Spotlights for night driving feel
        const spotL = new THREE.SpotLight(0xffffff, 1.0, 50, Math.PI/6, 0.5, 1);
        spotL.position.set(-0.6, 0.6, 2.0);
        spotL.target.position.set(-0.6, 0, 10);
        this.mesh.add(spotL);
        this.mesh.add(spotL.target);

        const spotR = new THREE.SpotLight(0xffffff, 1.0, 50, Math.PI/6, 0.5, 1);
        spotR.position.set(0.6, 0.6, 2.0);
        spotR.target.position.set(0.6, 0, 10);
        this.mesh.add(spotR);
        this.mesh.add(spotR.target);

        this.scene.add(this.mesh);
    }

    update(input, delta) {
        // Acceleration
        if (input.up) {
            this.speed += this.acceleration * delta;
        } else if (input.down) {
            this.speed -= this.acceleration * delta;
        } else {
            // Drag
            this.speed *= this.friction;
        }

        // Clamp Speed
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

        // Steering
        // Only steer if moving
        if (Math.abs(this.speed) > 0.1) {
            let turnFactor = this.speed / this.maxSpeed;
            if (turnFactor < 0) turnFactor *= -1; // Reverse logic

            if (input.left) {
                this.heading += this.maxSteeringAngle * (Math.abs(this.speed)/10);
            } else if (input.right) {
                this.heading -= this.maxSteeringAngle * (Math.abs(this.speed)/10);
            }
        }

        // Update Velocity Vector
        this.velocity.x = Math.sin(this.heading) * this.speed;
        this.velocity.z = Math.cos(this.heading) * this.speed;

        // Update Position
        this.position.x += this.velocity.x * delta;
        this.position.z += this.velocity.z * delta;

        // Update Mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
    }

    getSpeedKmh() {
        return Math.abs(this.speed * 3.6).toFixed(0);
    }
}
