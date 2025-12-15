import * as THREE from 'three';

export class CameraControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.moveSpeed = 0.5;
        this.zoomSpeed = 1.0;
        this.minZoom = 2;
        this.maxZoom = 50;

        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onWheel = this._onWheel.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    }

    _onKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
        }
    }

    _onKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
        }
    }

    _onWheel(event) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 1 : -1;

        // Move along the view vector
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        // Simple implementation: modify camera Y position and keep looking at target
        // Or just move forward/backward

        const zoomAmount = delta * this.zoomSpeed;

        // Limit zoom by checking position distance or y-height
        // Assuming top-down perspective
        if (this.camera.position.y + zoomAmount > this.minZoom && this.camera.position.y + zoomAmount < this.maxZoom) {
             this.camera.translateZ(zoomAmount);
        }
    }

    update() {
        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();

        // Get camera forward direction but projected on XZ plane
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        // Get camera right direction
        right.crossVectors(direction, this.camera.up).normalize(); // Note: Camera up is usually (0,1,0)

        // Correction: Cross product order matters.
        // Forward x Up = Right (if RHS)
        // Usually, Camera local X is right.

        if (this.keys.w) {
            this.camera.position.addScaledVector(direction, this.moveSpeed);
        }
        if (this.keys.s) {
            this.camera.position.addScaledVector(direction, -this.moveSpeed);
        }
        if (this.keys.a) {
            // Move left
            // We need the right vector.
            // Three.js: Right is usually (1,0,0) in local space.
            // Let's compute right vector from forward.
            // const right = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
            // Wait, Forward x Up?
            // Z x Y = -X.
            // -Z (Forward) x Y = X (Right).
            // Yes.
            const rightVec = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
            this.camera.position.addScaledVector(rightVec, this.moveSpeed);
        }
        if (this.keys.d) {
            const rightVec = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
            this.camera.position.addScaledVector(rightVec, -this.moveSpeed);
        }
    }
}
