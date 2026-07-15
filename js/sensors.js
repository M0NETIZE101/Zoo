/* ============================================================
   SENSORS - Motion Handling (SIMPLIFIED)
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
        
        console.log('📱 MotionController created');
        console.log('🖥️ Is desktop:', this.isDesktop);
        console.log('🔍 User Agent:', navigator.userAgent);
        
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
        
        console.log('📱 DeviceOrientationEvent available');
        
        // Check if iOS (needs permission)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('📱 iOS detected - will request permission');
            // iOS: wait for requestIOSPermission() call
            this.showStatus('📱 Tap "Enter" to request motion permission');
        } else {
            // Android: start immediately
            console.log('📱 Android detected - starting directly');
            this.startListening();
            
            // Fallback: if no motion after 3s, use mouse
            this.fallbackTimeout = setTimeout(() => {
                if (!this.motionReceived && !this.useFallback) {
                    console.warn('⚠️ No motion after 3s - falling back');
                    this.fallbackToMouse();
                }
            }, 3000);
        }
    }
    
    requestIOSPermission() {
        console.log('📱 Requesting iOS motion permission...');
        this.permissionRequested = true;
        
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                console.log('📱 Permission response:', response);
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
        console.log('✅ Motion tracking active');
        
        // Send an initial update (so camera doesn't stay at 0)
        setTimeout(() => {
            this.onUpdate({ alpha: 0, beta: 0, gamma: 0 });
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
        
        // Get values
        const alpha = event.alpha !== null ? event.alpha : 0;
        const beta = event.beta !== null ? event.beta : 0;
        const gamma = event.gamma !== null ? event.gamma : 0;
        
        // Log every few seconds
        if (Math.random() < 0.01) {
            console.log(`🔄 Raw: alpha=${alpha.toFixed(1)}, beta=${beta.toFixed(1)}, gamma=${gamma.toFixed(1)}`);
        }
        
        // Update orientation
        this.orientation = { alpha, beta, gamma };
        
        // Send to scene
        if (this.onUpdate) {
            this.onUpdate({ alpha, beta, gamma });
        }
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
        
        // Mouse drag
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
            rotY = Math.max(-89, Math.min(89, rotY));
            
            this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 });
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };
        
        // Scroll
        const onWheel = (e) => {
            e.preventDefault();
            zoomLevel += e.deltaY * 0.01;
            zoomLevel = Math.max(-1.5, Math.min(1.5, zoomLevel));
            if (this._zoomCallback) this._zoomCallback(zoomLevel);
        };
        
        // Touch drag
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
            rotY = Math.max(-89, Math.min(89, rotY));
            
            this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 });
        };
        
        const onTouchEnd = () => { isTouching = false; };
        
        // Keyboard
        const onKeyDown = (e) => {
            switch(e.key) {
                case 'ArrowLeft': rotX -= 5; this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }); e.preventDefault(); break;
                case 'ArrowRight': rotX += 5; this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }); e.preventDefault(); break;
                case 'ArrowUp': rotY -= 5; rotY = Math.max(-89, Math.min(89, rotY)); this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }); e.preventDefault(); break;
                case 'ArrowDown': rotY += 5; rotY = Math.max(-89, Math.min(89, rotY)); this.onUpdate({ alpha: rotX, beta: rotY, gamma: 0 }); e.preventDefault(); break;
                case 'r': case 'R': rotX = 0; rotY = 0; zoomLevel = 0; this.onUpdate({ alpha: 0, beta: 0, gamma: 0 }); if (this._zoomCallback) this._zoomCallback(0); e.preventDefault(); break;
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
        
        this._zoomCallback = null;
        this.setZoomCallback = (callback) => {
            this._zoomCallback = callback;
        };
        
        console.log('✅ Desktop controls active!');
    }
    
    showStatus(message) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) statusEl.textContent = message;
        console.log('📱 Status:', message);
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
        console.log('📱 MotionController disposed');
    }
}