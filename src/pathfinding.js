// Flow field logic
// Simplified Flow Field: Calculates vector to target for each cell
export class Pathfinding {
    constructor(grid) {
        this.grid = grid;
        this.target = { x: 0, y: 0 }; // Default target (center of map usually)
        this.flowField = new Array(grid.width * grid.height).fill(null);
    }

    setTarget(x, y) {
        this.target = { x, y };
        this.calculateFlowField();
    }

    calculateFlowField() {
        const width = this.grid.width;
        const height = this.grid.height;
        const size = width * height;

        // Dijkstra / BFS to find distance to target
        const distanceMap = new Array(size).fill(Infinity);
        const visited = new Array(size).fill(false);
        const queue = [];

        // Target index
        const targetIdx = this.target.y * width + this.target.x;
        if (targetIdx >= 0 && targetIdx < size) {
            distanceMap[targetIdx] = 0;
            queue.push(this.target);
        }

        const dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            const currentIdx = current.y * width + current.x;

            for (const dir of dirs) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;

                if (this.grid.isValid(nx, ny)) {
                    // Check if walkable (0 = Grass)
                    // If it's a wall (1), we might treat it as obstacle or high cost.
                    // For now, let's treat Walls as Obstacles (Infinity distance)
                    // BUT enemies need to attack walls. So walls should be reachable but block movement?
                    // Actually, if enemies attack walls, walls effectively block movement until destroyed.
                    // So flow field should route around them OR point into them?
                    // If flow field routes around, enemies will walk along the wall.
                    // If flow field treats them as high cost, they might go around.
                    // Let's treat walls as obstacles for now. If path is blocked, they will get stuck (and should attack).

                    const nIdx = ny * width + nx;
                    if (this.grid.getTile(nx, ny) === 0) { // Walkable
                        if (distanceMap[nIdx] === Infinity) {
                            distanceMap[nIdx] = distanceMap[currentIdx] + 1;
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }

        // Generate Flow Vectors
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (distanceMap[idx] === Infinity) {
                    this.flowField[idx] = null; // Unreachable
                    continue;
                }

                if (x === this.target.x && y === this.target.y) {
                    this.flowField[idx] = { x: 0, y: 0 };
                    continue;
                }

                let minDist = distanceMap[idx];
                let flow = { x: 0, y: 0 };

                for (const dir of dirs) {
                    const nx = x + dir.x;
                    const ny = y + dir.y;
                    if (this.grid.isValid(nx, ny)) {
                        const nIdx = ny * width + nx;
                        const dist = distanceMap[nIdx];
                        if (dist < minDist) {
                            minDist = dist;
                            flow = dir;
                        }
                    }
                }
                this.flowField[idx] = flow;
            }
        }
    }

    getFlow(x, y) {
        if (!this.grid.isValid(x, y)) return null;
        return this.flowField[y * this.grid.width + x];
    }
}
