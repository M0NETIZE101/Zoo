/* ============================================================
   MAIN - Zoo Explorer (iOS PERMISSION FIXED)
   ============================================================ */

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
const deviceChoice = document.getElementById('device-choice');
const desktopBtn = document.getElementById('desktop-btn');
const phoneBtn = document.getElementById('phone-btn');

// ============================================================
// STATE
// ============================================================
let scene = null;
let motionController = null;
let isRunning = false;
let isStarting = false;
let animals = [];
let animationFrameId = null;
let deviceType = null;

// ============================================================
// ANIMAL DATA
// ============================================================
const ANIMAL_DATA = [
    {
        name: '🐴 Horse',
        fact: 'Horses can sleep standing up! They can also run within hours of being born.',
        color: 0x8D6E63,
        size: 0.6,
        modelPath: './models/horse/horse.glb'
    },
    {
        name: '🦊 Fox',
        fact: 'Foxes are incredibly adaptable and can be found on every continent except Antarctica!',
        color: 0xE87D1F,
        size: 0.4,
        modelPath: './models/fox/fox_baby.glb'
    },
    {
        name: '🦁 Lion',
        fact: 'Lions live in prides and are the only social big cats.',
        color: 0xF5A623,
        size: 0.5,
        modelPath: null
    },
    {
        name: '🐘 Elephant',
        fact: 'Elephants are the largest land animals on Earth.',
        color: 0x6D6D6D,
        size: 0.7,
        modelPath: null
    },
    {
        name: '🦒 Giraffe',
        fact: 'Giraffes are the tallest animals, reaching up to 18 feet.',
        color: 0xD4A574,
        size: 0.6,
        modelPath: null
    },
    {
        name: '🐅 Tiger',
        fact: 'Tigers are the largest cat species with unique stripe patterns.',
        color: 0xE87D1F,
        size: 0.5,
        modelPath: null
    },
];

// ============================================================
// ANIMATION CONTROLS
// ============================================================
function getAnimationControls() {
    return {
        playAnimation: (animalIndex, animName) => {
            if (animals[animalIndex]) {
                animals[animalIndex].playAnimation(animName);
            } else {
                console.warn(`⚠️ Animal ${animalIndex} not found`);
            }
        },
        listAnimations: (animalIndex) => {
            if (animals[animalIndex] && animals[animalIndex].animationClips) {
                const clips = Object.keys(animals[animalIndex].animationClips);
                console.log(`🎬 Animations for ${animals[animalIndex].name}:`);
                clips.forEach((clip, i) => {
                    console.log(`   ${i + 1}. ${clip}`);
                });
                return clips;
            } else {
                console.warn(`⚠️ No animations found for animal ${animalIndex}`);
                return [];
            }
        },
        getAllAnimals: () => {
            console.log(`🐾 ${animals.length} animals:`);
            animals.forEach((animal, i) => {
                const hasAnim = animal.animationClips ? Object.keys(animal.animationClips).length : 0;
                console.log(`   ${i}. ${animal.name} (${hasAnim} animations)`);
            });
            return animals;
        }
    };
}

function exposeControls() {
    window.animationControls = getAnimationControls();
    console.log('✅ Animation controls exposed');
}

// ============================================================
// SHOW DEVICE CHOICE
// ============================================================
function showDeviceChoice() {
    startBtn.style.display = 'none';
    deviceChoice.style.display = 'block';
    statusText.textContent = 'Select your device type';
}

