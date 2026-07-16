/* ============================================================
   SENSORS - Magic Window Controls (GENERIC SENSOR FALLBACK)
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
            // iOS detected. Wait for main.js to call requestIOSPermission()
            this.showStatus('Tap to request motion permission');
        } else {
            // Android: Try legacy listener first
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
        console.log('📱 Requesting iOS motion permission...');
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
        
        // ==========================================
        // THE ANDROID NULL BUG CATCHER
        // ==========================================
        if (event.alpha === null && event.beta === null && event.gamma === null) {
            if (!this._nullWarningShown) {
                console.warn('⚠️ Legacy API returning NULL. Switching to Generic Sensor API...');
                this._nullWarningShown = true;
                
                // Stop listening to the broken legacy API
                if (this.boundHandleOrientation) {
                    window.removeEventListener('deviceorientation', this.boundHandleOrientation);
                }
                if (this.fallbackTimeout) {
                    clearTimeout(this.fallbackTimeout);
                    this.fallbackTimeout = null;
                }
                
                // Trigger the new API
                this.tryGenericSensor();
            }
            return;
        }
        
        if (!this.motionReceived) {
            this.motionReceived = true;
            console.log('✅ Legacy motion event received!');
            if (this.fallbackTimeout) {
                clearTimeout(this.fallbackTimeout);
                this.fallbackTimeout = null;
            }
        }
        
        this.processOrientation(event.alpha || 0, event.beta || 0, event.gamma || 0);
    }
    
    // ==========================================
    // GENERIC SENSOR API (Modern Android Fix)
    // ==========================================
    tryGenericSensor() {
        if (!('AbsoluteOrientationSensor' in window)) {
            console.error('❌ Generic Sensor API not supported on this device.');
            this.fallbackToMouse();
            return;
        }
        
        try {
            console.log('📡 Starting AbsoluteOrientationSensor...');
            const sensor = new AbsoluteOrientationSensor({ frequency: 60 });
            
            sensor.addEventListener('reading', () => {
                if (!this.motionReceived) {
                    this.motionReceived = true;
                    console.log('✅ Generic Sensor streaming data!');
                    this.showStatus('Move phone to look around');
                }
                
                // The Generic Sensor API returns a Quaternion (x, y, z, w)
                const q = sensor.quaternion;
                const euler = this.quaternionToEuler(q.x, q.y, q.z, q.w);
                
                this.processOrientation(euler.alpha, euler.beta, euler.gamma);
            });
            
            sensor.addEventListener('error', (event) => {
                console.error('❌ Generic Sensor Error:', event.error.name, event.error.message);
                this.fallbackToMouse();
            });
            
            sensor.start();
            this.isActive = true;
            this.showStatus('Accessing motion sensors...');
            
        } catch (error) {
            console.error('❌ Failed to init Generic Sensor:', error);
            this.fallbackToMouse();
        }
    }
    
    // ==========================================
    // MATH: Quaternion to Euler Angles
    // ==========================================
    quaternionToEuler(x, y, z, w) {
        // Convert Quaternion to standard Euler angles (Yaw, Pitch, Roll)
        let sinr_cosp = 2 * (w * x + y * z);
        let cosr_cosp = 1 - 2 * (x * x + y * y);
        let roll  = Math.atan2(sinr_cosp, cosr_cosp); // Gamma (tilt left/right)
        
        let sinp = 2 * (w * y - z * x);
        // Clamp to handle edge cases
        if (Math.abs(sinp) >= 1) {
            sinp = Math.sign(sinp);
        }
        let pitch = Math.asin(sinp); // Beta (tilt forward/back)
        
        let siny_cosp = 2 * (w * z + x * y);
        let cosy_cosp = 1 - 2 * (y * y + z * z);
        let yaw = Math.atan2(siny_cosp, cosy_cosp); // Alpha (compass heading)
        
        // Convert Radians to Degrees
        // Note: +180 on alpha aligns the generic sensor coordinate system with the legacy one
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
        // Calibrate on first real reading
        if (!this.calibrated && rawAlpha !== 0) {
            this.calAlpha = rawAlpha;
            this.calibrated = true;
            console.log('🧭 Calibrated to:', this.calAlpha.toFixed(1));
        }
        
        // Apply calibration offset with wrapping
        let alpha = rawAlpha - this.calAlpha;
        if (alpha < -180) alpha += 360;
        if (alpha > 180) alpha -= 360;
        
        this.orientation = { alpha, beta, gamma };
        
        // false = not instant (scene will apply smoothing)
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
        if (this.useFallback) return; // Prevent double-binding
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
                case 'r': case 'R': 
                    rotX = 0; rotY = 0; 
                    this.onUpdate({ alpha: 0, beta: 0, gamma: 0 }, true); 
                    e.preventDefault(); 
                    break;
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
