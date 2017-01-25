import EventEmitter from 'events';

export default class TouchController extends EventEmitter {
  constructor(opts = {}) {
    super();
    
    this.element = opts.element || document;
    this.touchstartElement = opts.touchstartElement || this.element;
    this.touchmoveElement = opts.touchmoveElement || this.element;
    this.touchendElement = opts.touchendElement || this.element;
    
    this.doubleTapDelay = opts.doubleTapDelay || 500;
    this.holdingDelay = opts.holdingDelay || 1000;
    this.watchInterval = opts.watchInterval || 100;
    
    this.touchSupport = ('ontouchstart' in window);
    this.touchstart = (this.touchSupport) ? 'touchstart' : 'mousedown';
    this.touchmove  = (this.touchSupport) ? 'touchmove'  : 'mousemove';
    this.touchend   = (this.touchSupport) ? 'touchend'   : 'mouseup';
    
    this.deltaX = 0;
    this.deltaY = 0;
    this.moveX = 0;
    this.moveY = 0;
    
    this.defineEventListener();
    this.setEvent();
  }
  
  setEvent() {
    this.touchstartElement.addEventListener(this.touchstart, this.onTouchStart, false);
    this.touchmoveElement.addEventListener(this.touchmove, this.onTouchMove, false);
    this.touchendElement.addEventListener(this.touchend, this.onTouchEnd, false);
    // document.addEventListener(touchstart, function(){ return false; }, false); // disableDocumentTouch
  }
  
  dispose() {
    this.touchstartElement.removeEventListener(this.touchstart, this.onTouchStart, false);
    this.touchmoveElement.removeEventListener(this.touchmove, this.onTouchMove, false);
    this.touchendElement.removeEventListener(this.touchend, this.onTouchEnd, false);
  }
  
  defineEventListener() {
    let watchTimer;
    let delayTimer;
    
    const clearWatcher = () => {
      clearInterval(watchTimer);
      clearTimeout(delayTimer);
    };
    
    const setWatcher = () => {
      clearWatcher();
      delayTimer = setTimeout(() => {
        watchTimer = setInterval(() => {
          this.emit('touchholding', this);
        }, this.watchInterval);
      }, this.holdingDelay);
    };
    
    this.onTouchStart = (evt) => {
      evt.preventDefault(); // enablePreventDefault
      evt.stopPropagation(); // enableStopPropagation
      
      this.isDoubleTap = this.isTap;
      this.isDragging = true;
      this.isTap = true;
      this.touchStartTime = Date.now();
      
      this.touchStartX = (this.touchSupport) ? evt.touches[0].pageX : evt.pageX;
      this.touchStartY = (this.touchSupport) ? evt.touches[0].pageY : evt.pageY;
      
      setWatcher();
      
      this.emit('touchstart', {
        'touchStartTime': this.touchStartTime,
        'touchStartX'   : this.touchStartX,
        'touchStartY'   : this.touchStartY,
      });
      
      //return false; // enableReturnFalse
    };
    
    this.onTouchMove = (evt) => {
      if (!this.isDragging) return;
      
      clearWatcher();
      
      this.lasttouchX = this.touchX || this.touchStartX;
      this.lasttouchY = this.touchY || this.touchStartY;
      
      this.touchX = (this.touchSupport) ? evt.touches[0].pageX : evt.pageX;
      this.touchY = (this.touchSupport) ? evt.touches[0].pageY : evt.pageY;
      this.deltaX = this.touchX - this.lasttouchX;
      this.deltaY = this.touchY - this.lasttouchY;
      this.moveX  = this.touchX - this.touchStartX;
      this.moveY  = this.touchY - this.touchStartY;
      
      this.isTap = this.isDoubleTap = false;
      
      setWatcher();
      
      this.emit('touchmove', {
        'lasttouchX': this.lasttouchX,
        'lasttouchY': this.lasttouchY,
        'touchX'    : this.touchX,
        'touchY'    : this.touchY,
        'deltaX'    : this.deltaX,
        'deltaY'    : this.deltaY,
        'moveX'     : this.moveX,
        'moveY'     : this.moveY,
      });
      
      // clearTimeout(movingtimer);
      // movingtimer = setTimeout(function(){ this.isDragging = false; },1000);
    };
    
    this.onTouchEnd = (evt) => {
      this.isDragging = false;
      
      clearWatcher();
      
      this.elapsedTime = Date.now() - this.touchStartTime;
      this.touchEndX = this.touchX;
      this.touchEndY = this.touchY;
      
      this.emit('touchend', {
        'elapsedTime': this.elapsedTime,
        'touchEndX'  : this.touchEndX,
        'touchEndY'  : this.touchEndY,
        'moveX'      : this.moveX,
        'moveY'      : this.moveY,
        'isTap'      : this.isTap,
        'isDoubleTap': this.isDoubleTap,
      });
      
      this.touchX = this.touchY = null;
      this.moveX = this.moveY = 0;
      setTimeout(() => {
        this.isTap = this.isDoubleTap = false;
      }, this.doubleTapDelay);
    };
  }
}
