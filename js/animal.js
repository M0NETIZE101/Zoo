/* ============================================================
   ANIMAL - Zoo Animal Class
   ============================================================ */

import * as THREE from 'three';

export const ANIMAL_DATA = [
    { 
        type: 'lion', 
        name: '🦁 Lion', 
        fact: 'Lions live in prides and are the only big cats that are social. A male lion\'s roar can be heard up to 5 miles away!',
        color: 0xF5A623,
        size: 0.6,
        behavior: 'roam'
    },
    { 
        type: 'elephant', 
        name: '🐘 Elephant', 
        fact: 'Elephants are the largest land animals on Earth. They can communicate using infrasound that travels for miles!',
        color: 0x6D6D6D,
        size: 0.9,
        behavior: 'roam'
    },
    { 
        type: 'giraffe', 
        name: '🦒 Giraffe', 
        fact: 'Giraffes are the tallest animals, reaching up to 18 feet. They only need 5-30 minutes of sleep per day!',
        color: 0xD4A574,
        size: 0.8,
        behavior: 'stand'
    },
    { 
        type: 'tiger', 
        name: '🐅 Tiger', 
        fact: 'Tigers are the largest cat species. Each tiger has unique stripe patterns, like human fingerprints!',
        color: 0xE87D1F,
        size: 0.5,
        behavior: 'roam'
    },
    { 
        type: 'panda', 
        name: '🐼 Panda', 
        fact: 'Pandas spend 12-14 hours a day eating bamboo. They have a special wrist bone that works like a thumb!',
        color: 0xF5F5F5,
        size: 0.5,
        behavior: 'stand'
    },
    { 
        type: 'penguin', 
        name: '🐧 Penguin', 
        fact: 'Penguins are expert swimmers but cannot fly. Emperor penguins can dive deeper than 1,800 feet!',
        color: 0x1a1a1a,
        size: 0.3,
        behavior: 'waddle'
    },
    { 
        type: 'kangaroo', 
        name: '🦘 Kangaroo', 
        fact: 'Kangaroos can jump up to 30 feet in a single bound and can reach speeds of 35 mph!',
        color: 0x8D6E63,
        size: 0.5,
        behavior: 'hop'
    },
    { 
        type: 'flamingo', 
        name: '🦩 Flamingo', 
        fact: 'Flamingos get their pink color from eating shrimp and algae. They can stand on one leg for hours!',
        color: 0xFF6B8A,
        size: 0.4,
        behavior: 'stand'
    },
    { 
        type: 'wolf', 
        name: '🐺 Wolf', 
        fact: 'Wolves howl to communicate with pack members. A wolf pack can have up to 30 members!',
        color: 0x9E9E9E,
        size: 0.4,
        behavior: 'roam'
    },
    { 
        type: 'orangutan', 
        name: '🦧 Orangutan', 
        fact: 'Orangutans are one of the most intelligent primates. They use tools and can even learn sign language!',
        color: 0xD4891B,
        size: 0.5,
        behavior: 'swing'
    }
];

