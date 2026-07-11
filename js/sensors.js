/* ============================================================
   SENSORS - Motion Handling
   ============================================================ */

export class MotionController {
    constructor(options = {}) {
        this.onUpdate = options.onUpdate || (() => {});
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.isActive = false;
        
        this.setup();
    }
    
    setup() {
        if (typeof DeviceOrientationEvent === 'undefined') {
            console.warn('No motion sensors detected');
            return;
        }
        
        // iOS 13+ needs permission
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            this.startListening();
                        }
                    })
                    .catch(console.warn);
            }, { once: true });
        } else {
            this.startListening();
        }
    }
    
    startListening() {
        window.addEventListener('deviceorientation', (event) => {
            this.orientation.alpha = event.alpha || 0;
            this.orientation.beta = event.beta || 0;
            this.orientation.gamma = event.gamma || 0;
            this.onUpdate(this.orientation);
        });
        this.isActive = true;
        console.log('📱 Motion tracking active');
    }
}