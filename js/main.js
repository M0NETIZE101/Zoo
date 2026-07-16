/* ============================================================
   MAIN - Application Controller (FINAL)
   ============================================================ */

import { ZooScene } from './scene.js';
import { Animal } from './animal.js';
import { MotionController } from './sensors.js';

// ============================================================
// STATE
// ============================================================
let zooScene = null;
let motion = null;
let animals = [];
let discoveredCount = 0;
let animationFrameId = null;
let lastTime = 0;

// Discovery state
let discoveryTarget = null;
let discoveryTimer = 0;
const DISCOVERY_TIME_REQUIRED = 3; // Seconds

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
    console.log('🚀 Initializing Magic Window Zoo...');
    
    zooScene = new ZooScene(document.getElementById('game-container'));
    
    // Spawn Animals
    animals = [
        new Animal({
            name: 'Baby Fox',
            fact: 'A group of foxes is called a "skulk".',
            color: 0xE8731A,
            size: 0.6, // Tweak this if the model is too big/small!
            position: { x: 0, z: -10 },   // Front
            modelPath: './models/fox/fox_baby.glb',
            wanderRadius: 1.5
        }),
        new Animal({
            name: 'Horse',
            fact: 'Horses can sleep both lying down and standing up.',
            color: 0x8B4513,
            size: 0.5, // Tweak this if the model is too big/small!
            position: { x: 10, z: 0 },    // Right
            modelPath: './models/horse/horse.glb',
            wanderRadius: 1.5
        }),
        new Animal({
            name: 'Polar Bear',
            fact: 'Polar bears have black skin under their white fur.',
            color: 0xF0F0F0,
            size: 1.0,
            position: { x: 0, z: 10 },    // Back
            wanderRadius: 1.5
        }),
        new Animal({
            name: 'Penguin',
            fact: 'Penguins can drink salt water safely.',
            color: 0x222222,
            size: 0.4,
            position: { x: -10, z: 0 },   // Left
            wanderRadius: 1.5
        })
    ];
    
    animals.forEach(animal => zooScene.addAnimal(animal));
    
    // Update UI Total Count
    document.getElementById('total-count').textContent = `/ ${animals.length}`;
    
    // Hide loading
    setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
    }, 1000);
    
    bindEvents();
}

// ============================================================
// START EXPERIENCE (Handles iOS Permission Flow)
// ============================================================
function finishStart() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    
    if (motion.isDesktop) {
        document.getElementById('guidance-icon').textContent = '🖱️';
        document.getElementById('guidance-text').textContent = 'Drag to look around';
    } else {
        document.getElementById('guidance-icon').textContent = '📱';
        document.getElementById('guidance-text').textContent = 'Move phone to look around';
    }
    
    const guidance = document.getElementById('guidance');
    guidance.classList.add('show');
    setTimeout(() => guidance.classList.remove('show'), 4000);
    
    lastTime = performance.now();
    animate();
}

// ============================================================
// ANIMATION LOOP
// ============================================================
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    
    zooScene.update(delta);
    handleDiscovery(delta);
    zooScene.render();
}

function getDelta() {
    return (performance.now() - lastTime) / 1000 || 1/60;
}

// ============================================================
// DISCOVERY LOGIC
// ============================================================
function handleDiscovery(delta) {
    const crosshair = document.getElementById('crosshair');
    const popup = document.getElementById('discovery-popup');
    const nameEl = document.getElementById('discovery-name');
    const factEl = document.getElementById('discovery-fact');
    const timerEl = document.getElementById('discovery-timer');
    const ringEl = document.querySelector('.progress-ring');
    
    const result = zooScene.checkDiscovery();
    
    if (result && result !== 'cleared') {
        discoveryTarget = result;
        discoveryTimer = 0;
        
        nameEl.textContent = discoveryTarget.name;
        factEl.textContent = discoveryTarget.fact;
        popup.style.display = 'block';
        crosshair.classList.add('active');
        document.getElementById('animal-name').textContent = `Looking at: ${discoveryTarget.name}`;
        
    } else if (result === 'cleared') {
        resetDiscoveryUI();
        
    } else if (discoveryTarget) {
        discoveryTimer += delta;
        const progress = Math.min(discoveryTimer / DISCOVERY_TIME_REQUIRED, 1);
        
        timerEl.textContent = `${Math.ceil(DISCOVERY_TIME_REQUIRED - discoveryTimer)}s`;
        ringEl.style.background = `conic-gradient(#F5A623 ${progress * 360}%, rgba(255,255,255,0.1) 0%)`;
        
        if (discoveryTimer >= DISCOVERY_TIME_REQUIRED && !discoveryTarget.isDiscovered) {
            triggerDiscovery(discoveryTarget);
        }
    }
}

function triggerDiscovery(animal) {
    animal.discover();
    discoveredCount++;
    
    document.getElementById('animal-count').textContent = discoveredCount;
    document.getElementById('animal-name').textContent = `Discovered: ${animal.name}!`;
    
    showToast(`🎉 Discovered ${animal.name}! (${discoveredCount}/${animals.length})`);
    
    if (discoveredCount === animals.length) {
        setTimeout(() => showToast('🏆 You found all the animals!'), 2000);
    }
}

function resetDiscoveryUI() {
    discoveryTarget = null;
    discoveryTimer = 0;
    
    document.getElementById('discovery-popup').style.display = 'none';
    document.getElementById('crosshair').classList.remove('active');
    document.querySelector('.progress-ring').style.background = `conic-gradient(#F5A623 0%, rgba(255,255,255,0.1) 0%)`;
    document.getElementById('animal-name').textContent = 'Looking around...';
}

// ============================================================
// UI EVENTS
// ============================================================
function bindEvents() {
    document.getElementById('start-btn').addEventListener('click', () => {
        if (motion !== null) return; // Prevent double click
        
        document.getElementById('status-text').textContent = 'Starting...';
        
        const isIOS = typeof DeviceOrientationEvent !== 'undefined' && 
                      typeof DeviceOrientationEvent.requestPermission === 'function';
        
        if (isIOS) {
            motion = new MotionController({
                onUpdate: (data, instant) => {
                    zooScene.setOrientation(data.alpha, data.beta, data.gamma, getDelta(), instant);
                },
                onPermission: (granted) => {
                    finishStart();
                }
            });
            // MUST be inside user click
            motion.requestIOSPermission();
        } else {
            // Android / Desktop
            motion = new MotionController({
                onUpdate: (data, instant) => {
                    zooScene.setOrientation(data.alpha, data.beta, data.gamma, getDelta(), instant);
                }
            });
            finishStart();
        }
    });
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        zooScene.resetCamera();
        if (motion) motion.recalibrate();
        resetDiscoveryUI();
        showToast('🔄 View Reset');
    });
    
    document.getElementById('camera-btn').addEventListener('click', () => {
        try {
            const dataUrl = zooScene.captureFrame();
            document.getElementById('captured-image').src = dataUrl;
            document.getElementById('photo-preview').style.display = 'flex';
        } catch (e) {
            showToast('❌ Could not take photo');
        }
    });
    
    document.getElementById('preview-close-btn').addEventListener('click', () => {
        document.getElementById('photo-preview').style.display = 'none';
    });
    
    document.getElementById('preview-download-btn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'magic-zoo-photo.png';
        link.href = document.getElementById('captured-image').src;
        link.click();
        showToast('💾 Photo Saved!');
    });
}

// ============================================================
// TOAST
// ============================================================
let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener('DOMContentLoaded', init);
