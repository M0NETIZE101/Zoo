/* ============================================================
   MAIN - Zoo Explorer Application
   ============================================================ */

import { ZooScene } from './scene.js';
import { Animal, ANIMAL_DATA } from './animal.js';
import { MotionController } from './sensors.js';

// ============================================================
// DOM REFS
// ============================================================
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const uiOverlay = document.getElementById('ui-overlay');
const animalCount = document.getElementById('animal-count');
const animalName = document.getElementById('animal-name');
const animalInfo = document.getElementById('animal-info');
const infoName = document.getElementById('info-name');
const infoFact = document.getElementById('info-fact');
const infoCloseBtn = document.getElementById('info-close-btn');
const cameraBtn = document.getElementById('camera-btn');
const resetBtn = document.getElementById('reset-btn');
const shareBtn = document.getElementById('share-btn');
const guidance = document.getElementById('guidance');
const toast = document.getElementById('toast');
const photoPreview = document.getElementById('photo-preview');
const capturedImage = document.getElementById('captured-image');
const previewCloseBtn = document.getElementById('preview-close-btn');
const previewShareBtn = document.getElementById('preview-share-btn');
const previewDownloadBtn = document.getElementById('preview-download-btn');
const container = document.getElementById('game-container');

// ============================================================
// STATE
// ============================================================
let scene = null;
let motionController = null;
let isRunning = false;
let discoveredCount = 0;
const totalAnimals = ANIMAL_DATA.length;
let capturedPhoto = null;
let toastTimeout = null;

// ============================================================
// HELPERS
// ============================================================
function showToast(message) {
    toast.textContent = message;
    toast.className = 'show';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.className = '';
    }, 2500);
}

function updateStatus(text) {
    statusText.textContent = text;
}

function debug(text) {
    console.log('🔍', text);
}

// ============================================================
// CREATE ANIMALS
// ============================================================
function createAnimals() {
    const positions = [
        { x: -2.5, z: -1.5 },
        { x: 3, z: 0.5 },
        { x: -1, z: 3.5 },
        { x: 1.5, z: -3 },
        { x: -3.5, z: -2 },
        { x: 3.5, z: 2.5 },
        { x: 0, z: -1 },
        { x: 4, z: -1 },
        { x: -4, z: 1 },
        { x: 2, z: 4 }
    ];
    
    const animals = [];
    
    ANIMAL_DATA.forEach((data, index) => {
        const pos = positions[index % positions.length];
        const animal = new Animal({
            type: data.type,
            name: data.name,
            fact: data.fact,
            color: data.color,
            size: data.size,
            behavior: data.behavior,
            position: { 
                x: pos.x + (Math.random() - 0.5) * 0.3, 
                y: 0, 
                z: pos.z + (Math.random() - 0.5) * 0.3 
            }
        });
        
        animal.group.userData.isAnimal = true;
        animal.group.userData.animalIndex = index;
        
        animals.push(animal);
    });
    
    return animals;
}

// ============================================================
// RAYCASTER FOR INTERACTION
// ============================================================
let raycaster = null;
let mouse = null;

function setupInteraction() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    const handleClick = (event) => {
        if (!scene || !isRunning) return;
        
        let clientX, clientY;
        if (event.touches) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, scene.getCamera());
        
        const clickables = [];
        scene.getScene().traverse((node) => {
            if (node.userData && node.userData.isAnimal) {
                clickables.push(node);
            }
        });
        
        const intersects = raycaster.intersectObjects(clickables);
        
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.userData && hit.userData.isAnimal) {
                const index = hit.userData.animalIndex;
                const animal = scene.animals[index];
                if (animal) {
                    showAnimalInfo(animal);
                }
            }
        }
    };
    
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick);
}

