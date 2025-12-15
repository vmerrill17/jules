// Handles Day/Night timer and phase switching
import * as THREE from 'three';

export class GameLoop {
    constructor(scene, grid, resourceManager, enemyManager) {
        this.scene = scene;
        this.grid = grid;
        this.resourceManager = resourceManager;
        this.enemyManager = enemyManager;
        this.phase = 'day'; // 'day' or 'night'
        this.timer = 120; // 2 minutes for day
        this.dayCount = 1;

        // UI Elements
        this.phaseElement = document.getElementById('phase-name');
        this.timeElement = document.getElementById('time-remaining');
        this.nightBtn = document.getElementById('btn-night');

        if (this.nightBtn) {
            this.nightBtn.addEventListener('click', () => this.startNight());
        }
    }

    update(delta) {
        this.timer -= delta;
        if (this.timer <= 0) {
            this.togglePhase();
        }
        this.updateUI();

        // Passive Income
        if (this.phase === 'day') {
            // Assume 1 wood per second per mill?
            // Need reference to building manager or mills.
            // For now, let's keep it simple: Main loop handles time, but we need to track income.
            // Instead of passing BuildingManager here, let's rely on ResourceManager having a list of producers or update it elsewhere.
            // Or better: BuildingManager updates income.
        }
    }

    togglePhase() {
        if (this.phase === 'day') {
            this.startNight();
        } else {
            this.startDay();
        }
    }

    startNight() {
        this.phase = 'night';
        this.timer = 60; // 1 minute night
        this.scene.background = new THREE.Color(0x000033); // Night sky

        // Find Directional Light and dim it
        const dirLight = this.scene.children.find(c => c.isDirectionalLight);
        if (dirLight) dirLight.intensity = 0.2;

        const ambientLight = this.scene.children.find(c => c.isAmbientLight);
        if (ambientLight) ambientLight.intensity = 0.2;

        if (this.enemyManager) this.enemyManager.setNight(true);

        console.log("Night started");
    }

    startDay() {
        this.phase = 'day';
        this.dayCount++;
        this.timer = 120;
        this.scene.background = new THREE.Color(0x87CEEB); // Day sky

        // Restore lights
        const dirLight = this.scene.children.find(c => c.isDirectionalLight);
        if (dirLight) dirLight.intensity = 0.8;

        const ambientLight = this.scene.children.find(c => c.isAmbientLight);
        if (ambientLight) ambientLight.intensity = 0.6;

        if (this.enemyManager) this.enemyManager.setNight(false);

        console.log("Day started");
    }

    updateUI() {
        if (this.phaseElement) this.phaseElement.textContent = `${this.phase.toUpperCase()} ${this.dayCount}`;
        if (this.timeElement) {
            const minutes = Math.floor(this.timer / 60);
            const seconds = Math.floor(this.timer % 60);
            this.timeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
    }
}
