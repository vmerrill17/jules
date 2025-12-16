import * as THREE from 'three';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.currentMesh = null;
        this.curve = null;
        this.trackWidth = 20;
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
        } else if (type === 'figure8') {
             points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(100, 0, 100),
                new THREE.Vector3(200, 0, 0),
                new THREE.Vector3(100, 0, -100),
                new THREE.Vector3(0, 0, -200),
                new THREE.Vector3(-100, 0, -100),
            ];
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
        } else {
             // Default small circle
             points = [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(50, 0, 50),
                new THREE.Vector3(100, 0, 0),
                new THREE.Vector3(50, 0, -50),
             ];
        }

        this.curve = new THREE.CatmullRomCurve3(points);
        this.curve.closed = true;
        this.startPoint.copy(points[0]);

        // Track Shape
        const shape = new THREE.Shape();
        shape.moveTo(-this.trackWidth/2, 0);
        shape.lineTo(-this.trackWidth/2, 0.05); // Thin profile
        shape.lineTo(this.trackWidth/2, 0.05);
        shape.lineTo(this.trackWidth/2, 0);
        shape.lineTo(-this.trackWidth/2, 0);

        const extrudeSettings = { steps: 300, bevelEnabled: false, extrudePath: this.curve };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        this.currentMesh = new THREE.Mesh(geometry, material);
        this.currentMesh.receiveShadow = true;
        this.currentMesh.position.y = 0.02; // Just above ground
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

            // Basic check to avoid track collision (rough)
            const p = new THREE.Vector3(x, 0, z);
            const closest = this.getClosestPoint(p);
            if (p.distanceTo(closest) < this.trackWidth/2 + 5) continue;

            tree.position.set(x, 4, z);
            tree.castShadow = true;
            this.decorations.add(tree);
        }
    }

    // Efficiently get state of car relative to track
    // We assume 'guessU' is the previous frame's progress (0..1).
    getTrackState(position, guessU = 0) {
        if (!this.curve) return { isOnTrack: true, u: 0, center: position.clone() };

        // Search locally around guessU to find closest point
        // Divide curve into segments?
        // Or just sample 10 points around guessU

        let bestU = guessU;
        let minDst = Infinity;
        let bestPoint = new THREE.Vector3();

        // Check window of +/- 0.05
        const step = 0.002;
        const range = 0.05;

        // Handle wrap around 0/1 logic if needed, simple clamp for now or modulo

        for (let u = guessU - range; u <= guessU + range; u += step) {
            let sampleU = u;
            if (sampleU < 0) sampleU += 1;
            if (sampleU > 1) sampleU -= 1;

            const pt = this.curve.getPointAt(sampleU);
            const d = position.distanceTo(new THREE.Vector3(pt.x, position.y, pt.z)); // Project to plane

            if (d < minDst) {
                minDst = d;
                bestU = sampleU;
                bestPoint.copy(pt);
            }
        }

        // If we are VERY lost (distance huge), maybe do a full scan?
        // Optimization: Only do full scan if minDst is still large
        if (minDst > this.trackWidth * 2) {
             // Full scan (coarse)
             for (let u = 0; u <= 1; u += 0.01) {
                const pt = this.curve.getPointAt(u);
                const d = position.distanceTo(new THREE.Vector3(pt.x, position.y, pt.z));
                if (d < minDst) {
                    minDst = d;
                    bestU = u;
                    bestPoint.copy(pt);
                }
             }
        }

        return {
            isOnTrack: minDst <= (this.trackWidth / 2 + 1), // Tolerance
            u: bestU,
            center: bestPoint,
            distance: minDst
        };
    }

    getClosestPoint(position) {
        // Brute force helper
        if (!this.curve) return position;
        let best = position;
        let minDst = Infinity;
        for (let u = 0; u <= 1; u += 0.01) {
            const pt = this.curve.getPointAt(u);
            const d = position.distanceTo(new THREE.Vector3(pt.x, position.y, pt.z));
            if (d < minDst) {
                minDst = d;
                best = pt;
            }
        }
        return best;
    }

    getPointAt(u) {
        if (!this.curve) return new THREE.Vector3();
        return this.curve.getPointAt(u % 1);
    }
}
