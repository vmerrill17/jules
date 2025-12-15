// Utility functions
import * as THREE from 'three';

export function createHouseGeometry() {
    // Cube base
    const boxGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8).toNonIndexed();
    boxGeo.translate(0, 0.3, 0); // Sit on ground

    // Pyramid roof
    const coneGeo = new THREE.ConeGeometry(0.6, 0.6, 4).toNonIndexed();
    coneGeo.rotateY(Math.PI / 4); // Align corners
    coneGeo.translate(0, 0.9, 0); // Sit on box

    const count1 = boxGeo.attributes.position.count;
    const count2 = coneGeo.attributes.position.count;

    const mergedGeo = new THREE.BufferGeometry();
    const positions = new Float32Array((count1 + count2) * 3);
    const normals = new Float32Array((count1 + count2) * 3);

    // Copy box
    positions.set(boxGeo.attributes.position.array, 0);
    normals.set(boxGeo.attributes.normal.array, 0);

    // Copy cone
    positions.set(coneGeo.attributes.position.array, count1 * 3);
    normals.set(coneGeo.attributes.normal.array, count1 * 3);

    mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    return mergedGeo;
}
