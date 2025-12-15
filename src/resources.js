export class ResourceManager {
    constructor() {
        this.wood = 0;
        this.gold = 0;
        this.stone = 0;
        this.food = 0;
        this.population = 0;
        this.maxPopulation = 0;

        this.ui = {
            wood: document.getElementById('wood-count'),
            gold: document.getElementById('gold-count'),
            stone: document.getElementById('stone-count'),
            food: document.getElementById('food-count'),
            pop: document.getElementById('pop-count')
        };
    }

    addResource(type, amount) {
        if (type === 'wood') this.wood += amount;
        if (type === 'gold') this.gold += amount;
        if (type === 'stone') this.stone += amount;
        if (type === 'food') this.food += amount;
        if (type === 'population') this.population += amount;
        this.updateUI();
    }

    canAfford(cost) {
        return this.wood >= (cost.wood || 0) &&
               this.gold >= (cost.gold || 0) &&
               this.stone >= (cost.stone || 0) &&
               this.food >= (cost.food || 0);
    }

    pay(cost) {
        if (this.canAfford(cost)) {
            this.wood -= (cost.wood || 0);
            this.gold -= (cost.gold || 0);
            this.stone -= (cost.stone || 0);
            this.food -= (cost.food || 0);
            this.updateUI();
            return true;
        }
        return false;
    }

    updateUI() {
        if (this.ui.wood) this.ui.wood.textContent = Math.floor(this.wood);
        if (this.ui.gold) this.ui.gold.textContent = Math.floor(this.gold);
        if (this.ui.stone) this.ui.stone.textContent = Math.floor(this.stone);
        if (this.ui.food) this.ui.food.textContent = Math.floor(this.food);
        if (this.ui.pop) this.ui.pop.textContent = Math.floor(this.population) + '/' + this.maxPopulation;
    }
}
