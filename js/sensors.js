/* ============================================================
   SENSORS - Motion Handling (DESKTOP FIXED)
   ============================================================ */

export class MotionController {
    constructor(options = {}) {
        this.onUpdate = options.onUpdate || (() => {});
        this.onPermission = options.onPermission || (() => {});
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.isActive = false;
        this.hasPermission = false;
        this.permissionRequested = false;
        this.boundHandleOrientation = null;
        this.useFallback = false;
        this.isDesktop = this.checkDesktop();
        
        console.log('📱 MotionController created');
        console.log('🖥️ Is desktop:', this.isDesktop);
        
        if (this.isDesktop) {
            console.log('🖥️ Desktop detected - using mouse fallback');
            this.fallbackToMouse();
        } else {
            this.setup();
        }
    }
    
    checkDesktop() {
        // Detect if running on desktop (no touch support, no mobile user agent)
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
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('📱 iOS permission required');
            // iOS - wait for explicit call
        } else {
            // Android - start immediately
            console.log('📱 No permission required - starting directly');
            this.startListening();
        }
    }
    
    async requestIOSPermission() {
        if (this.permissionRequested) {
            console.log('📱 Permission already requested');
            return;
        }
        this.permissionRequested = true;
        
        if (this.isDesktop) {
            console.log('🖥️ Desktop - no permission needed');
            this.fallbackToMouse();
            return;
        }
        
        console.log('📱 Requesting motion permission...');
        
        try {
            const response = await DeviceOrientationEvent.requestPermission();
            console.log('📱 Permission response:', response);
            
            if (response === 'granted') {
                console.log('✅ Motion permission granted!');
                this.hasPermission = true;
                this.startListening();
                if (this.onPermission) this.onPermission(true);
            } else {
                console.warn('❌ Motion permission denied');
                this.fallbackToMouse();
                if (this.onPermission) this.onPermission(false);
            }
        } catch (error) {
            console.error('❌ Permission error:', error);
            this.fallbackToMouse();
            if (this.onPermission) this.onPermission(false);
        }
    }
    
    startListening() {
        if (this.isActive) {
            console.log('📱 Motion already active');
            return;
        }
        
        if (this.isDesktop) {
            this.fallbackToMouse();
            return;
        }
        
        console.log('📱 Starting device orientation listener...');
        
        this.boundHandleOrientation = this.handleOrientation.bind(this);
        
        window.addEventListener('deviceorientation', this.boundHandleOrientation);
        window.addEventListener('deviceorientationabsolute', this.boundHandleOrientation);
        
        this.isActive = true;
        console.log('✅ Motion tracking active');
        this.showStatus('📱 Move your phone to look around');
    }
    
    handleOrientation(event) {
        if (!event) return;
        
        let alpha = event.alpha !== null ? event.alpha : 0;
        let beta = event.beta !== null ? event.beta : 0;
        let gamma = event.gamma !== null ? event.gamma : 0;
        
        if (isNaN(alpha) || isNaN(beta) || isNaN(gamma)) return;
        
        // Screen orientation compensation
        let orientationAngle = 0;
        if (screen && screen.orientation) {
            orientationAngle = screen.orientation.angle || 0;
        } else if (window.orientation !== undefined) {
            orientationAngle = window.orientation || 0;
        }
        
        const rad = orientationAngle * Math.PI / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        
        let compensatedGamma = gamma * cosA - beta * sinA;
        let compensatedBeta = gamma * sinA + beta * cosA;
        
        compensatedBeta = Math.max(-90, Math.min(90, compensatedBeta));
        compensatedGamma = Math.max(-90, Math.min(90, compensatedGamma));
        
        this.orientation = {
            alpha: alpha,
            beta: compensatedBeta,
            gamma: compensatedGamma
        };
        
        if (this.onUpdate) {
            this.onUpdate(this.orientation);
        }
    }
    
    stop() {
        this.isActive = false;
        
        if (this.boundHandleOrientation) {
            window.removeEventListener('deviceorientation', this.boundHandleOrientation);
            window.removeEventListener('deviceorientationabsolute', this.boundHandleOrientation);
            this.boundHandleOrientation = null;
        }
        
        if (this._fallbackCleanup) {
            this._fallbackCleanup();
            this._fallbackCleanup = null;
        }
        
        console.log('📱 Motion stopped');
    }
    
    // ============================================================
    // ===== FIXED: Desktop Controls with Mouse, Touch & Keyboard =====
    // ============================================================
    fallbackToMouse() {
        console.log('🖱️ Using mouse/touch fallback');
        this.useFallback = true;
        this.isActive = true;
        this.showStatus('🖱️ Drag to look around · Scroll to zoom');
        
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let rotX = 0, rotY = 0;
        let zoomLevel = 0;
        const ZOOM_SPEED = 0.05;
        const ROTATION_SPEED = 0.5;
        
        // ============================================================
        // MOUSE DRAG TO ROTATE
        // ============================================================
        const onMouseDown = (e) => {
            // Only if not clicking on a button
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
            
            rotX += dx * ROTATION_SPEED * 0.3;
            rotY += dy * ROTATION_SPEED * 0.3;
            rotY = Math.max(-89, Math.min(89, rotY));
            
            this.sendOrientationUpdate(rotX, rotY);
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };
        
        // ============================================================
        // SCROLL TO ZOOM
        // ============================================================
        const onWheel = (e) => {
            e.preventDefault();
            zoomLevel += e.deltaY * ZOOM_SPEED * 0.01;
            zoomLevel = Math.max(-1.5, Math.min(1.5, zoomLevel));
            
            // Send zoom update to scene
            if (this._zoomCallback) {
                this._zoomCallback(zoomLevel);
            }
        };
        
        // ============================================================
        // TOUCH DRAG (for touchscreen laptops)
        // ============================================================
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
            
            rotX += dx * ROTATION_SPEED * 0.3;
            rotY += dy * ROTATION_SPEED * 0.3;
            rotY = Math.max(-89, Math.min(89, rotY));
            
            this.sendOrientationUpdate(rotX, rotY);
        };
        
        const onTouchEnd = () => {
            isTouching = false;
        };
        
        // ============================================================
        // KEYBOARD CONTROLS
        // ============================================================
        const onKeyDown = (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    rotX -= 5;
                    this.sendOrientationUpdate(rotX, rotY);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    rotX += 5;
                    this.sendOrientationUpdate(rotX, rotY);
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    rotY -= 5;
                    rotY = Math.max(-89, Math.min(89, rotY));
                    this.sendOrientationUpdate(rotX, rotY);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    rotY += 5;
                    rotY = Math.max(-89, Math.min(89, rotY));
                    this.sendOrientationUpdate(rotX, rotY);
                    e.preventDefault();
                    break;
                case 'r':
                case 'R':
                    rotX = 0;
                    rotY = 0;
                    zoomLevel = 0;
                    this.sendOrientationUpdate(rotX, rotY);
                    if (this._zoomCallback) this._zoomCallback(0);
                    this.showStatus('🔄 View reset');
                    e.preventDefault();
                    break;
                case 'f':
                case 'F':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        document.body.requestFullscreen();
                    }
                    e.preventDefault();
                    break;
            }
        };
        
        // ============================================================
        // REGISTER EVENTS
        // ============================================================
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('wheel', onWheel, { passive: false });
        
        document.addEventListener('touchstart', onTouchStart);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
        
        document.addEventListener('keydown', onKeyDown);
        
        // ============================================================
        // STORE CLEANUP AND CALLBACKS
        // ============================================================
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
        
        // Store zoom callback function
        this.setZoomCallback = (callback) => {
            this._zoomCallback = callback;
        };
        
        console.log('✅ Desktop controls active!');
        console.log('   🖱️ Drag to rotate');
        console.log('   🔄 Scroll to zoom');
        console.log('   ⌨️ Arrow keys to move');
        console.log('   ⌨️ R to reset');
        console.log('   ⌨️ F for fullscreen');
    }
    
    // ============================================================
    // SEND ORIENTATION UPDATE
    // ============================================================
    sendOrientationUpdate(rotX, rotY) {
        if (this.onUpdate) {
            this.onUpdate({
                alpha: rotX,
                beta: rotY,
                gamma: 0
            });
        }
    }
    
    // ============================================================
    // SHOW STATUS
    // ============================================================
    showStatus(message) {
        const statusEl = document.getElementById('status-text');
        if (statusEl) {
            statusEl.textContent = message;
        }
        console.log('📱 Status:', message);
    }
    
    isMotionAvailable() {
        return this.isActive && this.hasPermission && !this.useFallback;
    }
    
    reset() {
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        if (this.onUpdate) {
            this.onUpdate(this.orientation);
        }
    }
    
    // ============================================================
    // DISPOSE
    // ============================================================
    dispose() {
        this.stop();
        if (this._fallbackCleanup) {
            this._fallbackCleanup();
            this._fallbackCleanup = null;
        }
        this.onUpdate = null;
        this.onPermission = null;
        console.log('📱 MotionController disposed');
    }
}