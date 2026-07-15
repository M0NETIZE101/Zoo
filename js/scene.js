/* ============================================================
   SCENE - 3D Zoo Scene (BIRDS-EYE VIEW)
   ============================================================ */

import * as THREE from 'three';

export class ZooScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.worldGroup = null;
        this.animals = [];
        this.clouds = [];
        this.trees = [];
        this.isReady = false;
        
        // ===== BIRDS-EYE CONFIG =====
        this.SCENE_Y = -15;                    // Everything lives below camera
        this.BASE_TILT = -Math.PI / 2;         // Looking straight down
        this.tiltAmount = 0.25;                 // Sensor tilt sensitivity
        this.zoomLevel = 3;
        
        // Smoothing state
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        
        this.setupScene();
    }
    
    setupScene() {
        console.log('🦅 Setting up birds-eye zoo scene...');
        
        if (!this.container) {
            console.error('❌ Container not found!');
            return;
        }
        
        try {
            // ===== SCENE =====
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB);
            // NO FOG - want to see the whole layout clearly
            
            // ===== CAMERA =====
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
            this.camera.position.set(0, 0, 0);
            
            // ===== CRITICAL: Looking DOWN =====
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.x = this.BASE_TILT;  // Straight down
            
            // ===== RENDERER =====
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: false
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            
            this.container.appendChild(this.renderer.domElement);
            
            // ===== WORLD GROUP (everything goes here, below camera) =====
            this.worldGroup = new THREE.Group();
            this.worldGroup.position.y = this.SCENE_Y;
            this.scene.add(this.worldGroup);
            
            // Setup scene elements
            this.setupLights();
            this.setupEnvironment();
            this.setupGround();
            
            // Resize
            if (screen && screen.orientation) {
                screen.orientation.addEventListener('change', () => {
                    this.onResize();
                });
            }
            window.addEventListener('resize', () => {
                this.onResize();
            });
            
            this.isReady = true;
            console.log('✅ Birds-eye zoo scene ready');
            
        } catch (error) {
            console.error('❌ Scene setup error:', error);
        }
    }
    
    onResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    // ============================================================
    // LIGHTS
    // ============================================================
    setupLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x606080, 0.6);
        this.worldGroup.add(ambient);
        
        // Side light for shadows from above
        const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
        sun.position.set(12, 20, 8);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 60;
        sun.shadow.camera.left = -20;
        sun.shadow.camera.right = 20;
        sun.shadow.camera.top = 20;
        sun.shadow.camera.bottom = -20;
        this.worldGroup.add(sun);
        
        // Hemisphere
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3a7d44, 0.3);
        this.worldGroup.add(hemi);
    }
    
    // ============================================================
    // ENVIRONMENT
    // ============================================================
    setupEnvironment() {
        // No clouds for birds-eye view - they'd clutter the view
        // Just the sky background is enough
    }
    
    // ============================================================
    // GROUND + ZONES
    // ============================================================
    setupGround() {
        // ===== BASE GROUND =====
        const groundGeo = new THREE.PlaneGeometry(40, 40);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x5a8f3c,
            roughness: 0.9,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.worldGroup.add(ground);
        
        // ===== ENCLOSURE ZONES =====
        const zones = [
            { x: -6, z: -4, w: 5, h: 4, color: 0xc2b280, label: 'Savanna' },
            { x: 5, z: -3, w: 4, h: 5, color: 0x2d5a27, label: 'Forest' },
            { x: -4, z: 5, w: 5, h: 4, color: 0x87CEEB, label: 'Aquatic' },
            { x: 6, z: 5, w: 4, h: 4, color: 0xe8e8e8, label: 'Arctic' },
            { x: 0, z: 0, w: 3, h: 3, color: 0x8B7355, label: 'Central' },
        ];
        
        zones.forEach(z => {
            const geo = new THREE.PlaneGeometry(z.w, z.h);
            const mat = new THREE.MeshStandardMaterial({
                color: z.color,
                roughness: 0.85,
                metalness: z.label === 'Aquatic' ? 0.3 : 0.0
            });
            const patch = new THREE.Mesh(geo, mat);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(z.x, 0.01, z.z);
            patch.receiveShadow = true;
            this.worldGroup.add(patch);
        });
        
        // ===== PATHS =====
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x9e8e7e, roughness: 0.95 });
        [
            { x: 0, z: -1.5, w: 1.2, h: 8 },
            { x: -1.5, z: 0, w: 8, h: 1.2 },
        ].forEach(p => {
            const path = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), pathMat);
            path.rotation.x = -Math.PI / 2;
            path.position.set(p.x, 0.02, p.z);
            path.receiveShadow = true;
            this.worldGroup.add(path);
        });
        
        // ===== TREES (flat canopies for top-down visibility) =====
        const treePositions = [
            // Around savanna
            [-8.5, -5.5], [-8.5, -3], [-8.5, -0.5],
            [-3.5, -5.5], [-3.5, -6],
            // Around forest
            [7, -5], [7, -1], [3, -5],
            // Around aquatic
            [-6, 7], [-2, 7], [-6, 3],
            // Around arctic
            [8, 7], [4, 7], [8, 3],
            // Scattered
            [-10, 0], [10, 0], [0, -9], [0, 9],
            [-9, 8], [9, -8],
        ];
        
        treePositions.forEach(([x, z]) => this.createTree(x, z));
    }
    
    // ============================================================
    // TREES (flat canopies for top-down)
    // ============================================================
    createTree(x, z) {
        const group = new THREE.Group();
        
        // Trunk (barely visible from above)
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.08, 0.3, 5),
            new THREE.MeshStandardMaterial({ color: 0x6D4C41 })
        );
        trunk.position.y = 0.15;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Canopy - FLAT disc for top-down readability
        const radius = 0.3 + Math.random() * 0.25;
        const canopy = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius * 0.9, 0.15, 8),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.55, 0.28 + Math.random() * 0.15)
            })
        );
        canopy.position.y = 0.35;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        group.add(canopy);
        
        group.position.set(x, 0, z);
        this.worldGroup.add(group);
        this.trees.push(group);
    }
    
    // ============================================================
    // ANIMALS
    // ============================================================
    addAnimal(animal) {
        this.animals.push(animal);
        this.worldGroup.add(animal.group);
        return animal;
    }
    
    // ============================================================
    // UPDATE
    // ============================================================
    update(delta) {
        const time = performance.now() / 1000;
        this.animals.forEach(animal => animal.update(delta, time));
    }
    
    // ============================================================
    // ===== BIRDS-EYE ORIENTATION =====
    // ============================================================
    setOrientation(alpha, beta, gamma, delta = 1/60) {
        // Debug
        if (Math.random() < 0.01) {
            console.log(`🔄 Alpha: ${alpha.toFixed(1)}°, Beta: ${beta.toFixed(1)}°, Gamma: ${gamma.toFixed(1)}°`);
        }
        
        // Frame-rate independent smoothing
        const sm = 1 - Math.pow(0.945, delta * 60);
        
        // Shortest-path yaw wrapping
        let dAlpha = alpha - this.alpha;
        if (dAlpha > 180) dAlpha -= 360;
        if (dAlpha < -180) dAlpha += 360;
        this.alpha += dAlpha * sm;
        this.beta += (beta - this.beta) * sm;
        this.gamma += (gamma - this.gamma) * sm;
        
        // ===== BIRDS-EYE MAPPING =====
        // Yaw (magnetometer) = spin the map — PRIMARY CONTROL
        this.camera.rotation.y = -THREE.MathUtils.degToRad(this.alpha);
        
        // Pitch (accelerometer) = slight forward/back tilt from top-down
        // At beta=0 → perfectly top-down. At beta=30° → tilted 7.5° forward
        this.camera.rotation.x = this.BASE_TILT + THREE.MathUtils.degToRad(this.beta) * this.tiltAmount;
        
        // Roll (accelerometer) = slight bank
        this.camera.rotation.z = THREE.MathUtils.degToRad(this.gamma) * this.tiltAmount;
    }
    
    // ============================================================
    // ZOOM (FOV-based)
    // ============================================================
    setZoom(zoomDelta) {
        this.zoomLevel = Math.max(1, Math.min(5, this.zoomLevel + zoomDelta));
        // Zoom 1 = wide overview (FOV 80), Zoom 5 = close-up (FOV 30)
        this.camera.fov = 80 - (this.zoomLevel - 1) * 12.5;
        this.camera.updateProjectionMatrix();
    }
    
    // ============================================================
    // RESET
    // ============================================================
    resetCamera() {
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        this.zoomLevel = 3;
        this.camera.rotation.y = 0;
        this.camera.rotation.x = this.BASE_TILT;  // Back to straight down
        this.camera.rotation.z = 0;
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
        console.log('🔄 Camera reset to birds-eye view');
    }
    
    // ============================================================
    // RENDER
    // ============================================================
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    getRenderer() { return this.renderer; }
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    
    // ============================================================
    // DISPOSE
    // ============================================================
    dispose() {
        console.log('🧹 Disposing scene...');
        this.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        });
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        this.animals = [];
        this.trees = [];
        this.isReady = false;
        console.log('✅ Scene disposed');
    }
}