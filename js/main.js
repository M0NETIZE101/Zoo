/* ============================================================
   MAIN - Magic Window Zoo (First-Person)
   ============================================================ */

import { ZooScene } from './scene.js';
import { Animal } from './animal.js';
import { MotionController } from './sensors.js';

console.log('🚀 Magic Window Zoo Starting...');

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

const uiOverlay = document.getElementById('ui-overlay');
const animalCount = document.getElementById('animal-count');
const animalName = document.getElementById('animal-name');
const discoveryPopup = document.getElementById('discovery-popup');
const discoveryName = document.getElementById('discovery-name');
const discoveryFact = document.getElementById('discovery-fact');
const discoveryTimer = document.getElementById('discovery-timer');

const toast = document.getElementById('toast');
const cameraBtn = document.getElementById('camera-btn');
const resetBtn = document.getElementById('reset-btn');
const shareBtn = document.getElementById('share-btn');

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
let discoveredCount = 0;
let currentDiscovery = null;
let lookTimer = 0;
let discoveryTimeout = null;
const LOOK_REQUIRED = 2.0; // seconds needed to discover

// ============================================================
// ANIMAL DATA (First-Person Layout - Circular)
// ============================================================
const ANIMAL_DATA = [
    {
        name: '🦁 Lion',
        fact: 'Lions live in prides and are the only social big cats. A male lion\'s roar can be heard up to 5 miles away!',
        color: 0xF5A623,
        size: 0.8,
        modelPath: null,
        wanderRadius: 3.0,
        position: { x: 0, z: -10 }
    },
    {
        name: '🐘 Elephant',
        fact: 'Elephants are the largest land animals on Earth. They can communicate using infrasound that travels for miles!',
        color: 0x6D6D6D,
        size: 1.2,
        modelPath: null,
        wanderRadius: 3.0,
        position: { x: 10, z: 0 }
    },
    {
        name: '🦒 Giraffe',
        fact: 'Giraffes are the tallest animals, reaching up to 18 feet. They only need 5-30 minutes of sleep per day!',
        color: 0xD4A574,
        size: 0.9,
        modelPath: null,
        wanderRadius: 3.0,
        position: { x: 0, z: 10 }
    },
    {
        name: '🐅 Tiger',
        fact: 'Tigers are the largest cat species. Each tiger has unique stripe patterns, like human fingerprints!',
        color: 0xE87D1F,
        size: 0.7,
        modelPath: null,
        wanderRadius: 3.0,
        position: { x: -10, z: 0 }
    },
    {
        name: '🐴 Horse',
        fact: 'Horses can sleep standing up! They can also run within hours of being born.',
        color: 0x8D6E63,
        size: 0.8,
        modelPath: './models/horse/horse.glb',
        wanderRadius: 3.0,
        position: { x: -7, z: -7 }
    },
    {
        name: '🦊 Fox',
        fact: 'Foxes are incredibly adaptable and can be found on every continent except Antarctica!',
        color: 0xE87D1F,
        size: 0.5,
        modelPath: './models/fox/fox_baby.glb',
        wanderRadius: 2.5,
        position: { x: 7, z: 7 }
    },
];

