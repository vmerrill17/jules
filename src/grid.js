// Manages the map data
import * as THREE from 'three';

export class Grid {
    constructor(scene, width, height) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.cellSize = 1;
        this.data = new Array(width * height).fill(0); // 0=Grass, 1=Wall, 2=Enemy, etc.

        this.createVisuals();
    }

    createVisuals() {
        const geometry = new THREE.PlaneGeometry(this.width, this.height);
        const material = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 }); // Green grass
        this.plane = new THREE.Mesh(geometry, material);
        this.plane.rotation.x = -Math.PI / 2;
        this.plane.receiveShadow = true;
        this.scene.add(this.plane);

        // Grid helper
        const gridHelper = new THREE.GridHelper(this.width, this.width, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    worldToGrid(x, z) {
        // Plane is centered at 0,0
        // Grid coordinates 0,0 should be top-left or whatever convention
        // Let's use 0,0 as bottom-left (-width/2, -height/2)
        const gridX = Math.floor(x + this.width / 2);
        const gridY = Math.floor(z + this.height / 2);
        return { x: gridX, y: gridY };
    }

    gridToWorld(x, y) {
        return {
            x: x - this.width / 2 + 0.5,
            z: y - this.height / 2 + 0.5
        };
    }

    isValid(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    setTile(x, y, value) {
        if (this.isValid(x, y)) {
            this.data[y * this.width + x] = value;
        }
    }

    getTile(x, y) {
        if (this.isValid(x, y)) {
            return this.data[y * this.width + x];
        }
        return -1;
    }
}