export class Animal {
    constructor(options = {}) {
        this.type = options.type || 'lion';
        this.name = options.name || 'Lion';
        this.fact = options.fact || 'Amazing animal!';
        this.color = options.color || 0xF5A623;
        this.size = options.size || 0.5;
        this.behavior = options.behavior || 'roam';
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.targetPosition = null;
        this.speed = 0.2 + Math.random() * 0.3;
        this.state = 'idle';
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.isDiscovered = false;
        this.hopPhase = 0;
        
        this.createModel();
        
        this.wanderTimer = 0;
        this.wanderInterval = 3000 + Math.random() * 4000;
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
        this.body.castShadow = true;
        this.group.add(this.body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(this.size * 0.22, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: this.color,
            roughness: 0.7
        });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.set(0, this.size * 0.5, this.size * 0.6);
        this.head.scale.set(1, 0.8, 0.8);
        this.group.add(this.head);
        
        // Ears (lion, tiger)
        if (this.type === 'lion' || this.type === 'tiger') {
            const earMat = new THREE.MeshStandardMaterial({ 
                color: this.type === 'lion' ? 0xD4A574 : 0xE8D5B7 
            });
            for (let i = -1; i <= 1; i += 2) {
                const ear = new THREE.Mesh(
                    new THREE.SphereGeometry(this.size * 0.08, 6, 6),
                    earMat
                );
                ear.position.set(i * this.size * 0.2, this.size * 0.6, this.size * 0.55);
                ear.scale.set(1, 0.6, 0.6);
                this.group.add(ear);
            }
        }
        
        // Trunk (elephant)
        if (this.type === 'elephant') {
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6D6D6D });
            this.trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(this.size * 0.06, this.size * 0.04, this.size * 0.25, 6),
                trunkMat
            );
            this.trunk.position.set(0, this.size * 0.3, this.size * 0.7);
            this.trunk.rotation.x = 0.2;
            this.group.add(this.trunk);
        }
        
        // Neck (giraffe)
        if (this.type === 'giraffe') {
            const neckMat = new THREE.MeshStandardMaterial({ 
                color: this.color,
                roughness: 0.7
            });
            this.neck = new THREE.Mesh(
                new THREE.CylinderGeometry(this.size * 0.1, this.size * 0.15, this.size * 0.3, 6),
                neckMat
            );
            this.neck.position.set(0, this.size * 0.5, this.size * 0.3);
            this.group.add(this.neck);
            this.head.position.set(0, this.size * 0.8, this.size * 0.5);
        }
        
        // Legs
        const legMat = new THREE.MeshStandardMaterial({ 
            color: this.type === 'elephant' ? 0x6D6D6D : 
                   this.type === 'giraffe' ? 0xD4A574 : 0x5D4037
        });
        
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        this.size * 0.05, 
                        this.size * 0.07, 
                        this.size * (this.type === 'elephant' ? 0.3 : 0.2), 
                        6
                    ),
                    legMat
                );
                leg.position.set(i * this.size * 0.15, 0, j * this.size * 0.2);
                leg.castShadow = true;
                this.group.add(leg);
                this.legs = this.legs || [];
                this.legs.push(leg);
            }
        }
        
        // Tail
        if (this.type !== 'penguin' && this.type !== 'panda' && this.type !== 'flamingo') {
            const tailMat = new THREE.MeshStandardMaterial({ color: this.color });
            this.tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.02, this.size * 0.15, 4),
                tailMat
            );
            this.tail.position.set(0, this.size * 0.2, -this.size * 0.7);
            this.tail.rotation.x = 0.3;
            this.group.add(this.tail);
        }
        
        // Special features
        if (this.type === 'giraffe') {
            const spotMat = new THREE.MeshStandardMaterial({ color: 0xD4A574 });
            for (let i = 0; i < 6; i++) {
                const spot = new THREE.Mesh(
                    new THREE.CircleGeometry(this.size * 0.05, 6),
                    spotMat
                );
                spot.position.set(
                    (Math.random() - 0.5) * this.size * 0.6,
                    this.size * 0.2 + Math.random() * this.size * 0.3,
                    (Math.random() - 0.5) * this.size * 0.3
                );
                spot.rotation.x = -Math.PI / 2;
                this.group.add(spot);
            }
        }
        
        if (this.type === 'tiger') {
            const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
            for (let i = 0; i < 8; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(this.size * 0.02, this.size * 0.01, this.size * 0.08),
                    stripeMat
                );
                stripe.position.set(
                    (Math.random() - 0.5) * this.size * 0.6,
                    this.size * 0.3,
                    (Math.random() - 0.5) * this.size * 0.8
                );
                this.group.add(stripe);
            }
        }
        
        // Glow effect
        this.glow = new THREE.Mesh(
            new THREE.SphereGeometry(this.size * 0.3, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0xF5A623,
                transparent: true,
                opacity: 0,
                wireframe: true
            })
        );
        this.glow.position.y = this.size * 0.3;
        this.group.add(this.glow);
        
        this.group.position.set(this.position.x, this.position.y, this.position.z);
    }
    
    update(time) {
        // Wandering AI
        this.wanderTimer += 16;
        if (this.wanderTimer > this.wanderInterval && this.behavior !== 'stand') {
            this.wanderTimer = 0;
            this.wanderInterval = 3000 + Math.random() * 4000;
            this.pickNewTarget();
        }
        
        // Move towards target
        if (this.targetPosition) {
            const dx = this.targetPosition.x - this.group.position.x;
            const dz = this.targetPosition.z - this.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist > 0.05) {
                const speed = this.speed * 0.02;
                this.group.position.x += (dx / dist) * speed;
                this.group.position.z += (dz / dist) * speed;
                this.state = 'walking';
                
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
        
        // Kangaroo hop
        if (this.type === 'kangaroo' && this.state === 'walking') {
            this.hopPhase += 0.08;
            const hopHeight = Math.abs(Math.sin(this.hopPhase)) * this.size * 0.2;
            this.group.position.y = hopHeight;
        }
        
        // Bob animation
        const bobAmount = this.state === 'idle' ? 0.02 : 0.04;
        const bobSpeed = this.state === 'idle' ? 1 : 2;
        this.body.position.y = this.size * 0.3 + Math.sin(time * bobSpeed + this.bobOffset) * bobAmount;
        
        // Head bob
        const headY = this.type === 'giraffe' ? this.size * 0.8 : this.size * 0.5;
        this.head.position.y = headY + Math.sin(time * bobSpeed + this.bobOffset + 0.5) * bobAmount * 0.5;
        
        // Tail wag
        if (this.tail) {
            this.tail.rotation.x = 0.3 + Math.sin(time * 1.5 + this.bobOffset) * 0.1;
        }
        
        // Trunk sway (elephant)
        if (this.trunk) {
            this.trunk.rotation.x = 0.2 + Math.sin(time * 0.8 + this.bobOffset) * 0.05;
        }
        
        // Glow pulse
        if (this.isDiscovered) {
            this.glow.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
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
        const originalY = this.group.position.y;
        this.group.position.y += 0.1;
        setTimeout(() => {
            this.group.position.y = originalY;
        }, 200);
    }
}