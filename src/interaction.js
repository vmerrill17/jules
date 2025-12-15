import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, camera, grid, buildingManager, selectionManager) {
        this.scene = scene;
        this.camera = camera;
        this.grid = grid;
        this.buildingManager = buildingManager;
        this.selectionManager = selectionManager;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.currentTool = null; // 'wall', 'house', etc.
        this.isDragging = false;
        this.dragStart = null; // {x, y}
        this.dragEnd = null; // {x, y}

        // Preview
        this.previewMeshes = [];
        this.maxPreviews = 50; // Max length of wall drag
        this.previewMaterialValid = new THREE.MeshStandardMaterial({ color: 0x00FF00, transparent: true, opacity: 0.5 });
        this.previewMaterialInvalid = new THREE.MeshStandardMaterial({ color: 0xFF0000, transparent: true, opacity: 0.5 });

        // Initialize pool
        const wallGeo = this.buildingManager.wallGeometry; // Reuse geometry
        for (let i = 0; i < this.maxPreviews; i++) {
            const mesh = new THREE.Mesh(wallGeo, this.previewMaterialValid);
            mesh.visible = false;
            this.scene.add(mesh);
            this.previewMeshes.push(mesh);
        }

        // Single cursor highlight
        this.cursorMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
        );
        this.cursorMesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.cursorMesh);

        // Bind events
        this.domElement = document.body; // or canvas
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Right click to cancel
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.setTool(null);
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.isDragging = false;
        this.dragStart = null;
        this.hidePreviews();
        this.cursorMesh.visible = !!tool;
    }

    getGridPos(event) {
        if (event.target.tagName !== 'CANVAS') return null;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.grid.plane);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            return this.grid.worldToGrid(point.x, point.z);
        }
        return null;
    }

    onMouseDown(event) {
        if (event.button !== 0) return; // Only left click

        const gridPos = this.getGridPos(event);
        if (!gridPos) return;

        if (this.currentTool === 'wall') {
            this.isDragging = true;
            this.dragStart = gridPos;
            this.dragEnd = gridPos;
            this.updatePreviews();
        } else if (this.currentTool) {
            // Place single building
            this.buildingManager.placeBuilding(gridPos.x, gridPos.y, this.currentTool);
        } else {
            // Select (Let SelectionManager handle it, or call it here)
            // SelectionManager has its own listener?
            // Better to centralize. Let's assume SelectionManager handles its own for now,
            // or we forward it.
            // The original code had SelectionManager attached to window.mousedown.
            // We should coordinate. If we have a tool, we consume the event.
            // If no tool, we let SelectionManager handle it.
        }
    }

    onMouseMove(event) {
        const gridPos = this.getGridPos(event);

        if (gridPos) {
            const worldPos = this.grid.gridToWorld(gridPos.x, gridPos.y);
            this.cursorMesh.position.set(worldPos.x, 0.02, worldPos.z);

            if (this.isDragging && this.currentTool === 'wall') {
                if (gridPos.x !== this.dragEnd?.x || gridPos.y !== this.dragEnd?.y) {
                    this.dragEnd = gridPos;
                    this.updatePreviews();
                }
            }
        }
    }

    onMouseUp(event) {
        if (this.isDragging && this.currentTool === 'wall') {
            const line = this.getLine(this.dragStart, this.dragEnd);
            for (const p of line) {
                this.buildingManager.placeBuilding(p.x, p.y, 'wall');
            }
            this.isDragging = false;
            this.dragStart = null;
            this.hidePreviews();
        }
    }

    getLine(start, end) {
        const points = [];
        let x0 = start.x;
        let y0 = start.y;
        const x1 = end.x;
        const y1 = end.y;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            points.push({ x: x0, y: y0 });

            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
            // Safety break
            if (points.length > 100) break;
        }
        return points;
    }

    updatePreviews() {
        if (!this.dragStart || !this.dragEnd) return;

        const line = this.getLine(this.dragStart, this.dragEnd);
        this.hidePreviews();

        for (let i = 0; i < line.length && i < this.previewMeshes.length; i++) {
            const p = line[i];
            const mesh = this.previewMeshes[i];
            const pos = this.grid.gridToWorld(p.x, p.y);

            mesh.position.set(pos.x, 0.5, pos.z);
            mesh.visible = true;

            // Check validity (not occupied)
            const occupied = this.grid.getTile(p.x, p.y) !== 0;
            mesh.material = occupied ? this.previewMaterialInvalid : this.previewMaterialValid;
        }
    }

    hidePreviews() {
        for (const mesh of this.previewMeshes) {
            mesh.visible = false;
        }
    }

    update(delta) {
        // Animation or other updates if needed
    }
}