// ============================================================
// SHOW ANIMAL INFO
// ============================================================
function showAnimalInfo(animal) {
    if (!animal.isDiscovered) {
        animal.discover();
        discoveredCount++;
        animalCount.textContent = discoveredCount;
        showToast(`🐾 Discovered ${animal.name}!`);
        
        if (discoveredCount === totalAnimals) {
            setTimeout(() => {
                showToast('🎉 You found ALL the animals! Amazing!');
            }, 500);
        }
    }
    
    infoName.textContent = animal.name;
    infoFact.textContent = animal.fact;
    animalInfo.style.display = 'block';
    animalName.textContent = `🐾 ${animal.name}`;
}

// ============================================================
// INITIALIZE
// ============================================================
async function init() {
    debug('🚀 Initializing Zoo Explorer...');
    loadingText.textContent = '🌿 Building the zoo...';
    
    try {
        scene = new ZooScene(container);
        
        const animals = createAnimals();
        animals.forEach(animal => scene.addAnimal(animal));
        scene.animals = animals;
        
        setupInteraction();
        
        loading.classList.add('hidden');
        startScreen.classList.remove('hidden');
        updateStatus('📱 Ready to explore');
        
        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.textContent = '⏳ Starting...';
            
            startScreen.classList.add('hidden');
            uiOverlay.style.display = 'block';
            isRunning = true;
            
            guidance.classList.add('show');
            setTimeout(() => {
                guidance.classList.remove('show');
            }, 5000);
            
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
                        showToast('📱 Motion tracking active!');
                    } else {
                        showToast('🖱️ Using touch controls');
                    }
                }
            });
            
            function animate() {
                if (!isRunning) return;
                requestAnimationFrame(animate);
                const time = performance.now() / 1000;
                scene.update(time);
                scene.render();
            }
            animate();
            
            updateStatus('🌿 Exploring the Zoo');
            showToast(`🐾 Find all ${totalAnimals} animals!`);
            
            startBtn.textContent = '✅ Active';
        });
        
        infoCloseBtn.addEventListener('click', () => {
            animalInfo.style.display = 'none';
        });
        
        cameraBtn.addEventListener('click', () => {
            if (!scene) return;
            capturePhoto();
        });
        
        resetBtn.addEventListener('click', () => {
            if (scene) {
                scene.resetCamera();
                showToast('🔄 View reset');
            }
        });
        
        shareBtn.addEventListener('click', () => {
            shareExperience();
        });
        
        previewCloseBtn.addEventListener('click', () => {
            photoPreview.style.display = 'none';
        });
        
        previewShareBtn.addEventListener('click', () => {
            if (capturedPhoto) {
                sharePhoto(capturedPhoto);
            }
        });
        
        previewDownloadBtn.addEventListener('click', () => {
            if (capturedPhoto) {
                downloadPhoto(capturedPhoto);
            }
        });
        
        debug('✅ Ready!');
        
    } catch (error) {
        debug('❌ Init error: ' + error.message);
        loadingText.textContent = '❌ Error loading';
        showToast('Failed to load: ' + error.message);
    }
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
    capturedPhoto = dataURL;
    capturedImage.src = dataURL;
    photoPreview.style.display = 'flex';
    showToast('✅ Photo captured!');
}

// ============================================================
// SHARE PHOTO
// ============================================================
function sharePhoto(dataURL) {
    fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], 'zoo-explorer.png', { type: 'image/png' });
            if (navigator.share) {
                navigator.share({
                    title: '🦁 Zoo Explorer',
                    text: 'Check out my zoo discovery!',
                    files: [file]
                }).catch(() => {});
            } else {
                navigator.clipboard?.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    showToast('📋 Photo copied to clipboard!');
                }).catch(() => {
                    downloadPhoto(dataURL);
                });
            }
        });
}

// ============================================================
// DOWNLOAD PHOTO
// ============================================================
function downloadPhoto(dataURL) {
    const link = document.createElement('a');
    link.download = 'zoo-explorer.png';
    link.href = dataURL;
    link.click();
    showToast('💾 Photo downloaded!');
}

// ============================================================
// SHARE EXPERIENCE
// ============================================================
function shareExperience() {
    const data = {
        title: '🦁 Zoo Explorer',
        text: `I discovered ${discoveredCount}/${totalAnimals} animals in Zoo Explorer! Can you find them all? 🐾`,
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
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);