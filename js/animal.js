/* ============================================================
   ANIMAL - Zoo Animal with GLB Loading (FINAL)
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';

export class Animal {
    constructor(options = {}) {
        this.name = options.name || 'Animal';
        this.fact = options.fact || 'Amazing animal!';
        this.color = options.color || 0xF5A623;
        this.size = options.size || 0.5;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.modelPath = options.modelPath || null;
        
        // Keeps animals inside their enclosures
        this.wanderRadius = options.wanderRadius || 1.5;
        
        this.group = new THREE.Group();
        this.model = null;
        this.mixer = null;
        this.currentAction = null;
        this.isDiscovered = false;
        this.isLoaded = false;
        this.loading = true;
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.animationClips = {};
        this.currentAnimation = null;
        this._lastLoggedPercent = 0;
        
        // State machine prevents animation spam
        this.state = 'idle';
        this.targetPosition = null;
        this.speed = 0.3 + Math.random() * 0.2;
        this.wanderTimer = 0;
        this.wanderInterval = 3000 + Math.random() * 4000;
        
        if (this.modelPath) {
            this.loadModel();
        } else {
            this.createSimpleModel();
            this.isLoaded = true;
            this.loading = false;
        }
        
        this.group.position.set(this.position.x, 0, this.position.z);
    }
    
    loadModel() {
        console.log(`🦄 Loading model: ${this.modelPath}`);
        
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);
        
        loader.load(
            this.modelPath,
            (gltf) => {
                console.log(`✅ Model loaded: ${this.name}`);
                this.model = gltf.scene;
                
                // Scale uniformly for First-Person view
                this.model.scale.set(this.size, this.size, this.size);
                this.model.position.set(0, 0, 0);
                this.group.add(this.model);
                
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log(`🎬 Found ${gltf.animations.length} animations for ${this.name}:`);
                    gltf.animations.forEach(anim => console.log(`   - ${anim.name}`));
                    
                    this.mixer = new THREE.AnimationMixer(this.model);
                    this.animationClips = {};
                    gltf.animations.forEach(clip => {
                        this.animationClips[clip.name] = clip;
                    });
                    
                    this.playAnimation('Idle');
                }
                
                this.isLoaded = true;
                this.loading = false;
            },
            (progress) => {
                if (progress.total === 0) return;
                const percent = Math.round((progress.loaded / progress.total) * 100);
                if (percent - this._lastLoggedPercent >= 20) {
                    this._lastLoggedPercent = percent;
                    console.log(`📥 Loading ${this.name}: ${percent}%`);
                }
            },
            (error) => {
                console.error(`❌ Failed to load ${this.name}, using fallback model.`, error);
                this.createSimpleModel();
                this.isLoaded = true;
                this.loading = false;
            }
        );
    }
    
    createSimpleModel() {
        console.log(`🏗️ Creating simple model for: ${this.name}`);
        const group = new THREE.Group();
        
        const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 });
        const legMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(this.size * 0.8, this.size * 0.5, this.size * 1.2),
            bodyMat
        );
        body.position.y = this.size * 0.3;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(this.size * 0.22, 8, 8),
            bodyMat
        );
        head.position.set(0, this.size * 0.5, this.size * 0.6);
        head.castShadow = true;
        group.add(head);
        
        // 4 Legs (Fixed Y position so they don't sink into the ground)
        const legGeo = new THREE.CylinderGeometry(this.size * 0.06, this.size * 0.06, this.size * 0.2, 6);
        [[-0.2, -0.35], [0.2, -0.35], [-0.2, 0.35], [0.2, 0.35]].forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(x * this.size, this.size * 0.1, z * this.size); // Y is 0.1 (half leg height)
            leg.castShadow = true;
            group.add(leg);
        });
        
        this.group.add(group);
        this.model = group;
    }
    
    playAnimation(animationName) {
        if (!this.mixer || !this.animationClips) return;
        
        // Don't replay the exact same animation
        if (this.currentAnimation === animationName) return;
        
        let clip = null;
        const keys = Object.keys(this.animationClips);
        const searchNames = [animationName];
        
        if (animationName.toLowerCase() === 'idle') {
            searchNames.push('Idle_A', 'Idle_B', 'Idle_C', 'Idle_D', 'Idle_E', 'Idle_F');
        }
        
        // Flexible name search
        for (const searchName of searchNames) {
            for (const key of keys) {
                if (key.includes(searchName)) { clip = this.animationClips[key]; break; }
            }
            if (clip) break;
        }
        
        if (!clip) {
            for (const key of keys) {
                if (key.toLowerCase().includes(animationName.toLowerCase())) { clip = this.animationClips[key]; break; }
            }
        }
        
        // Absolute fallback: just play the first animation available
        if (!clip && keys.length > 0) clip = this.animationClips[keys[0]];
        if (!clip) return;
        
        if (this.currentAction) this.currentAction.fadeOut(0.2);
        
        const action = this.mixer.clipAction(clip);
        action.reset();
        action.fadeIn(0.2);
        action.play();
        
        this.currentAction = action;
        this.currentAnimation = clip.name;
    }
    
    update(delta, time) {
        if (this.mixer) this.mixer.update(delta);
        
        // Wander timer (pauses if discovered)
        this.wanderTimer += delta * 1000;
        if (this.wanderTimer > this.wanderInterval && this.state !== 'discovered') {
            this.wanderTimer = 0;
            this.wanderInterval = 3000 + Math.random() * 4000;
            this.pickNewTarget();
        }
        
        // Movement
        if (this.targetPosition && this.state !== 'discovered') {
            const dx = this.targetPosition.x - this.group.position.x;
            const dz = this.targetPosition.z - this.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist > 0.05) {
                const moveSpeed = this.speed * delta;
                this.group.position.x += (dx / dist) * moveSpeed;
                this.group.position.z += (dz / dist) * moveSpeed;
                
                // Smooth rotation towards target
                const targetRot = Math.atan2(dx, dz);
                let diff = targetRot - this.rotation;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.rotation += diff * Math.min(1, delta * 10);
                this.group.rotation.y = this.rotation;
                
                // Trigger walk ONCE
                if (this.state !== 'walking') {
                    this.state = 'walking';
                    this.playAnimation('Walk');
                }
            } else {
                // Trigger idle ONCE
                if (this.state !== 'idle') {
                    this.state = 'idle';
                    this.targetPosition = null;
                    this.playAnimation('Idle');
                }
            }
        }
        
        // Bob animation for simple models (no GLB)
        if (!this.mixer && this.model) {
            const bobAmount = this.state === 'walking' ? 0.04 : 0.02;
            const bobSpeed = this.state === 'walking' ? 3.0 : 1.5;
            this.model.position.y = Math.sin(time * bobSpeed + this.bobOffset) * bobAmount;
        }
    }
    
    pickNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.5 + Math.random() * this.wanderRadius;
        
        let targetX = this.position.x + Math.cos(angle) * distance;
        let targetZ = this.position.z + Math.sin(angle) * distance;
        
        // Clamp to enclosure radius
        const dx = targetX - this.position.x;
        const dz = targetZ - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > this.wanderRadius) {
            targetX = this.position.x + (dx / dist) * this.wanderRadius;
            targetZ = this.position.z + (dz / dist) * this.wanderRadius;
        }
        
        this.targetPosition = { x: targetX, z: targetZ };
    }
    
    discover() {
        this.isDiscovered = true;
        this.targetPosition = null;
        this.wanderTimer = -5000; // Pause wander for 5 seconds
        this.state = 'discovered';
        
        this.playAnimation('Run');
        
        setTimeout(() => {
            this.playAnimation('Idle');
            this.state = 'idle';
            this.wanderTimer = 0;
        }, 2000);
    }
}
