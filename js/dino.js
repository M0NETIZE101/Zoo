/* ============================================================
   DINO - Dinosaur Class
   ============================================================ */

import * as THREE from 'three';

export class Dinosaur {
    constructor(options = {}) {
        this.type = options.type || 'trex';
        this.name = options.name || 'T-Rex';
        this.fact = options.fact || 'The king of dinosaurs!';
        this.color = options.color || 0x4CAF50;
        this.size = options.size || 0.5;
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.targetPosition = null;
        this.speed = 0.3 + Math.random() * 0.3;
        this.state = 'idle';
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.isDiscovered = false;
        
        // Create 3D model
        this.createModel();
        
        // Random wandering
        this.wanderTimer = 0;
        this.wanderInterval = 2000 + Math.random() * 3000;
    }
    
    createModel() {
        this.group = new THREE.Group();
        
        // Body
        const bodyGeo = new THREE.BoxGeometry(this.size * 0.8, this.size * 0.5, this.size * 1.2);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.7,
            metalness: 0.1
        });
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = this.size * 0.3;
        this.group.add(this.body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(this.size * 0.25, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.7
        });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.set(0, this.size * 0.5, this.size * 0.6);
        this.head.scale.set(1, 0.8, 0.8);
        this.group.add(this.head);
        
        // Jaw (if T-Rex)
        if (this.type === 'trex') {
            const jawGeo = new THREE.BoxGeometry(this.size * 0.2, this.size * 0.08, this.size * 0.15);
            const jawMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63 });
            this.jaw = new THREE.Mesh(jawGeo, jawMat);
            this.jaw.position.set(0, this.size * 0.42, this.size * 0.7);
            this.group.add(this.jaw);
        }
        
        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        for (let i = -1; i <= 1; i += 2) {
            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(this.size * 0.06, this.size * 0.08, this.size * 0.2, 6),
                legMat
            );
            leg.position.set(i * this.size * 0.15, 0, this.size * 0.15);
            this.group.add(leg);
            
            const legBack = new THREE.Mesh(
                new THREE.CylinderGeometry(this.size * 0.06, this.size * 0.08, this.size * 0.2, 6),
                legMat
            );
            legBack.position.set(i * this.size * 0.15, 0, -this.size * 0.15);
            this.group.add(legBack);
        }
        
        // Horns (if Triceratops)
        if (this.type === 'triceratops') {
            const hornMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63 });
            for (let i = -1; i <= 1; i += 2) {
                const horn = new THREE.Mesh(
                    new THREE.ConeGeometry(this.size * 0.04, this.size * 0.2, 6),
                    hornMat
                );
                horn.position.set(i * this.size * 0.2, this.size * 0.6, this.size * 0.5);
                horn.rotation.x = -0.3;
                horn.rotation.z = i * 0.2;
                this.group.add(horn);
            }
        }
        
        // Spikes (if Stegosaurus)
        if (this.type === 'stegosaurus') {
            const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63 });
            for (let i = -2; i <= 2; i++) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(this.size * 0.03, this.size * 0.15, 4),
                    spikeMat
                );
                spike.position.set(i * this.size * 0.15, this.size * 0.4, -this.size * 0.5);
                spike.rotation.x = 0.3;
                spike.rotation.z = i * 0.1;
                this.group.add(spike);
            }
        }
        
        // Glow effect when discovered
        this.glow = new THREE.Mesh(
            new THREE.SphereGeometry(this.size * 0.3, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0x4CAF50,
                transparent: true,
                opacity: 0,
                wireframe: true
            })
        );
        this.glow.position.y = this.size * 0.3;
        this.group.add(this.glow);
        
        this.group.position.set(this.position.x, this.position.y, this.position.z);
        this.group.scale.set(1, 1, 1);
    }
    
    update(time) {
        // Wandering AI
        this.wanderTimer += 16;
        if (this.wanderTimer > this.wanderInterval) {
            this.wanderTimer = 0;
            this.wanderInterval = 2000 + Math.random() * 3000;
            this.pickNewTarget();
        }
        
        // Move towards target
        if (this.targetPosition) {
            const dx = this.targetPosition.x - this.group.position.x;
            const dz = this.targetPosition.z - this.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist > 0.05) {
                // Move
                const speed = this.speed * 0.02;
                this.group.position.x += (dx / dist) * speed;
                this.group.position.z += (dz / dist) * speed;
                this.state = 'walking';
                
                // Rotate towards target
                const targetRot = Math.atan2(dx, dz);
                let diff = targetRot - this.rotation;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.rotation += diff * 0.05;
                this.group.rotation.y = this.rotation;
            } else {
                this.state = 'idle';
                this.targetPosition = null;
            }
        }
        
        // Bob animation (idle breathing)
        const bobAmount = this.state === 'idle' ? 0.02 : 0.04;
        const bobSpeed = this.state === 'idle' ? 1 : 2;
        this.body.position.y = this.size * 0.3 + Math.sin(time * bobSpeed + this.bobOffset) * bobAmount;
        
        // Head bob
        this.head.position.y = this.size * 0.5 + Math.sin(time * bobSpeed + this.bobOffset + 0.5) * bobAmount * 0.5;
        
        // Jaw animation (if T-Rex)
        if (this.jaw) {
            this.jaw.rotation.x = Math.sin(time * 0.5 + this.bobOffset) * 0.05 + 0.1;
        }
        
        // Glow pulse
        if (this.isDiscovered) {
            this.glow.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
        }
        
        // Legs walk animation
        if (this.state === 'walking') {
            const legSwing = Math.sin(time * 4 + this.bobOffset) * 0.2;
            // (simplified leg movement)
        }
    }
    
    pickNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 1 + Math.random() * 2;
        this.targetPosition = {
            x: this.position.x + Math.cos(angle) * distance,
            z: this.position.z + Math.sin(angle) * distance
        };
    }
    
    discover() {
        this.isDiscovered = true;
        this.glow.material.opacity = 0.3;
        
        // Celebrate! (small jump)
        const originalY = this.group.position.y;
        this.group.position.y += 0.1;
        setTimeout(() => {
            this.group.position.y = originalY;
        }, 200);
    }
    
    getPosition() {
        return this.group.position;
    }
    
    getBoundingBox() {
        const box = new THREE.Box3().setFromObject(this.group);
        return box;
    }
}