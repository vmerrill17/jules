import * as THREE from 'three';
import { Car } from './car.js';

export class AICar extends Car {
    constructor(scene, color) {
        super(scene);

        // Custom color
        this.mesh.children[0].material = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.4 });

        // AI Stats
        this.maxSpeed = 55.0; // Slightly slower than player
        this.lookAheadDistance = 15.0;

        // State
        this.targetPoint = new THREE.Vector3();
    }

    update(delta, track) {
        // AI Input Logic
        const input = { up: false, down: false, left: false, right: false };

        if (track && track.curve) {
            // Find where we are
            if (this.lastTrackU === undefined) this.lastTrackU = 0;
            const trackState = track.getTrackState(this.position, this.lastTrackU);
            this.lastTrackU = trackState.u;

            // Look ahead
            let lookAheadU = this.lastTrackU + (this.lookAheadDistance / track.curve.getLength());
            if (lookAheadU > 1) lookAheadU -= 1;

            const target = track.getPointAt(lookAheadU);
            this.targetPoint.copy(target); // Debug

            // Steering
            // Vector to target
            const toTarget = new THREE.Vector3().subVectors(target, this.position);
            toTarget.y = 0;
            toTarget.normalize();

            // Current forward
            const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));

            // Cross product to decide left or right
            const cross = forward.clone().cross(toTarget);

            if (cross.y > 0.1) input.left = true;
            if (cross.y < -0.1) input.right = true;

            // Gas logic
            // If facing target, gas. If sharp turn, brake?
            const dot = forward.dot(toTarget);
            if (dot > 0.8) {
                input.up = true;
            } else {
                // Turning
                input.up = true; // Still gas but maybe less?
                // We let physics handle speed loss during turn
            }

            // Recover from off-track
            if (!trackState.isOnTrack) {
                input.up = true; // Floor it to get back
            }
        }

        // Call super update with AI input
        super.update(input, delta, track);
    }
}
