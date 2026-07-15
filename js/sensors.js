/* ============================================================
   SENSORS - Magic Window Controls (FINAL)
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
        
        // Calibration (Fixes random starting direction)
        this.calibrated = false;
        this.calAlpha = 0;
        
        // Zoom (Available in ALL modes, not just fallback)
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
            
            // Increased to 5000ms for slow Android devices
            this.fallbackTimeout = setTimeout(() => {
                if (!this.motionReceived && !this.useFallback) {
                    this.fallbackToMouse();
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
        this.boundHandleOrientation = this.handleOrientation.bind(this);
        window.addEventListener('deviceorientation', this.boundHandleOrientation);
        this.isActive = true;
        this.showStatus('Move phone to look around');
    }
    
    handleOrientation(event) {
        if (!event) return;
        
        if (!this.motionReceived) {
            this.motionReceived = true;
            if (this.fallbackTimeout) {
                clearTimeout(this.fallbackTimeout);
                this.fallbackTimeout = null;
            }
        }
        
        const rawAlpha = event.alpha !== null ? event.alpha : 0;
        const beta = event.beta !== null ? event.beta : 0;
        const gamma = event.gamma !== null ? event.gamma : 0;
        
        // Calibrate on first real reading
        if (!this.calibrated && rawAlpha !== 0) {
            this.calAlpha = rawAlpha;
            this.calibrated = true;
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
        // Make current heading the new "forward"
        this.calAlpha += this.orientation.alpha;
        if (this.calAlpha > 360) this.calAlpha -= 360;
        if (this.calAlpha < 0) this.calAlpha += 360;
        this.onUpdate({ alpha: 0, beta: this.orientation.beta, gamma: this.orientation.gamma }, false);
    }
    
    fallbackToMouse() {
        this.useFallback = true;
        this.isActive = true;
        this.showStatus('Drag to look around');
        
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let rotX = 0, rotY = 0;
        let zoomLevel = 0;
        
        const onDown = (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            const p = e.touches ? e.touches[0] : e;
            lastX = p.clientX; lastY = p.clientY;
            document.body.style.cursor = 'grabbing';
        };
        
        const onMove = (e) => {
            if (!isDragging) return;
            const p = e.touches ? e.touches[0] : e;
            
            rotX -= (p.clientX - lastX) * 0.4; // Inverted for natural drag
            rotY -= (p.clientY - lastY) * 0.4;
            rotY = Math.max(-85, Math.min(85, rotY)); // Prevent flipping
            
            lastX = p.clientX; lastY = p.clientY;
            
            // true = instant (skip scene smoothing, prevents desktop lag)
            this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
        };
        
        const onUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };
        
        const onWheel = (e) => {
            e.preventDefault();
            zoomLevel += e.deltaY * 0.01;
            zoomLevel = Math.max(-1.5, Math.min(1.5, zoomLevel));
            if (this._zoomCallback) this._zoomCallback(zoomLevel);
        };
        
        const onKeyDown = (e) => {
            switch(e.key) {
                case 'ArrowLeft': rotX += 5; this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'ArrowRight': rotX -= 5; this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'ArrowUp': rotY += 3; rotY = Math.max(-85, Math.min(85, rotY)); this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'ArrowDown': rotY -= 3; rotY = Math.max(-85, Math.min(85, rotY)); this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true); e.preventDefault(); break;
                case 'r': case 'R': 
                    rotX = 0; rotY = 0; zoomLevel = 0; 
                    this.onUpdate({ alpha: 0, beta: 0, gamma: 0 }, true); 
                    if (this._zoomCallback) this._zoomCallback(0); 
                    e.preventDefault(); 
                    break;
            }
        };
        
        document.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('wheel', onWheel, { passive: false });
        document.addEventListener('touchstart', onDown, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
        document.addEventListener('keydown', onKeyDown);
        
        this._fallbackCleanup = () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('wheel', onWheel);
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
