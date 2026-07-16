/* ============================================================
   SENSORS - Magic Window Controls (TRUE ACCEL+MAG FUSION)
   ============================================================ */

export class MotionController {
    constructor(options = {}) {
        this.onUpdate = options.onUpdate || (() => {});
        this.onPermission = options.onPermission || (() => {});
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.isActive = false;
        this.isDesktop = this.checkDesktop();
        this.motionReceived = false;
        this.fallbackTimeout = null;
        
        // Calibration
        this.calibrated = false;
        this.calAlpha = 0;
        this._nullWarningShown = false;
        
        // Zoom (Available in ALL modes)
        this._zoomCallback = null;
        this.setZoomCallback = (callback) => {
            this._zoomCallback = callback;
        };
        
        if (this.isDesktop) {
            this.fallbackToMouse();
        } else {
            this.setup();
        }
    }
    
    checkDesktop() {
        const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        return !isMobile && !hasTouch;
    }
    
    setup() {
        if (typeof DeviceOrientationEvent === 'undefined') {
            this.fallbackToMouse();
            return;
        }
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.showStatus('Tap to request motion permission');
        } else {
            this.startListening();
            
            this.fallbackTimeout = setTimeout(() => {
                if (!this.motionReceived && !this.useFallback) {
                    console.warn('⚠️ No motion after 5s. Trying Generic Sensor API...');
                    this.tryGenericSensor();
                }
            }, 5000);
        }
    }
    
    requestIOSPermission() {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    this.startListening();
                    if (this.onPermission) this.onPermission(true);
                } else {
                    this.fallbackToMouse();
                    if (this.onPermission) this.onPermission(false);
                }
            })
            .catch(() => {
                this.fallbackToMouse();
                if (this.onPermission) this.onPermission(false);
            });
    }
    
    startListening() {
        console.log('📱 Starting legacy orientation listener...');
        this.boundHandleOrientation = this.handleOrientation.bind(this);
        window.addEventListener('deviceorientation', this.boundHandleOrientation);
        this.isActive = true;
    }
    
    handleOrientation(event) {
        if (!event) return;
        
        if (event.alpha === null && event.beta === null && event.gamma === null) {
            if (!this._nullWarningShown) {
                console.warn('⚠️ Legacy API returning NULL. Switching to Generic Sensor API...');
                this._nullWarningShown = true;
                if (this.boundHandleOrientation) {
                    window.removeEventListener('deviceorientation', this.boundHandleOrientation);
                }
                if (this.fallbackTimeout) {
                    clearTimeout(this.fallbackTimeout);
                    this.fallbackTimeout = null;
                }
                this.tryGenericSensor();
            }
            return;
        }
        
        if (!this.motionReceived) {
            this.motionReceived = true;
            console.log('✅ Legacy motion event received!');
            if (this.fallbackTimeout) clearTimeout(this.fallbackTimeout);
        }
        
        this.processOrientation(event.alpha || 0, event.beta || 0, event.gamma || 0);
    }
    
    // ==========================================
    // GENERIC SENSOR API ROUTER
    // ==========================================
    tryGenericSensor() {
        if (!('AbsoluteOrientationSensor' in window)) {
            console.warn('⚠️ No Generic Sensor API. Trying raw Accel + Mag...');
            this.tryAccelMagFusion();
            return;
        }
        
        try {
            console.log('📡 Trying AbsoluteOrientationSensor (Requires Gyro)...');
            const sensor = new AbsoluteOrientationSensor({ frequency: 60 });
            
            sensor.addEventListener('reading', () => {
                if (!this.motionReceived) {
                    this.motionReceived = true;
                    console.log('✅ Gyro found! Streaming data...');
                }
                const q = sensor.quaternion;
                const euler = this.quaternionToEuler(q.x, q.y, q.z, q.w);
                this.processOrientation(euler.alpha, euler.beta, euler.gamma);
            });
            
            sensor.addEventListener('error', (event) => {
                if (event.error.name === 'NotReadableError') {
                    console.warn('⚠️ NotReadableError: Phone has NO GYROSCOPE. Starting manual Accel + Mag math...');
                    this.tryAccelMagFusion();
                } else {
                    console.error('❌ Sensor Error:', event.error.name);
                    this.fallbackToMouse();
                }
            });
            
            sensor.start();
        } catch (error) {
            console.warn('⚠️ Could not start AbsoluteOrientationSensor. Trying raw sensors...');
            this.tryAccelMagFusion();
        }
    }
    
    // ==========================================
    // THE MAGIC: MANUAL ACCEL + MAG FUSION
    // Replaces the gyroscope with pure math
    // ==========================================
    tryAccelMagFusion() {
        let accelData = { x: 0, y: 0, z: 0 };
        let magData = { x: 0, y: 0, z: 0 };
        let hasAccel = false, hasMag = false;
        let fusionTimeout;
        
        try {
            console.log('🧮 Starting raw Accelerometer...');
            const accelSensor = new Accelerometer({ frequency: 60 });
            accelSensor.addEventListener('reading', () => {
                accelData.x = accelSensor.x;
                accelData.y = accelSensor.y;
                accelData.z = accelSensor.z;
                hasAccel = true;
                if (hasAccel && hasMag) this.calculateFusion(accelData, magData);
            });
            accelSensor.start();
        } catch (e) {
            console.error('❌ Accelerometer unavailable:', e);
        }
        
        try {
            console.log('🧭 Starting raw Magnetometer...');
            const magSensor = new Magnetometer({ frequency: 60 });
            magSensor.addEventListener('reading', () => {
                magData.x = magSensor.x;
                magData.y = magSensor.y;
                magData.z = magSensor.z;
                hasMag = true;
                if (hasAccel && hasMag) this.calculateFusion(accelData, magData);
            });
            magSensor.start();
        } catch (e) {
            console.error('❌ Magnetometer unavailable:', e);
        }
        
        // If neither sensor starts after 2 seconds, fall back to mouse
        fusionTimeout = setTimeout(() => {
            if (!hasAccel && !hasMag) {
                console.error('❌ Raw sensors failed to start. Falling back to drag.');
                this.fallbackToMouse();
            }
        }, 2000);
    }
    
    calculateFusion(accel, mag) {
        if (!this.motionReceived) {
            this.motionReceived = true;
            this.showStatus('Move phone to look around (Accel+Mag Mode)');
            console.log('✅ Manual Accel + Mag fusion active!');
        }
        
        // 1. PITCH & ROLL from Accelerometer (Gravity Vector)
        const p = Math.atan2(accel.x, Math.sqrt(accel.y * accel.y + accel.z * accel.z));
        const r = Math.atan2(accel.y, accel.z);
        
        const beta = p * (180 / Math.PI);          // Pitch
        const gamma = (r * (180 / Math.PI)) - 90;  // Roll (offset -90 so flat phone = 0)
        
        // 2. YAW from Magnetometer with Tilt Compensation
        // We must correct the magnetic X/Y values using the pitch/roll we just calculated
        const Xh = mag.x * Math.cos(p) + mag.z * Math.sin(p);
        const Yh = mag.x * Math.sin(r) * Math.sin(p) + mag.y * Math.cos(r) - mag.z * Math.sin(r) * Math.cos(p);
        
        let alpha = Math.atan2(-Yh, Xh) * (180 / Math.PI);
        if (alpha < 0) alpha += 360; // Keep between 0-360
        
        this.processOrientation(alpha, beta, gamma);
    }
    
    // ==========================================
    // MATH: Quaternion to Euler (For phones WITH gyro)
    // ==========================================
    quaternionToEuler(x, y, z, w) {
        let sinr_cosp = 2 * (w * x + y * z);
        let cosr_cosp = 1 - 2 * (x * x + y * y);
        let roll  = Math.atan2(sinr_cosp, cosr_cosp);
        
        let sinp = 2 * (w * y - z * x);
        if (Math.abs(sinp) >= 1) sinp = Math.sign(sinp);
        let pitch = Math.asin(sinp);
        
        let siny_cosp = 2 * (w * z + x * y);
        let cosy_cosp = 1 - 2 * (y * y + z * z);
        let yaw = Math.atan2(siny_cosp, cosy_cosp);
        
        return {
            alpha: (yaw * (180 / Math.PI)) + 180,
            beta: pitch * (180 / Math.PI),
            gamma: roll * (180 / Math.PI)
        };
    }
    
    // ==========================================
    // SHARED ORIENTATION PROCESSING
    // ==========================================
    processOrientation(rawAlpha, beta, gamma) {
        if (!this.calibrated && rawAlpha !== 0) {
            this.calAlpha = rawAlpha;
            this.calibrated = true;
            console.log('🧭 Calibrated to:', this.calAlpha.toFixed(1));
        }
        
        let alpha = rawAlpha - this.calAlpha;
        if (alpha < -180) alpha += 360;
        if (alpha > 180) alpha -= 360;
        
        this.orientation = { alpha, beta, gamma };
        
        if (this.onUpdate) {
            this.onUpdate({ alpha, beta, gamma }, false);
        }
    }
    
    recalibrate() {
        this.calAlpha += this.orientation.alpha;
        if (this.calAlpha > 360) this.calAlpha -= 360;
        if (this.calAlpha < 0) this.calAlpha += 360;
        this.onUpdate({ alpha: 0, beta: this.orientation.beta, gamma: this.orientation.gamma }, false);
    }
    
    // ==========================================
    // MOUSE / TOUCH FALLBACK
    // ==========================================
    fallbackToMouse() {
        if (this.useFallback) return; 
        this.useFallback = true;
        this.isActive = true;
        this.showStatus('Drag to look around');
        
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let rotX = 0, rotY = 0;
        
        const onDown = (e) => {
            if (e.target.closest('button') || e.target.closest('.eruda')) return;
            isDragging = true;
            const p = e.touches ? e.touches[0] : e;
            lastX = p.clientX; lastY = p.clientY;
            document.body.style.cursor = 'grabbing';
        };
        
        const onMove = (e) => {
            if (!isDragging) return;
            const p = e.touches ? e.touches[0] : e;
            rotX -= (p.clientX - lastX) * 0.4;
            rotY -= (p.clientY - lastY) * 0.4;
            rotY = Math.max(-85, Math.min(85, rotY));
            lastX = p.clientX; lastY = p.clientY;
            this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
        };
        
        const onUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };
        
        const onKeyDown = (e) => {
            switch(e.key) {
                case 'ArrowLeft': rotX += 5; this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'ArrowRight': rotX -= 5; this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'ArrowUp': rotY += 3; rotY = Math.max(-85, Math.min(85, rotY)); this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'ArrowDown': rotY -= 3; rotY = Math.max(-85, Math.min(85, rotY)); this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'r': case 'R': rotX = 0; rotY = 0; this.onUpdate({ alpha: 0, beta: 0, gamma: 0 }, true); e.preventDefault(); break;
            }
        };
        
        document.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchstart', onDown, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
        document.addEventListener('keydown', onKeyDown);
        
        this._fallbackCleanup = () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.cursor = 'default';
        };
    }
    
    showStatus(message) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) statusEl.textContent = message;
    }
    
    dispose() {
        this.isActive = false;
        if (this.boundHandleOrientation) {
            window.removeEventListener('deviceorientation', this.boundHandleOrientation);
        }
        if (this._fallbackCleanup) {
            this._fallbackCleanup();
            this._fallbackCleanup = null;
        }
        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }
    }
}
