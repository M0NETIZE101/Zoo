/* ============================================================
   SCENE - 3D Zoo Scene (SIMPLIFIED & FIXED)
   ============================================================ */

import * as THREE from 'three';

export class ZooScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animals = [];
        this.objects = [];
        this.isReady = false;
        this.zoomLevel = 3;
        this.rotationX = 0;
        this.rotationY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        
        this.setupScene();
    }
    
    setupScene() {
        console.log('🦁 Setting up zoo scene...');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 15, 25);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, this.zoomLevel);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Setup everything
        this.setupLights();
        this.setupGround();
        this.setupTrees();
        
        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        this.isReady = true;
        console.log('✅ Zoo scene ready');
    }
    
    setupLights() {
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
        sun.position.set(10, 15, 5);
        sun.castShadow = true;
        this.scene.add(sun);
        
        const fill = new THREE.DirectionalLight(0x88aaff, 0.3);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);
    }
    
    setupGround() {
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.8 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        const grid = new THREE.GridHelper(20, 10, 0x2E7D32, 0x2E7D32);
        grid.position.y = -0.05;
        grid.material.transparent = true;
        grid.material.opacity = 0.2;
        this.scene.add(grid);
    }
    
    setupTrees() {
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 14;
            const z = (Math.random() - 0.5) * 14;
            if (Math.abs(x) < 3 && Math.abs(z) < 2) continue;
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
                color: new THREE.Color().setHSL(0.28, 0.5, 0.3 + Math.random() * 0.2)
            })
        );
        canopy.position.y = 0.4 + Math.random() * 0.1;
        canopy.castShadow = true;
        group.add(canopy);
        
        group.position.set(x, -0.1, z);
        group.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        this.scene.add(group);
        this.objects.push(group);
    }
    
    addAnimal(animal) {
        this.animals.push(animal);
        this.scene.add(animal.group);
        return animal;
    }
    
    update(delta) {
        const time = performance.now() / 1000;
        this.animals.forEach(animal => animal.update(delta, time));
    }
    
    // ===== FIXED: Simple, reliable camera rotation =====
    setOrientation(alpha, beta, gamma) {
        // Convert to radians
        const yaw = -alpha * Math.PI / 180;
        const pitch = beta * Math.PI / 180;
        
        // Clamp pitch
        const clampedPitch = Math.max(-1.5, Math.min(1.5, pitch));
        
        // Position camera
        const distance = this.zoomLevel || 3;
        this.camera.position.set(0, 1.6, distance);
        
        // Apply rotation using euler angles
        const euler = new THREE.Euler(clampedPitch, yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
        
        // Debug
        if (Math.random() < 0.01) {
            console.log(`🔄 Orientation: alpha=${alpha.toFixed(1)}°, beta=${beta.toFixed(1)}°, gamma=${gamma.toFixed(1)}°`);
        }
    }
    
    // ===== ZOOM =====
    setZoom(zoomDelta) {
        const minZoom = 0.8;
        const maxZoom = 5.0;
        let newZoom = (this.zoomLevel || 3) + zoomDelta * 0.5;
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        this.zoomLevel = newZoom;
        this.camera.position.z = newZoom;
    }
    
    // ===== RESET =====
    resetCamera() {
        this.zoomLevel = 3;
        this.camera.position.set(0, 1.6, 3);
        this.camera.quaternion.identity();
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    getRenderer() { return this.renderer; }
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    
    dispose() {
        // Cleanup...
        console.log('🧹 Scene disposed');
    }
}