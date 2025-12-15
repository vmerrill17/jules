import * as THREE from 'three';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.currentMesh = null;
        this.startPoint = new THREE.Vector3(0, 0, 0);

        // Ground Plane
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Grass
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Decorations Group
        this.decorations = new THREE.Group();
        this.scene.add(this.decorations);
    }

    loadTrack(type) {
        // Clear previous
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh.geometry.dispose();
        }

        // Clear decorations
        while(this.decorations.children.length > 0){
            this.decorations.remove(this.decorations.children[0]);
        }

        let points = [];
        if (type === 'oval') {
            points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(100, 0, 100),
                new THREE.Vector3(200, 0, 0),
                new THREE.Vector3(100, 0, -100),
            ];
            this.startPoint.set(0, 0, 0);
        } else if (type === 'figure8') {
             points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(100, 0, 100),
                new THREE.Vector3(200, 0, 0),
                new THREE.Vector3(100, 0, -100),
                new THREE.Vector3(0, 0, -200),
                new THREE.Vector3(-100, 0, -100),
            ];
            this.startPoint.set(0, 0, 0);
        } else if (type === 'complex') {
             points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(50, 0, 100),
                new THREE.Vector3(150, 0, 120),
                new THREE.Vector3(200, 0, 50),
                new THREE.Vector3(100, 0, 0),
                new THREE.Vector3(150, 0, -100),
                new THREE.Vector3(50, 0, -150),
                new THREE.Vector3(-50, 0, -50),
            ];
            this.startPoint.set(0, 0, 0);
        }

        const curve = new THREE.CatmullRomCurve3(points);
        curve.closed = true;

        // Track Shape
        const trackWidth = 20;
        const shape = new THREE.Shape();
        shape.moveTo(-trackWidth/2, 0);
        shape.lineTo(-trackWidth/2, 0.5);
        shape.lineTo(trackWidth/2, 0.5);
        shape.lineTo(trackWidth/2, 0);
        shape.lineTo(-trackWidth/2, 0);

        const extrudeSettings = { steps: 300, bevelEnabled: false, extrudePath: curve };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        this.currentMesh = new THREE.Mesh(geometry, material);
        this.currentMesh.receiveShadow = true;
        this.currentMesh.position.y = 0.1;
        this.scene.add(this.currentMesh);

        this.addDecorations();
    }

    addDecorations() {
        const treeGeo = new THREE.ConeGeometry(3, 8, 8);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x005500 });

        for (let i = 0; i < 100; i++) {
            const tree = new THREE.Mesh(treeGeo, treeMat);
            const x = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 600;
            tree.position.set(x, 4, z);
            tree.castShadow = true;
            this.decorations.add(tree);
        }
    }
}