// ============================================================
// INIT
// ============================================================
async function init() {
    console.log('🔍 Initializing...');
    
    try {
        const container = document.getElementById('game-container');
        if (!container) {
            throw new Error('Game container not found!');
        }
        scene = new ZooScene(container);
        console.log('✅ Scene created');
        
        const positions = [
            { x: -2.5, z: -1 },
            { x: 2.5, z: 0.5 },
            { x: -1, z: 2.5 },
            { x: 1.5, z: -2 },
            { x: -3, z: 1.5 },
            { x: 3, z: -1.5 }
        ];
        
        ANIMAL_DATA.forEach((data, i) => {
            const pos = positions[i % positions.length];
            const animal = new Animal({
                name: data.name,
                fact: data.fact,
                color: data.color,
                size: data.size,
                position: pos,
                modelPath: data.modelPath
            });
            scene.addAnimal(animal);
            animals.push(animal);
            if (data.modelPath) {
                console.log(`🦄 Loading ${data.name} from: ${data.modelPath}`);
            }
        });
        console.log(`✅ ${animals.length} animals created`);
        
        exposeControls();
        
        loading.classList.add('hidden');
        startScreen.classList.remove('hidden');
        loadingText.textContent = '✅ Ready!';
        
        showDeviceChoice();
        
        desktopBtn.addEventListener('click', () => {
            deviceType = 'desktop';
            deviceChoice.style.display = 'none';
            startBtn.style.display = 'block';
            startBtn.textContent = '🖥️ Enter the Zoo';
            statusText.textContent = '🖥️ Desktop mode - drag to look around';
            startBtn.disabled = false;
            desktopBtn.style.borderColor = '#F5A623';
            phoneBtn.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        
        phoneBtn.addEventListener('click', () => {
            deviceType = 'phone';
            deviceChoice.style.display = 'none';
            startBtn.style.display = 'block';
            startBtn.textContent = '📱 Enter the Zoo';
            statusText.textContent = '📱 Phone mode - motion tracking';
            startBtn.disabled = false;
            phoneBtn.style.borderColor = '#F5A623';
            desktopBtn.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        
        startBtn.addEventListener('click', startExperience);
        
        console.log('📋 To test animations:');
        console.log('   window.animationControls.listAnimations(0) - Horse');
        console.log('   window.animationControls.listAnimations(1) - Fox');
        
    } catch (error) {
        console.error('❌ Error:', error);
        loadingText.textContent = '❌ Error: ' + error.message;
        loading.style.backgroundColor = '#2e1a1a';
    }
}

// ============================================================
// START EXPERIENCE (FIXED: permission requested immediately)
// ============================================================
function startExperience() {
    if (isStarting || isRunning || !deviceType) return;
    isStarting = true;
    
    console.log(`🚀 Starting experience in ${deviceType} mode...`);
    
    // ===== FIXED: If phone, create motion controller and request permission NOW =====
    if (deviceType === 'phone') {
        // Create motion controller with callbacks
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
                    console.log('ℹ️ Using touch/mouse controls');
                    if (statusText) {
                        statusText.textContent = '🖱️ Drag to look around';
                    }
                }
            }
        });
        
        // Request permission immediately (before hiding UI)
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('📱 Requesting iOS permission NOW...');
            motionController.requestIOSPermission();
        }
    }
    
    // ===== HIDE UI =====
    startScreen.classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    isRunning = true;
    
    // ===== DESKTOP MODE =====
    if (deviceType === 'desktop') {
        motionController = new MotionController({
            onUpdate: (orientation) => {
                if (scene) {
                    scene.setOrientation(
                        orientation.alpha,
                        orientation.beta,
                        orientation.gamma
                    );
                }
            }
        });
        if (motionController.setZoomCallback) {
            motionController.setZoomCallback((zoomLevel) => {
                if (scene) {
                    scene.setZoom(zoomLevel);
                }
            });
        }
        if (statusText) {
            statusText.textContent = '🖥️ Drag to look around · Scroll to zoom';
        }
    }
    
    // ===== ANIMATION LOOP =====
    let lastTime = performance.now();
    
    function animate(currentTime) {
        if (!isRunning) {
            animationFrameId = null;
            return;
        }
        
        animationFrameId = requestAnimationFrame(animate);
        const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;
        
        if (scene) {
            scene.update(delta);
            scene.render();
        }
    }
    animate(performance.now());
    
    isStarting = false;
    console.log('✅ Experience started!');
    
    setTimeout(() => {
        if (deviceType === 'desktop') {
            showToast('🖥️ Drag to look around · Scroll to zoom');
        } else {
            showToast('📱 Move your phone to look around');
        }
    }, 1000);
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimeout = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'show';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.className = '';
    }, 3000);
}

// ============================================================
// CLEANUP
// ============================================================
function dispose() {
    console.log('🧹 Disposing...');
    isRunning = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    if (motionController) {
        motionController.dispose();
        motionController = null;
    }
    
    if (scene) {
        scene.dispose();
        scene = null;
    }
    
    animals = [];
    console.log('✅ Disposed');
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', dispose);

window.__zoo = {
    scene: () => scene,
    animals: () => animals,
    controls: () => getAnimationControls(),
    dispose: dispose
};