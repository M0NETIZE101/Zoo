/* ============================================================
   SENSORS - Motion Handling (Magic Window)
   ============================================================ */

export class MotionController {
    constructor(options = {}) {
        this.onUpdate = options.onUpdate || (() => {});
        this.onPermission = options.onPermission || (() => {});
        this.isActive = false;
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.targetOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.smoothFactor = 0.15;
        
        this.setupDeviceOrientation();
    }
    
    setupDeviceOrientation() {
        if (typeof DeviceOrientationEvent === 'undefined') {
            console.warn('DeviceOrientationEvent not supported');
            this.fallbackToMouse();
            return;
        }
        
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.requestPermissionIOS();
        } else {
            this.startListening();
        }
    }
    
    requestPermissionIOS() {
        document.addEventListener('click', () => {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.startListening();
                        this.onPermission(true);
                    } else {
                        console.warn('Permission denied');
                        this.fallbackToMouse();
                        this.onPermission(false);
                    }
                })
                .catch(err => {
                    console.warn('Permission error:', err);
                    this.fallbackToMouse();
                });
        }, { once: true });
    }
    
    startListening() {
        window.addEventListener('deviceorientation', (event) => {
            this.handleOrientation(event);
        });
        this.isActive = true;
        console.log('📱 Motion tracking active');
    }
    
    handleOrientation(event) {
        let alpha = event.alpha || 0;
        let beta = event.beta || 0;
        let gamma = event.gamma || 0;
        
        beta = Math.max(-90, Math.min(90, beta));
        
        this.targetOrientation = { alpha, beta, gamma };
        
        this.orientation.alpha += (this.targetOrientation.alpha - this.orientation.alpha) * this.smoothFactor;
        this.orientation.beta += (this.targetOrientation.beta - this.orientation.beta) * this.smoothFactor;
        this.orientation.gamma += (this.targetOrientation.gamma - this.orientation.gamma) * this.smoothFactor;
        
        this.onUpdate(this.orientation);
    }
    
    fallbackToMouse() {
        console.log('🖱️ Using mouse fallback');
        this.isActive = true;
        
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let rotX = 0, rotY = 0;
        
        document.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            
            rotX += dx * 0.5;
            rotY += dy * 0.5;
            rotY = Math.max(-90, Math.min(90, rotY));
            
            this.onUpdate({
                alpha: rotX,
                beta: rotY,
                gamma: 0
            });
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        let touchStartX = 0, touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            rotX += dx * 0.3;
            rotY += dy * 0.3;
            rotY = Math.max(-90, Math.min(90, rotY));
            
            this.onUpdate({
                alpha: rotX,
                beta: rotY,
                gamma: 0
            });
        });
    }
    
    reset() {
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.targetOrientation = { alpha: 0, beta: 0, gamma: 0 };
    }
    
    stop() {
        this.isActive = false;
        window.removeEventListener('deviceorientation', this.handleOrientation);
    }
}