// ============================================================
// ANIMATION CONTROLS (for testing)
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
// TOAST NOTIFICATION
// ============================================================
let toastTimeout = null;

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'show';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.className = '';
    }, 3000);
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
    console.log('🔍 Initializing Magic Window Zoo...');
    
    try {
        const container = document.getElementById('game-container');
        if (!container) {
            throw new Error('Game container not found!');
        }
        
        // Create scene
        scene = new ZooScene(container);
        console.log('✅ Scene created');
        
        // Create animals with positions
        ANIMAL_DATA.forEach((data) => {
            const animal = new Animal({
                name: data.name,
                fact: data.fact,
                color: data.color,
                size: data.size,
                position: data.position,
                modelPath: data.modelPath,
                wanderRadius: data.wanderRadius
            });
            scene.addAnimal(animal);
            animals.push(animal);
            
            if (data.modelPath) {
                console.log(`🦄 Loading ${data.name} from: ${data.modelPath}`);
            }
        });
        console.log(`✅ ${animals.length} animals created`);
        
        exposeControls();
        
        // Hide loading
        loading.classList.add('hidden');
        startScreen.classList.remove('hidden');
        loadingText.textContent = '✅ Ready!';
        
        // Device choice
        showDeviceChoice();
        
        desktopBtn.addEventListener('click', () => {
            deviceType = 'desktop';
            deviceChoice.style.display = 'none';
            startBtn.style.display = 'block';
            startBtn.textContent = '🖥️ Enter the Zoo';
            statusText.textContent = '🖥️ Desktop mode - drag to look around';
            desktopBtn.style.borderColor = '#F5A623';
            phoneBtn.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        
        phoneBtn.addEventListener('click', () => {
            deviceType = 'phone';
            deviceChoice.style.display = 'none';
            startBtn.style.display = 'block';
            startBtn.textContent = '📱 Enter the Zoo';
            statusText.textContent = '📱 Phone mode - motion tracking';
            phoneBtn.style.borderColor = '#F5A623';
            desktopBtn.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        
        startBtn.addEventListener('click', startExperience);
        
        // UI Controls
        cameraBtn.addEventListener('click', capturePhoto);
        resetBtn.addEventListener('click', resetView);
        shareBtn.addEventListener('click', shareExperience);
        
        console.log('📋 To test animations:');
        console.log('   window.animationControls.listAnimations(0)');
        console.log('   window.animationControls.playAnimation(0, "walk")');
        
    } catch (error) {
        console.error('❌ Error:', error);
        loadingText.textContent = '❌ Error: ' + error.message;
        loading.style.backgroundColor = '#2e1a1a';
    }
}

// ============================================================
// START EXPERIENCE
// ============================================================
function startExperience() {
    if (isStarting || isRunning || !deviceType) return;
    isStarting = true;
    
    console.log(`🚀 Starting experience in ${deviceType} mode...`);
    
    // Hide start screen, show UI
    startScreen.classList.add('hidden');
    uiOverlay.style.display = 'block';
    isRunning = true;
    
    // ===== MOTION CONTROLLER =====
    motionController = new MotionController({
        onUpdate: (orientation, instant) => {
            if (scene) {
                scene.setOrientation(
                    orientation.alpha,
                    orientation.beta,
                    orientation.gamma,
                    1/60,
                    instant || false
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
    
    // ===== SET ZOOM CALLBACK =====
    if (motionController.setZoomCallback) {
        motionController.setZoomCallback((zoomDelta) => {
            if (scene) {
                scene.setZoom(zoomDelta);
            }
        });
    }
    
    // ===== REQUEST IOS PERMISSION =====
    if (deviceType === 'phone' &&
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        console.log('📱 Requesting iOS permission...');
        motionController.requestIOSPermission();
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
            // Update scene
            scene.update(delta);
            
            // ===== DISCOVERY SYSTEM =====
            const discovered = scene.checkDiscovery();
            
            if (discovered && discovered !== 'cleared') {
                // Looking at an animal
                discoveryPopup.style.display = 'block';
                discoveryName.textContent = discovered.name;
                discoveryFact.textContent = discovered.fact;
                
                // ===== Trigger discover() ONLY ONCE when first looked at =====
                if (!discovered.isDiscovered) {
                    discovered.discover();
                    discoveredCount++;
                    animalCount.textContent = discoveredCount;
                    showToast(`🐾 Discovered ${discovered.name}!`);
                    
                    if (discoveredCount === animals.length) {
                        setTimeout(() => {
                            showToast('🎉 You found ALL the animals! Amazing!');
                        }, 500);
                    }
                }
                
                // Update animal name in top bar
                animalName.textContent = `👀 ${discovered.name}`;
                
            } else if (discovered === 'cleared') {
                // Looking at empty space
                discoveryPopup.style.display = 'none';
                animalName.textContent = '👀 Looking around';
            }
            
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
// CAPTURE PHOTO
// ============================================================
function capturePhoto() {
    if (!scene) return;
    showToast('📸 Capturing...');
    scene.render();
    const canvas = scene.getRenderer().domElement;
    const dataURL = canvas.toDataURL('image/png');
    
    const preview = document.getElementById('photo-preview');
    const img = document.getElementById('captured-image');
    if (preview && img) {
        img.src = dataURL;
        preview.style.display = 'flex';
        showToast('✅ Photo captured!');
    }
}

// ============================================================
// RESET VIEW
// ============================================================
function resetView() {
    if (scene) {
        scene.resetCamera();
        showToast('🔄 View reset');
    }
    if (motionController && motionController.recalibrate) {
        motionController.recalibrate();
    }
}

// ============================================================
// SHARE EXPERIENCE
// ============================================================
function shareExperience() {
    const data = {
        title: '🦁 Magic Window Zoo',
        text: `I discovered ${discoveredCount}/${animals.length} animals in the Magic Window Zoo! 🐾`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(data).catch(() => {});
    } else {
        navigator.clipboard?.writeText(data.text + ' ' + data.url).then(() => {
            showToast('📋 Link copied!');
        });
    }
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