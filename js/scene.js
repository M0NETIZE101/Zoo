/* ============================================================
   SCENE - 3D Zoo Scene (COMPLETELY FIXED)
   ============================================================ */

import * as THREE from 'three';

export class ZooScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animals = [];
        this.clouds = [];
        this.trees = [];
        this.rocks = [];
        this.isReady = false;
        this.zoomLevel = 3;
        
        // Smoothing state
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        
        this.setupScene();
    }
    
    setupScene() {
        console.log('🦁 Setting up zoo scene...');
        
        if (!this.container) {
            console.error('❌ Container not found!');
            return;
        }
        
        try {
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB);
            
            // ===== FIXED: Fog pushed much further back =====
            // Option A: Push fog back so the whole zoo is visible
            this.scene.fog = new THREE.Fog(0x87CEEB, 30, 60);
            
            // Option B: Remove fog entirely for crisp view
            // (uncomment the line below and comment the one above)
            // this.scene.fog = null;
            
            // Camera - set to origin like working code
            this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
            this.camera.position.set(0, 0, 0);
            
            // ===== CRITICAL: Set rotation order to YXZ (once is enough) =====
            this.camera.rotation.order = 'YXZ';
            
            // Renderer - removed preserveDrawingBuffer for performance
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
            console.log('✅ Zoo scene ready');
            
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
    
    setupLights() {
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
        sun.position.set(10, 15, 5);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        this.scene.add(sun);
        
        const fill = new THREE.DirectionalLight(0x88aaff, 0.3);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);
        
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3a7d44, 0.4);
        this.scene.add(hemi);
    }
    
    setupEnvironment() {
        // Simple sky gradient
        const skyGeo = new THREE.SphereGeometry(50, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color(0x4A90D9) },
                bottomColor: { value: new THREE.Color(0xB8D4E3) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        
        // ===== FIXED: Clouds stored separately =====
        for (let i = 0; i < 12; i++) {
            const cloud = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 6, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.3 + Math.random() * 0.3
                })
            );
            cloud.position.set(
                (Math.random() - 0.5) * 20,
                4 + Math.random() * 3,
                (Math.random() - 0.5) * 20 - 5
            );
            cloud.scale.set(1, 0.3 + Math.random() * 0.3, 1);
            cloud.userData.speed = 0.01 + Math.random() * 0.02;
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    }
    
    setupGround() {
        // Main ground
        const groundGeo = new THREE.PlaneGeometry(20, 20);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grid
        const grid = new THREE.GridHelper(20, 10, 0x2E7D32, 0x2E7D32);
        grid.position.y = -0.05;
        grid.material.transparent = true;
        grid.material.opacity = 0.2;
        this.scene.add(grid);
        
        // ===== FIXED: Trees stored separately =====
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 16;
            const z = (Math.random() - 0.5) * 16;
            if (Math.abs(x) < 4 && Math.abs(z) < 3) continue;
            this.createTree(x, z);
        }
    }
    
    createTree(x, z) {
        const group = new THREE.Group();
        
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.06, 0.4, 4),
            new THREE.MeshStandardMaterial({ color: 0x8D6E63 })
        );
        trunk.position.y = 0.2;
        trunk.castShadow = true;
        group.add(trunk);
        
        const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(0.25 + Math.random() * 0.15, 5, 5),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.5, 0.3 + Math.random() * 0.2)
            })
        );
        canopy.position.y = 0.4 + Math.random() * 0.1;
        canopy.scale.set(1, 0.8 + Math.random() * 0.3, 1);
        canopy.castShadow = true;
        group.add(canopy);
        
        group.position.set(x, -0.1, z);
        group.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        group.rotation.y = Math.random() * Math.PI * 2;
        
        this.scene.add(group);
        this.trees.push(group);
    }
    
    addAnimal(animal) {
        this.animals.push(animal);
        this.scene.add(animal.group);
        return animal;
    }
    
    update(delta) {
        const time = performance.now() / 1000;
        this.animals.forEach(animal => animal.update(delta, time));
        
        // ===== FIXED: Only animate clouds (not trees) =====
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed;
            if (cloud.position.x > 10) cloud.position.x = -10;
        });
    }
    
    // ============================================================
    // ===== COMPLETELY FIXED: Camera rotation with alpha wrapping =====
    // ============================================================
    setOrientation(alpha, beta, gamma, delta = 1/60) {
        // Debug: log every 5 seconds (1% chance per frame)
        if (Math.random() < 0.01) {
            console.log(`🔄 Applying: alpha=${alpha.toFixed(1)}°, beta=${beta.toFixed(1)}°, gamma=${gamma.toFixed(1)}°`);
        }
        
        // ===== FIXED: Frame-rate independent smoothing =====
        // At 60fps: factor ≈ 0.055. At 120fps: factor ≈ 0.028. Same perceived speed.
        const sm = 1 - Math.pow(0.945, delta * 60);
        
        // ===== FIXED: Shortest-path yaw (handles 0°/360° wrap) =====
        let dAlpha = alpha - this.alpha;
        if (dAlpha > 180) dAlpha -= 360;
        if (dAlpha < -180) dAlpha += 360;
        this.alpha += dAlpha * sm;
        
        // Beta and gamma don't wrap (stay in ~-180 to 180)
        this.beta += (beta - this.beta) * sm;
        this.gamma += (gamma - this.gamma) * sm;
        
        // Apply to camera (YXZ order already set in constructor)
        this.camera.rotation.y = -THREE.MathUtils.degToRad(this.alpha);
        this.camera.rotation.x = THREE.MathUtils.degToRad(this.beta);
        this.camera.rotation.z = THREE.MathUtils.degToRad(this.gamma);
    }
    
    // ============================================================
    // ===== FIXED: Zoom works via FOV =====
    // ============================================================
    setZoom(zoomDelta) {
        // Zoom in = narrower FOV, zoom out = wider FOV
        this.zoomLevel = Math.max(1, Math.min(5, this.zoomLevel + zoomDelta));
        // Map zoom 1-5 to FOV 90-40
        this.camera.fov = 90 - (this.zoomLevel - 1) * 12.5;
        this.camera.updateProjectionMatrix();
    }
    
    // ============================================================
    // Reset Camera
    // ============================================================
    resetCamera() {
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        this.zoomLevel = 3;
        this.camera.rotation.y = 0;
        this.camera.rotation.x = 0;
        this.camera.rotation.z = 0;
        this.camera.fov = 70;
        this.camera.updateProjectionMatrix();
        console.log('🔄 Camera reset');
    }
    
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    getRenderer() { return this.renderer; }
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    
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
        this.clouds = [];
        this.trees = [];
        this.rocks = [];
        this.isReady = false;
        console.log('✅ Scene disposed');
    }
}