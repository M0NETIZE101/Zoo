/* ============================================================
   SCENE - First-Person Magic Window Zoo
   ============================================================ */

import * as THREE from 'three';

export class ZooScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animals = [];
        this.isReady = false;
        
        // Magic Window Smoothing State
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        
        // ===== DISCOVERY SYSTEM =====
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 30;
        this.screenCenter = new THREE.Vector2(0, 0);
        this.currentlyDiscovered = null;
        
        this.setupScene();
    }
    
    setupScene() {
        if (!this.container) {
            console.error('❌ Container not found!');
            return;
        }
        
        try {
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x7EC8E3);
            this.scene.fog = new THREE.FogExp2(0x7EC8E3, 0.025);
            
            // Camera
            this.camera = new THREE.PerspectiveCamera(
                70,
                window.innerWidth / window.innerHeight,
                0.1,
                100
            );
            this.camera.position.set(0, 1.6, 0);
            this.camera.rotation.order = 'YXZ';
            
            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.1;
            this.container.appendChild(this.renderer.domElement);
            
            // Build the world
            this.setupLights();
            this.setupEnvironment();
            
            window.addEventListener('resize', () => this.onResize());
            
            this.isReady = true;
            console.log('✅ First-Person Magic Window Scene Ready');
            
        } catch (error) {
            console.error('❌ Scene setup error:', error);
        }
    }
    
    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // ============================================================
    // LIGHTING
    // ============================================================
    setupLights() {
        const ambient = new THREE.AmbientLight(0x8899aa, 0.7);
        this.scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffeedd, 1.8);
        sun.position.set(15, 20, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 60;
        sun.shadow.camera.left = -25;
        sun.shadow.camera.right = 25;
        sun.shadow.camera.top = 25;
        sun.shadow.camera.bottom = -25;
        sun.shadow.bias = -0.001;
        this.scene.add(sun);
        
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.4);
        this.scene.add(hemi);
    }
    
    // ============================================================
    // ENVIRONMENT
    // ============================================================
    setupEnvironment() {
        // Ground
        const groundGeo = new THREE.CircleGeometry(50, 32);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a8c38,
            roughness: 0.95 
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Viewing platform
        const platformGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.15, 16);
        const platformMat = new THREE.MeshStandardMaterial({ color: 0x9e8e7e, roughness: 0.9 });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = 0.075;
        platform.receiveShadow = true;
        this.scene.add(platform);

        // Enclosures
        const enclosureRadius = 10;
        const zones = [
            { angle: 0,   color: 0xc2b280, name: 'Savanna'  },
            { angle: 90,  color: 0x2d5a27, name: 'Forest'   },
            { angle: 180, color: 0xdce9f0, name: 'Arctic'   },
            { angle: 270, color: 0x4a8db7, name: 'Aquatic'  },
        ];
        
        zones.forEach(zone => {
            const rad = THREE.MathUtils.degToRad(zone.angle);
            const x = Math.sin(rad) * enclosureRadius;
            const z = -Math.cos(rad) * enclosureRadius;
            
            // Ground patch
            const patchGeo = new THREE.CircleGeometry(4, 24);
            const patchMat = new THREE.MeshStandardMaterial({ 
                color: zone.color, 
                roughness: 0.85,
                metalness: zone.name === 'Aquatic' ? 0.2 : 0.0
            });
            const patch = new THREE.Mesh(patchGeo, patchMat);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(x, 0.02, z);
            patch.receiveShadow = true;
            this.scene.add(patch);
            
            // Fence
            const fenceGeo = new THREE.TorusGeometry(4, 0.1, 8, 32);
            const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 });
            const fence = new THREE.Mesh(fenceGeo, fenceMat);
            fence.rotation.x = -Math.PI / 2;
            fence.position.set(x, 0.4, z);
            fence.castShadow = true;
            this.scene.add(fence);
            
            // Border trees
            for (let i = 0; i < 5; i++) {
                const treeAngle = rad + (Math.PI / 2) + (i - 2) * 0.4;
                const treeDist = 5.5 + Math.random() * 2;
                this.createTree(
                    x + Math.sin(treeAngle) * treeDist,
                    z - Math.cos(treeAngle) * treeDist
                );
            }
        });

        // Fill trees
        const fillTreeAngles = [45, 135, 225, 315];
        fillTreeAngles.forEach(angle => {
            const rad = THREE.MathUtils.degToRad(angle);
            const dist = 5 + Math.random() * 2;
            this.createTree(Math.sin(rad) * dist, -Math.cos(rad) * dist);
        });
    }
    
    // ============================================================
    // TREES
    // ============================================================
    createTree(x, z) {
        const group = new THREE.Group();
        const height = 3 + Math.random() * 3;
        
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.25, height, 6),
            new THREE.MeshStandardMaterial({ color: 0x6D4C41 })
        );
        trunk.position.y = height / 2;
        trunk.castShadow = true;
        group.add(trunk);
        
        const canopyRadius = 1.2 + Math.random() * 0.8;
        const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(canopyRadius, 8, 8),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.6, 0.25 + Math.random() * 0.15)
            })
        );
        canopy.position.y = height + canopyRadius * 0.6;
        canopy.castShadow = true;
        group.add(canopy);
        
        group.position.set(x, 0, z);
        this.scene.add(group);
    }
    
    // ============================================================
    // ANIMALS
    // ============================================================
    addAnimal(animal) {
        animal.group.traverse((child) => {
            if (child.isMesh) {
                child.userData.animalRef = animal;
            }
        });
        
        this.animals.push(animal);
        this.scene.add(animal.group);
        return animal;
    }
    
    // ============================================================
    // ===== FIXED: DISCOVERY SYSTEM =====
    // ============================================================
    checkDiscovery() {
        // Shoot a ray from the exact center of the screen
        this.raycaster.setFromCamera(this.screenCenter, this.camera);
        
        // Check intersections with all objects in the scene
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            // Walk up the parent chain to find the animalRef we tagged in addAnimal()
            let obj = intersects[0].object;
            while (obj) {
                if (obj.userData && obj.userData.animalRef) {
                    const discoveredAnimal = obj.userData.animalRef;
                    
                    // Only trigger if it's a NEW animal being looked at
                    if (this.currentlyDiscovered !== discoveredAnimal) {
                        this.currentlyDiscovered = discoveredAnimal;
                        return discoveredAnimal;
                    }
                    return null; // Still looking at the same animal
                }
                obj = obj.parent;
            }
        }
        
        // Looking at empty space
        if (this.currentlyDiscovered) {
            this.currentlyDiscovered = null;
            return 'cleared';
        }
        
        return null;
    }
    
    // ============================================================
    // UPDATE
    // ============================================================
    update(delta) {
        const time = performance.now() / 1000;
        this.animals.forEach(animal => animal.update(delta, time));
    }
    
    // ============================================================
    // MAGIC WINDOW ORIENTATION
    // ============================================================
    setOrientation(alpha, beta, gamma, delta = 1/60, instant = false) {
        if (instant) {
            this.alpha = alpha;
            this.beta = beta;
            this.gamma = gamma;
        } else {
            const sm = 1 - Math.pow(0.945, delta * 60);
            
            let dAlpha = alpha - this.alpha;
            if (dAlpha > 180) dAlpha -= 360;
            if (dAlpha < -180) dAlpha += 360;
            
            this.alpha += dAlpha * sm;
            this.beta  += (beta  - this.beta)  * sm;
            this.gamma += (gamma - this.gamma) * sm;
        }

        this.camera.rotation.y = -THREE.MathUtils.degToRad(this.alpha);
        this.camera.rotation.x =  THREE.MathUtils.degToRad(this.beta);
        this.camera.rotation.z =  THREE.MathUtils.degToRad(this.gamma);
    }
    
    // ============================================================
    // ZOOM & RESET
    // ============================================================
    setZoom(zoomDelta) {
        // Placeholder - implement FOV zoom if needed
    }
    
    resetCamera() {
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        this.camera.rotation.y = 0;
        this.camera.rotation.x = 0;
        this.camera.rotation.z = 0;
        console.log('🔄 Camera reset');
    }
    
    // ============================================================
    // RENDER & LIFECYCLE
    // ============================================================
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    dispose() {
        this.scene.traverse((child) => {
            if (child.isMesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material?.dispose();
            }
        });
        this.renderer?.dispose();
        this.renderer?.domElement?.parentNode?.removeChild(this.renderer.domElement);
        this.animals = [];
        this.isReady = false;
    }
}
