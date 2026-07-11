/* ============================================================
   SCENE - 3D Zoo Scene Management
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
        
        this.setupScene();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 18);
        
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);
        
        this.setupLights();
        this.setupEnvironment();
        this.setupGround();
        this.setupZooEnclosures();
        
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
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 0.1;
        sun.shadow.camera.far = 30;
        sun.shadow.camera.left = -10;
        sun.shadow.camera.right = 10;
        sun.shadow.camera.top = 10;
        sun.shadow.camera.bottom = -10;
        this.scene.add(sun);
        
        const fill = new THREE.DirectionalLight(0x88aaff, 0.3);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);
        
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3a7d44, 0.4);
        this.scene.add(hemi);
    }
    
    setupEnvironment() {
        // Sky
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
        
        // Clouds
        for (let i = 0; i < 15; i++) {
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
            this.objects.push(cloud);
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
        
        // Paths (dirt paths)
        for (let i = 0; i < 3; i++) {
            const path = new THREE.Mesh(
                new THREE.PlaneGeometry(0.4, 8),
                new THREE.MeshStandardMaterial({
                    color: 0xD2A679,
                    roughness: 0.9,
                    metalness: 0
                })
            );
            path.rotation.x = -Math.PI / 2;
            path.position.set(-4 + i * 4, -0.09, 0);
            this.scene.add(path);
        }
        
        // Trees
        for (let i = 0; i < 25; i++) {
            const x = (Math.random() - 0.5) * 18;
            const z = (Math.random() - 0.5) * 18;
            if (Math.abs(x) < 5 && Math.abs(z) < 4) continue;
            this.createTree(x, z);
        }
        
        // Rocks
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 16;
            const z = (Math.random() - 0.5) * 16;
            if (Math.abs(x) < 4 && Math.abs(z) < 3) continue;
            this.createRock(x, z);
        }
    }
    
    setupZooEnclosures() {
        // Fences (simple)
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                const fence = new THREE.Mesh(
                    new THREE.BoxGeometry(0.02, 0.3, 2.5),
                    new THREE.MeshStandardMaterial({ color: 0x8D6E63 })
                );
                fence.position.set(i * 3.5, 0.15, j * 3);
                this.scene.add(fence);
            }
        }
        
        // Water pond
        const pond = new THREE.Mesh(
            new THREE.CircleGeometry(0.8, 16),
            new THREE.MeshStandardMaterial({
                color: 0x2196F3,
                transparent: true,
                opacity: 0.6,
                roughness: 0.2,
                metalness: 0.1
            })
        );
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(4.5, -0.08, 3.5);
        this.scene.add(pond);
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
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.5, 0.3 + Math.random() * 0.2)
            })
        );
        canopy.position.y = 0.4 + Math.random() * 0.1;
        canopy.scale.set(1, 0.8 + Math.random() * 0.3, 1);
        group.add(canopy);
        
        group.position.set(x, -0.1, z);
        group.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        group.rotation.y = Math.random() * Math.PI * 2;
        
        this.scene.add(group);
        this.objects.push(group);
    }
    
    createRock(x, z) {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.05 + Math.random() * 0.08, 0),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.08, 0.05, 0.3 + Math.random() * 0.2),
                roughness: 0.9,
                metalness: 0.1
            })
        );
        rock.position.set(x, -0.08, z);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        rock.scale.set(1, 0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.3);
        this.scene.add(rock);
        this.objects.push(rock);
    }
    
    addAnimal(animal) {
        this.animals.push(animal);
        this.scene.add(animal.group);
        return animal;
    }
    
    update(time) {
        this.animals.forEach(animal => animal.update(time));
        this.objects.forEach(obj => {
            if (obj.userData.speed) {
                obj.position.x += obj.userData.speed;
                if (obj.position.x > 10) obj.position.x = -10;
            }
        });
    }
    
    setOrientation(alpha, beta, gamma) {
        const yaw = -alpha * Math.PI / 180;
        const pitch = beta * Math.PI / 180;
        const roll = gamma * Math.PI / 180;
        
        this.camera.position.set(0, 1.6, 0);
        const euler = new THREE.Euler(pitch, yaw, roll, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }
    
    resetCamera() {
        this.camera.position.set(0, 1.6, 0);
        this.camera.quaternion.identity();
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    getRenderer() { return this.renderer; }
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
}