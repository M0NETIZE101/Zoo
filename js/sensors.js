/* ============================================================
   SENSORS - Motion Handling (ANDROID DEBUG FIX)
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
        this.motionReceived = false;
        this.fallbackTimeout = null;
        
        console.log('📱 MotionController created');
        console.log('🖥️ Is desktop:', this.isDesktop);
        console.log('🔍 User Agent:', navigator.userAgent);
        
        if (this.isDesktop) {
            console.log('🖥️ Desktop detected - using mouse fallback');
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
        
        // Check if it's iOS (needs permission)
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('📱 iOS permission required - will request on user gesture');
        } else {
            // Android or older iOS - start immediately
            console.log('📱 No permission required - starting directly');
            this.startListening();
            
            // ===== FALLBACK TIMER: If no motion after 3 seconds, use mouse =====
            this.fallbackTimeout = setTimeout(() => {
                if (!this.motionReceived && !this.useFallback) {
                    console.warn('⚠️ No motion event received after 3s - falling back to mouse');
                    this.fallbackToMouse();
                }
            }, 3000);
        }
    }
    
    requestIOSPermission() {
        if (this.permissionRequested) {
            console.log('📱 Permission already requested');
            return;
        }
        this.permissionRequested = true;
        
        console.log('📱 Requesting iOS motion permission...');
        
        DeviceOrientationEvent.requestPermission()
            .then(response => {
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
            })
            .catch(error => {
                console.error('❌ Permission error:', error);
                this.fallbackToMouse();
                if (this.onPermission) this.onPermission(false);
            });
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
        console.log('✅ Motion tracking active - waiting for data...');
        this.showStatus('📱 Move your phone to look around');
    }
    
    handleOrientation(event) {
        // Mark that we received motion
        if (!this.motionReceived) {
            this.motionReceived = true;
            console.log('📱 First motion event received!');
            if (this.fallbackTimeout) {
                clearTimeout(this.fallbackTimeout);
                this.fallbackTimeout = null;
            }
        }
        
        if (!event) return;
        
        // Log raw values for debugging
        console.log('🔄 Raw:', { alpha: event.alpha, beta: event.beta, gamma: event.gamma });
        
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
        
        console.log('🔄 Compensated:', this.orientation);
        
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
        
        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }
        
        if (this._fallbackCleanup) {
            this._fallbackCleanup();
            this._fallbackCleanup = null;
        }
        
        console.log('📱 Motion stopped');
    }
    
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
            
            rotX += dx * ROTATION_SPEED * 0.3;
            rotY += dy * ROTATION_SPEED * 0.3;
            rotY = Math.max(-89, Math.min(89, rotY));
            
            this.sendOrientationUpdate(rotX, rotY);
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };
        
        const onWheel = (e) => {
            e.preventDefault();
            zoomLevel += e.deltaY * ZOOM_SPEED * 0.01;
            zoomLevel = Math.max(-1.5, Math.min(1.5, zoomLevel));
            if (this._zoomCallback) {
                this._zoomCallback(zoomLevel);
            }
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
            
            rotX += dx * ROTATION_SPEED * 0.3;
            rotY += dy * ROTATION_SPEED * 0.3;
            rotY = Math.max(-89, Math.min(89, rotY));
            
            this.sendOrientationUpdate(rotX, rotY);
        };
        
        const onTouchEnd = () => {
            isTouching = false;
        };
        
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
    
    sendOrientationUpdate(rotX, rotY) {
        if (this.onUpdate) {
            this.onUpdate({
                alpha: rotX,
                beta: rotY,
                gamma: 0
            });
        }
    }
    
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