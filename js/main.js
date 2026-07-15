/* ============================================================
   MAIN - Application Controller
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
const DISCOVERY_TIME_REQUIRED = 3; // Seconds needed to discover an animal

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
    console.log('🚀 Initializing Magic Window Zoo...');
    
    // 1. Setup 3D Scene
    zooScene = new ZooScene(document.getElementById('game-container'));
    
    // 2. Spawn Animals (Positioned to match the circular zones in scene.js)
    // Zone radius is 10m. Angles: 0=Front, 90=Right, 180=Back, 270=Left
    animals = [
        new Animal({
            name: 'Lion',
            fact: 'A lion\'s roar can be heard from 5 miles away.',
            color: 0xD4A017,
            size: 0.8,
            position: { x: 0, z: -10 },   // Front (Savanna)
            wanderRadius: 1.5
        }),
        new Animal({
            name: 'Deer',
            fact: 'Deer can jump up to 10 feet high.',
            color: 0x8B6914,
            size: 0.6,
            position: { x: 10, z: 0 },    // Right (Forest)
            wanderRadius: 1.5
        }),
        new Animal({
            name: 'Polar Bear',
            fact: 'Polar bears have black skin under their white fur.',
            color: 0xF0F0F0,
            size: 1.0,
            position: { x: 0, z: 10 },    // Back (Arctic)
            wanderRadius: 1.5
        }),
        new Animal({
            name: 'Penguin',
            fact: 'Penguins can drink salt water because their glands filter out the salt.',
            color: 0x222222,
            size: 0.4,
            position: { x: -10, z: 0 },   // Left (Aquatic)
            wanderRadius: 1.5
        })
    ];
    
    // Add animals to scene and tag them for raycasting
    animals.forEach(animal => zooScene.addAnimal(animal));
    
    // 3. Update UI Total Count
    document.getElementById('total-count').textContent = `/ ${animals.length}`;
    
    // 4. Hide loading, show start screen
    setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
    }, 1000);
    
    // 5. Bind UI Events
    bindEvents();
}

// ============================================================
// START EXPERIENCE (Triggered by Button Click)
// ============================================================
function startExperience() {
    const statusText = document.getElementById('status-text');
    statusText.textContent = 'Starting...';
    
    // Initialize Motion Controller (Auto-detects Desktop vs Mobile)
    motion = new MotionController({
        onUpdate: (data, instant) => {
            zooScene.setOrientation(data.alpha, data.beta, data.gamma, getDelta(), instant);
        },
        onPermission: (granted) => {
            if (!granted) {
                statusText.textContent = 'Motion denied. Use touch to drag.';
            }
        }
    });
    
    // Set dynamic guidance text based on what activated
    if (motion.isDesktop) {
        document.getElementById('guidance-icon').textContent = '🖱️';
        document.getElementById('guidance-text').textContent = 'Drag to look around';
    } else {
        document.getElementById('guidance-icon').textContent = '📱';
        document.getElementById('guidance-text').textContent = 'Move phone to look around';
    }
    
    // Transition UI
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    
    // Show guidance temporarily
    const guidance = document.getElementById('guidance');
    guidance.classList.add('show');
    setTimeout(() => guidance.classList.remove('show'), 4000);
    
    // Start render loop
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
    
    // Update scene (animals wandering, etc.)
    zooScene.update(delta);
    
    // Check what we are looking at
    handleDiscovery(delta);
    
    // Render
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
        // Looking at a NEW animal
        discoveryTarget = result;
        discoveryTimer = 0;
        
        nameEl.textContent = discoveryTarget.name;
        factEl.textContent = discoveryTarget.fact;
        popup.style.display = 'block';
        crosshair.classList.add('active');
        
        // Update top bar
        document.getElementById('animal-name').textContent = `Looking at: ${discoveryTarget.name}`;
        
    } else if (result === 'cleared') {
        // Looked away
        resetDiscoveryUI();
        
    } else if (discoveryTarget) {
        // Still looking at the SAME animal -> Increment timer
        discoveryTimer += delta;
        const progress = Math.min(discoveryTimer / DISCOVERY_TIME_REQUIRED, 1);
        
        // Update UI progress
        timerEl.textContent = `${Math.ceil(DISCOVERY_TIME_REQUIRED - discoveryTimer)}s`;
        // CSS Conic gradient for the ring
        ringEl.style.background = `conic-gradient(#F5A623 ${progress * 360}%, rgba(255,255,255,0.1) 0%)`;
        
        // Check if discovered!
        if (discoveryTimer >= DISCOVERY_TIME_REQUIRED && !discoveryTarget.isDiscovered) {
            triggerDiscovery(discoveryTarget);
        }
    }
}

function triggerDiscovery(animal) {
    animal.discover(); // Trigger run animation in animal.js
    discoveredCount++;
    
    document.getElementById('animal-count').textContent = discoveredCount;
    document.getElementById('animal-name').textContent = `Discovered: ${animal.name}!`;
    
    showToast(`🎉 Discovered ${animal.name}! (${discoveredCount}/${animals.length})`);
    
    // Check win condition
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
    // Start Button (Handles iOS permission request inside)
    document.getElementById('start-btn').addEventListener('click', () => {
        // If it's iOS, we must request permission inside a user gesture
        if (motion === null && typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            
            // Create a temporary motion controller just to ask permission, 
            // then start the real flow
            DeviceOrientationEvent.requestPermission().then(response => {
                if (response === 'granted') {
                    startExperience();
                } else {
                    document.getElementById('status-text').textContent = 'Permission denied. Using drag.';
                    startExperience(); // Will fallback to mouse/touch automatically
                }
            }).catch(() => startExperience());
        } else {
            startExperience();
        }
    });
    
    // Reset View
    document.getElementById('reset-btn').addEventListener('click', () => {
        zooScene.resetCamera();
        if (motion) motion.recalibrate();
        resetDiscoveryUI();
        showToast('🔄 View Reset');
    });
    
    // Photo Capture
    document.getElementById('camera-btn').addEventListener('click', () => {
        try {
            const dataUrl = zooScene.captureFrame();
            document.getElementById('captured-image').src = dataUrl;
            document.getElementById('photo-preview').style.display = 'flex';
        } catch (e) {
            console.error('Photo capture failed', e);
            showToast('❌ Could not take photo');
        }
    });
    
    // Photo Preview Close
    document.getElementById('preview-close-btn').addEventListener('click', () => {
        document.getElementById('photo-preview').style.display = 'none';
    });
    
    // Photo Download
    document.getElementById('preview-download-btn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'magic-zoo-photo.png';
        link.href = document.getElementById('captured-image').src;
        link.click();
        showToast('💾 Photo Saved!');
    });
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener('DOMContentLoaded', init);
