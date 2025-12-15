export class TechManager {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.age = 1; // 1: Dark, 2: Feudal, 3: Castle

        this.unlocks = {
            1: ['house', 'mill', 'farm', 'hunter', 'wall', 'trap'], // Basic
            2: ['goldmine', 'quarry', 'barracks', 'tower'], // Military & Advanced Resources
            3: [] // Everything + Upgrades
        };

        this.upgradeCosts = {
            2: { wood: 300, food: 300 },
            3: { wood: 500, gold: 500, stone: 200 }
        };
    }

    isUnlocked(buildingType) {
        // Town Center is always unlocked (initial placement)
        if (buildingType === 'towncenter') return true;

        // Check age unlocks
        for (let a = 1; a <= this.age; a++) {
            if (this.unlocks[a].includes(buildingType)) return true;
        }
        return false;
    }

    canUpgradeAge() {
        if (this.age >= 3) return false;
        const cost = this.upgradeCosts[this.age + 1];
        return this.resourceManager.canAfford(cost);
    }

    upgradeAge() {
        if (!this.canUpgradeAge()) return false;

        const cost = this.upgradeCosts[this.age + 1];
        if (this.resourceManager.pay(cost)) {
            this.age++;
            console.log("Advanced to Age " + this.age);
            return true;
        }
        return false;
    }

    getUpgradeCost() {
        return this.upgradeCosts[this.age + 1];
    }
}
