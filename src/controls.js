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
            d: false,
            q: false,
            e: false
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
            case 'q': this.keys.q = true; break;
            case 'e': this.keys.e = true; break;
        }
    }

    _onKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
            case 'q': this.keys.q = false; break;
            case 'e': this.keys.e = false; break;
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

    update(delta = 0.016) {
        const direction = new THREE.Vector3();

        // Get camera forward direction but projected on XZ plane
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        if (this.keys.w) {
            this.camera.position.addScaledVector(direction, this.moveSpeed);
        }
        if (this.keys.s) {
            this.camera.position.addScaledVector(direction, -this.moveSpeed);
        }
        if (this.keys.a) {
            const rightVec = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
            this.camera.position.addScaledVector(rightVec, this.moveSpeed);
        }
        if (this.keys.d) {
            const rightVec = new THREE.Vector3().crossVectors(this.camera.up, direction).normalize();
            this.camera.position.addScaledVector(rightVec, -this.moveSpeed);
        }

        // Rotation
        if (this.keys.q || this.keys.e) {
            const rotateSpeed = 2.0 * delta;
            const angle = this.keys.q ? rotateSpeed : -rotateSpeed;

            // Find pivot point on ground
            // Raycast from camera position along look direction to Y=0 plane
            const lookDir = new THREE.Vector3();
            this.camera.getWorldDirection(lookDir);

            // t = -pos.y / dir.y
            if (lookDir.y !== 0) {
                const t = -this.camera.position.y / lookDir.y;
                const pivot = new THREE.Vector3().copy(this.camera.position).addScaledVector(lookDir, t);

                // Rotate position around pivot
                const offset = new THREE.Vector3().subVectors(this.camera.position, pivot);
                offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.camera.position.copy(pivot).add(offset);

                // Rotate camera to look at pivot (yaw)
                this.camera.lookAt(pivot);
            }
        }
    }
}
