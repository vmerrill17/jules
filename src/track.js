import * as THREE from 'three';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.createTrack();
    }

    createTrack() {
        // Simple oval track using ExtrudeGeometry

        // Define path
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(50, 0, 50),
            new THREE.Vector3(100, 0, 0),
            new THREE.Vector3(50, 0, -50),
        ]);
        curve.closed = true;

        // Define shape (Cross section)
        const trackWidth = 20;
        const shape = new THREE.Shape();
        shape.moveTo(-trackWidth/2, 0);
        shape.lineTo(-trackWidth/2, 0.5); // Kerb
        shape.lineTo(trackWidth/2, 0.5);
        shape.lineTo(trackWidth/2, 0);
        shape.lineTo(-trackWidth/2, 0);

        const extrudeSettings = {
            steps: 200,
            bevelEnabled: false,
            extrudePath: curve
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.mesh.position.y = 0.1; // Slightly above ground
        this.scene.add(this.mesh);

        // Ground Plane
        const groundGeo = new THREE.PlaneGeometry(500, 500);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Grass
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Decorations (Trees?)
        this.addDecorations();
    }

    addDecorations() {
        // Random trees
        const treeGeo = new THREE.ConeGeometry(2, 6, 8);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x006400 });

        for (let i = 0; i < 50; i++) {
            const tree = new THREE.Mesh(treeGeo, treeMat);
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;

            // Don't place on track (simplified check: keep away from center oval area approx)
            // Or just place far out

            tree.position.set(x, 3, z);
            tree.castShadow = true;
            this.scene.add(tree);
        }
    }
}
