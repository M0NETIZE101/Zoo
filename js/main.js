/* ============================================================
   MAIN - Zoo Explorer
   ============================================================ */

import * as THREE from 'three';
import { ZooScene } from './scene.js';
import { Animal } from './animal.js';
import { MotionController } from './sensors.js';

console.log('🚀 Zoo Explorer Starting...');

// ============================================================
// DOM REFS
// ============================================================
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');

// ============================================================
// STATE
// ============================================================
let scene = null;
let motionController = null;
let isRunning = false;
let animals = [];

// ============================================================
// ANIMAL DATA
// ============================================================
const ANIMAL_DATA = [
    { name: '🦁 Lion', fact: 'Lions live in prides!', color: 0xF5A623, size: 0.5 },
    { name: '🐘 Elephant', fact: 'Largest land animal!', color: 0x6D6D6D, size: 0.7 },
    { name: '🦒 Giraffe', fact: 'Tallest animal!', color: 0xD4A574, size: 0.6 },
    { name: '🐅 Tiger', fact: 'Largest cat species!', color: 0xE87D1F, size: 0.5 },
    { name: '🐼 Panda', fact: 'Eats bamboo 12 hours a day!', color: 0xF5F5F5, size: 0.5 },
];

// ============================================================
// INIT
// ============================================================
async function init() {
    console.log('🔍 Initializing...');
    
    try {
        // Setup scene
        const container = document.getElementById('game-container');
        scene = new ZooScene(container);
        console.log('✅ Scene created');
        
        // Create animals
        const positions = [
            { x: -2, z: -1 },
            { x: 2, z: 0 },
            { x: -1, z: 2 },
            { x: 1.5, z: -1.5 },
            { x: -2.5, z: 1.5 }
        ];
        
        ANIMAL_DATA.forEach((data, i) => {
            const pos = positions[i % positions.length];
            const animal = new Animal({
                name: data.name,
                fact: data.fact,
                color: data.color,
                size: data.size,
                position: pos
            });
            scene.addAnimal(animal);
            animals.push(animal);
        });
        console.log('✅ Animals created');
        
        // Hide loading
        loading.classList.add('hidden');
        startScreen.classList.remove('hidden');
        loadingText.textContent = '✅ Ready!';
        
        // Start button
        startBtn.addEventListener('click', startExperience);
        
        // Show status
        if (statusText) {
            statusText.textContent = '📱 Tap "Enter the Zoo" to start';
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        loadingText.textContent = '❌ Error: ' + error.message;
    }
}

// ============================================================
// START EXPERIENCE
// ============================================================
function startExperience() {
    console.log('🚀 Starting experience...');
    startScreen.classList.add('hidden');
    isRunning = true;
    
    // Motion tracking
    motionController = new MotionController({
        onUpdate: (orientation) => {
            if (scene) {
                scene.setOrientation(
                    orientation.alpha,
                    orientation.beta,
                    orientation.gamma
                );
            }
        },
        onPermission: (granted) => {
            if (granted) {
                console.log('✅ Motion permission granted!');
                if (statusText) {
                    statusText.textContent = '📱 Motion active! Move your phone.';
                }
            } else {
                console.log('ℹ️ Using touch controls');
                if (statusText) {
                    statusText.textContent = '🖱️ Drag to look around';
                }
            }
        }
    });
    
    // Animation loop
    function animate() {
        if (!isRunning) return;
        requestAnimationFrame(animate);
        const time = performance.now() / 1000;
        if (scene) {
            scene.update(time);
            scene.render();
        }
    }
    animate();
    
    console.log('✅ Experience started!');
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);