/* ============================================================
   SCENE - 3D Zoo Scene
   ============================================================ */

import * as THREE from 'three';

export class ZooScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animals = [];
        
        this.setupScene();
    }
    
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        
        this.container.appendChild(this.renderer.domElement);
        
        // Lights
        this.setupLights();
        
        // Ground
        this.setupGround();
        
        // Trees
        this.setupTrees();
        
        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        console.log('✅ Zoo scene ready');
    }
    
    setupLights() {
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);
        
        const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
        sun.position.set(10, 15, 5);
        sun.castShadow = true;
        this.scene.add(sun);
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
        group.add(trunk);
        
        const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(0.25 + Math.random() * 0.15, 5, 5),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28, 0.5, 0.3 + Math.random() * 0.2)
            })
        );
        canopy.position.y = 0.4 + Math.random() * 0.1;
        group.add(canopy);
        
        group.position.set(x, -0.1, z);
        group.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        this.scene.add(group);
    }
    
    addAnimal(animal) {
        this.animals.push(animal);
        this.scene.add(animal.group);
        return animal;
    }
    
    update(time) {
        this.animals.forEach(animal => animal.update(time));
    }
    
    setOrientation(alpha, beta, gamma) {
        const yaw = -alpha * Math.PI / 180;
        const pitch = beta * Math.PI / 180;
        const roll = gamma * Math.PI / 180;
        
        this.camera.position.set(0, 1.6, 0);
        const euler = new THREE.Euler(pitch, yaw, roll, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}