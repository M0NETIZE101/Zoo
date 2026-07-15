/* ============================================================
   SENSORS - Motion Handling (BIRD'S EYE FIXED)
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
        
        // Zoom — available in ALL modes (not just fallback)
        this._zoomCallback = null;
        this.setZoomCallback = (callback) => {
            this._zoomCallback = callback;
        };
        
        console.log('📱 MotionController created');
        console.log('🖥️ Is desktop:', this.isDesktop);
        
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
            console.warn('❌ DeviceOrientationEvent not supported');
            this.fallbackToMouse();
            return;
        }
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('📱 iOS detected - will request permission');
            this.showStatus('📱 Tap "Enter" to request motion permission');
        } else {
            console.log('📱 Android detected - starting directly');
            this.startListening();
            
            this.fallbackTimeout = setTimeout(() => {
                if (!this.motionReceived && !this.useFallback) {
                    console.warn('⚠️ No motion after 5s - falling back');
                    this.fallbackToMouse();
                }
            }, 5000);  // Was 3000 — increased for slow devices
        }
    }
    
    requestIOSPermission() {
        console.log('📱 Requesting iOS motion permission...');
        this.permissionRequested = true;
        
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    console.log('✅ Permission granted!');
                    this.startListening();
                    if (this.onPermission) this.onPermission(true);
                } else {
                    console.warn('❌ Permission denied');
                    this.fallbackToMouse();
                    if (this.onPermission) this.onPermission(false);
                }
            })
            .catch(error => {
                console.error('❌ Permission error:', error);
                this.fallbackToMouse();
                if (this.onPermission) this.onPermission(false);
            });
    }
    
    startListening() {
        console.log('📱 Starting orientation listener...');
        this.boundHandleOrientation = this.handleOrientation.bind(this);
        window.addEventListener('deviceorientation', this.boundHandleOrientation);
        this.isActive = true;
        this.showStatus('📱 Move your phone to look around');
        
        setTimeout(() => {
            this.onUpdate({ alpha: 0, beta: 0, gamma: 0 }, false);
        }, 100);
    }
    
    handleOrientation(event) {
        if (!event) return;
        
        if (!this.motionReceived) {
            this.motionReceived = true;
            console.log('📱 First motion event received!');
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
            console.log('🧭 Calibrated to alpha:', this.calAlpha.toFixed(1));
        }
        
        // Apply calibration offset with wrapping
        let alpha = rawAlpha - this.calAlpha;
        if (alpha < -180) alpha += 360;
        if (alpha > 180) alpha -= 360;
        
        this.orientation = { alpha, beta, gamma };
        
        // false = not instant (scene will smooth)
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
        console.log('🧭 Recalibrated — current direction is now forward');
    }
    
    fallbackToMouse() {
        console.log('🖥️ Using mouse fallback');
        this.useFallback = true;
        this.isActive = true;
        this.showStatus('🖱️ Drag to look around · Scroll to zoom');
        
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let rotX = 0, rotY = 0;
        let zoomLevel = 0;
        
        const onMouseDown = (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            document.body.style.cursor = 'grabbing';
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            
            rotX += dx * 0.5;
            rotY += dy * 0.5;
            rotY = Math.max(-30, Math.min(30, rotY));  // Was ±89 — fixed for bird's eye
            
            // true = instant (skip scene smoothing, avoids double-smooth lag)
            this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };
        
        const onWheel = (e) => {
            e.preventDefault();
            zoomLevel += e.deltaY * 0.01;
            zoomLevel = Math.max(-1.5, Math.min(1.5, zoomLevel));
            if (this._zoomCallback) this._zoomCallback(zoomLevel);
        };
        
        let touchX = 0, touchY = 0;
        let isTouching = false;
        
        const onTouchStart = (e) => {
            const touch = e.touches[0];
            if (touch && !e.target.closest('button')) {
                isTouching = true;
                touchX = touch.clientX;
                touchY = touch.clientY;
            }
        };
        
        const onTouchMove = (e) => {
            if (!isTouching) return;
            const touch = e.touches[0];
            if (!touch) return;
            
            const dx = touch.clientX - touchX;
            const dy = touch.clientY - touchY;
            touchX = touch.clientX;
            touchY = touch.clientY;
            
            rotX += dx * 0.3;
            rotY += dy * 0.3;
            rotY = Math.max(-30, Math.min(30, rotY));  // Was ±89 — fixed for bird's eye
            
            this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
        };
        
        const onTouchEnd = () => { isTouching = false; };
        
        const onKeyDown = (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    rotX -= 5;
                    this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    rotX += 5;
                    this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    rotY -= 3;  // Smaller step for bird's eye
                    rotY = Math.max(-30, Math.min(30, rotY));
                    this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    rotY += 3;
                    rotY = Math.max(-30, Math.min(30, rotY));
                    this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }, true);
                    e.preventDefault();
                    break;
                case 'r': case 'R':
                    rotX = 0; rotY = 0; zoomLevel = 0;
                    this.onUpdate({ alpha: 0, beta: 0, gamma: 0 }, true);
                    if (this._zoomCallback) this._zoomCallback(0);
                    e.preventDefault();
                    break;
            }
        };
        
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('wheel', onWheel, { passive: false });
        document.addEventListener('touchstart', onTouchStart);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('keydown', onKeyDown);
        
        this._fallbackCleanup = () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('wheel', onWheel);
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.cursor = 'default';
        };
        
        console.log('✅ Desktop controls active!');
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
