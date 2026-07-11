/* ============================================================
   ANIMAL - Zoo Animal Class
   ============================================================ */

import * as THREE from 'three';

export class Animal {
    constructor(options = {}) {
        this.name = options.name || 'Animal';
        this.fact = options.fact || 'Amazing animal!';
        this.color = options.color || 0xF5A623;
        this.size = options.size || 0.5;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.isDiscovered = false;
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        
        this.createModel();
    }
    
    createModel() {
        this.group = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(this.size * 0.8, this.size * 0.5, this.size * 1.2),
            new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 })
        );
        body.position.y = this.size * 0.3;
        body.castShadow = true;
        this.group.add(body);
        
        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(this.size * 0.22, 8, 8),
            new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7 })
        );
        head.position.set(0, this.size * 0.5, this.size * 0.6);
        this.group.add(head);
        
        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(this.size * 0.05, this.size * 0.07, this.size * 0.2, 6),
                    legMat
                );
                leg.position.set(i * this.size * 0.15, 0, j * this.size * 0.2);
                leg.castShadow = true;
                this.group.add(leg);
            }
        }
        
        this.group.position.set(this.position.x, 0, this.position.z);
    }
    
    update(time) {
        // Simple bob animation
        const bobAmount = 0.02;
        this.group.position.y = Math.sin(time * 1.5 + this.bobOffset) * bobAmount;
        
        // Rotation
        this.group.rotation.y = this.rotation;
        this.rotation += 0.001;
    }
}