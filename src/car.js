import * as THREE from 'three';

export class Car {
    constructor(scene) {
        this.scene = scene;

        // Car Physics
        this.acceleration = 20.0;
        this.braking = 30.0;
        this.maxSpeed = 60.0;
        this.turnSpeed = 2.5;
        this.friction = 0.5; // Surface friction
        this.driftFactor = 0.95; // 1.0 = no slide, 0.0 = ice

        // Vectors
        this.velocity = new THREE.Vector3();
        this.heading = 0; // Radians
        // Surface at ~0.02 + 0.05 = 0.07. Wheels rad 0.4.
        // Wheel center at 0.47.
        // Car mesh origin is center of wheels (roughly).
        // If wheel local y=0.4, then mesh y should be 0.07.
        this.position = new THREE.Vector3(0, 0.1, 0);

        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();

        // Chassis
        const chassisGeo = new THREE.BoxGeometry(2, 0.8, 4.2);
        const chassisMat = new THREE.MeshStandardMaterial({ color: 0xFF2200, metalness: 0.7, roughness: 0.3 });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 0.6;
        chassis.castShadow = true;
        this.mesh.add(chassis);

        // Spoiler
        const spoilerGeo = new THREE.BoxGeometry(2.2, 0.1, 0.5);
        const spoiler = new THREE.Mesh(spoilerGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        spoiler.position.set(0, 1.2, -1.8);
        this.mesh.add(spoiler);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.7, 0.7, 2.2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.3, -0.2);
        cabin.castShadow = true;
        this.mesh.add(cabin);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 24);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        wheelGeo.rotateZ(Math.PI / 2);

        const positions = [
            { x: -1.1, y: 0.4, z: 1.3 },
            { x: 1.1, y: 0.4, z: 1.3 },
            { x: -1.1, y: 0.4, z: -1.4 },
            { x: 1.1, y: 0.4, z: -1.4 }
        ];

        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            this.mesh.add(wheel);
        });

        // Lights
        const lightGeo = new THREE.BoxGeometry(0.5, 0.2, 0.1);
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xFFFFCC, emissive: 0xFFFFCC, emissiveIntensity: 2 });
        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-0.7, 0.7, 2.1);
        this.mesh.add(leftLight);

        const rightLight = new THREE.Mesh(lightGeo, lightMat);
        rightLight.position.set(0.7, 0.7, 2.1);
        this.mesh.add(rightLight);

        const spotL = new THREE.SpotLight(0xffffff, 2.0, 60, Math.PI/6, 0.5, 1);
        spotL.position.set(0, 2, 0); // High mount
        spotL.target.position.set(0, 0, 20); // Far ahead
        this.mesh.add(spotL);
        this.mesh.add(spotL.target);

        this.scene.add(this.mesh);
    }

    update(input, delta, track) {
        // Forward vector based on current rotation
        const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));

        // Check Track Surface
        let dragFactor = 0.5; // Normal Air Resistance
        let surfaceFriction = 1.0;

        if (track) {
            // We store lastU to optimize search, attach it to car
            if (this.lastTrackU === undefined) this.lastTrackU = 0;

            const trackState = track.getTrackState(this.position, this.lastTrackU);
            this.lastTrackU = trackState.u;

            if (!trackState.isOnTrack) {
                // OFF ROAD!
                dragFactor = 5.0; // Heavy drag
                surfaceFriction = 0.5; // Less grip
            }
        }

        // 1. Apply Engine Force
        let accel = this.acceleration;
        if (surfaceFriction < 1.0) accel *= 0.5; // Less acceleration on grass

        if (input.up) {
            this.velocity.addScaledVector(forward, accel * delta);
        } else if (input.down) {
            this.velocity.addScaledVector(forward, -accel * delta);
        }

        // 2. Drag (Opposes velocity)
        this.velocity.multiplyScalar(1 - (dragFactor * delta));

        // 3. Steering (Rotate Heading)
        // Speed factor: steer better at medium speeds, worse at very high/low
        const speed = this.velocity.length();
        if (speed > 1.0) {
            let steerAmount = this.turnSpeed * delta;
            // Reverse steering if backing up
            const dot = this.velocity.dot(forward);
            if (dot < 0) steerAmount *= -1;

            if (input.left) {
                this.heading += steerAmount;
            } else if (input.right) {
                this.heading -= steerAmount;
            }
        }

        // 4. Lateral Friction (Drift Physics)
        // Split velocity into Forward and Right components relative to *new* heading
        const right = new THREE.Vector3(Math.sin(this.heading - Math.PI/2), 0, Math.cos(this.heading - Math.PI/2));
        const forwardNew = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));

        const forwardVelocity = forwardNew.multiplyScalar(this.velocity.dot(forwardNew));
        const rightVelocity = right.multiplyScalar(this.velocity.dot(right));

        // Apply heavy friction to sideways velocity, but not instant (allows slide)
        rightVelocity.multiplyScalar(0.9); // Slide factor

        // Recombine
        this.velocity.copy(forwardVelocity).add(rightVelocity);

        // 5. Update Position
        this.position.addScaledVector(this.velocity, delta);

        // Update Mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;

        // Spotlights follow mesh rotation automatically via hierarchy
        // But targets might need updates if they are children?
        // ThreeJS object hierarchy handles rotation of children. Spotlight target must be added to scene or child.
        // We added target to mesh, so it rotates.
    }

    getSpeedKmh() {
        return (this.velocity.length() * 3.6).toFixed(0);
    }

    reset(position) {
        this.position.copy(position);
        this.velocity.set(0,0,0);
        this.heading = 0; // Or match track tangent
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
    }
}
