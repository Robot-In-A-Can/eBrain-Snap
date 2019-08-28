SpriteMorph.prototype.categories.push('eBrain');
SpriteMorph.prototype.blockColor.eBrain = new Color(50,50, 50);

//Functions to handle events coming from evebrain
StageMorph.prototype.setupEveBrainEvents = function () {
    var procs = [],
        ide = this.parentThatIsA(IDE_Morph),
        myself = this;

    this.children.concat(this).forEach(function (morph) {
    });
    var handler = function(e){
    }
    return procs;
}

StageMorph.prototype.stopEveBrainEvents = function () {
    evebrain.stop(function(){
    });
}

StageMorph.prototype.fireEveBrainEvent = function (type) {
    var procs = [],
        hats = [],
        ide = this.parentThatIsA(IDE_Morph),
        myself = this;

    this.children.concat(this).forEach(function (morph) {
        if (morph instanceof SpriteMorph || morph instanceof StageMorph) {
            hats = hats.concat(morph.allHatBlocksFor('__evebrain_' + type + '__'));
        }
    });
    hats.forEach(function (block) {
        procs.push(myself.threads.startProcess(
            block,
            myself.isThreadSafe
        ));
    });
    return procs;
}

Process.prototype.evebrainGpio = function (pin,onoff) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.gpio(pin, onoff, function(state, msg){
          if(state === 'complete' && self.context){
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return null;
    }
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainStop = function () {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.stop(function(state, msg){
          if(state === 'complete' && self.context){
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return null;
    }
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainGpio_read = function () {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        this.context.result = null;
        evebrain.analogInput(0, function(state){
          if (self != null && self.context != null) {
            self.context.result = state;
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return this.context.result;
    }
    //return evebrain.analogSensor.level;
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainGpio_readAnalog = function (pin) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        this.context.result = null;
        evebrain.analogInputPCF(pin, function(state){
          if (self != null && self.context != null) {
            self.context.result = state;
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return this.context.result;
    }
    //return evebrain.analogSensor.level;
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainDigital_read = function (pin) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        this.context.result = null;
        evebrain.digitalInput(pin, function(state){
          if (self != null && self.context != null) {
            self.context.result = state;
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return this.context.result;
    }
    //return evebrain.analogSensor.level;
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainDistance_read = function () {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        this.context.result = null;
        evebrain.distanceInput(function(state){
          if (self != null && self.context != null) {
            self.context.result = state;
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return this.context.result;
    }
    //return evebrain.analogSensor.level;
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainGpio_pwm = function (pin, value) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.gpio_pwm(pin[0], value, function(state, msg){
          if(state === 'complete' && self.context){
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return null;
    }
    this.pushContext('doYield');
    this.pushContext();
}


Process.prototype.evebrainServo = function (angle) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.servo(angle, function(state, msg){
          if(state === 'complete' && self.context){
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return null;
    }
    this.pushContext('doYield');
    this.pushContext();
}


Process.prototype.evebrainPlayNote = function (note, duration) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.beep(note, duration, function(state, msg){
          if(state === 'complete' && self.context){
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return null;
    }
    this.pushContext('doYield');
    this.pushContext();
}


Process.prototype.evebrainTemperature = function () {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        this.context.result = null;
        evebrain.temperature(function(state){
          if (self != null && self.context != null) {
            self.context.result = state;
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return this.context.result;
    }
    this.pushContext('doYield');
    this.pushContext();
}


Process.prototype.evebrainHumidity = function () {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        this.context.result = null;
        evebrain.humidity(function(state){
          if (self != null && self.context != null) {
            self.context.result = state;
            self.context.proceed = true;
          }
        });
    }
    if(this.context.proceed){
        return this.context.result;
    }
    this.pushContext('doYield');
    this.pushContext();
}

Process.prototype.evebrainMotorDriver = function (motor,direction,distance) {
        //ForwardLeft
    if(direction == 'Forward' && motor == 'Left'){
        if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
                evebrain.leftMotorForward(distance, function(state, msg){
                  if(state === 'complete' && self.context){
                    self.context.proceed = true;
                  }
                });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    //BackLeft
    if(direction == 'Backward' && motor == 'Left'){
        if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.leftMotorBackward(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    //ForwardRight
    if(direction == 'Forward' && motor == 'Right'){
         if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.rightMotorForward(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    //BackRight
    if(direction == 'Backward' && motor == 'Right'){
        if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.rightMotorBackward(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }
}

Process.prototype.evebrainMotorDriverBoth = function (directionboth,distance) {
        //ForwardLeft
    if(directionboth == 'Forward'){
        if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.forward(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    //BackLeft
    if(directionboth == 'Backward'){
        if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.back(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    if(directionboth == 'Forward_Backward'){
         if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.right(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }

    if(directionboth == 'Backward_Forward'){
        if (typeof this.context.proceed === 'undefined') {
            var self = this;
            this.context.proceed = false;
            evebrain.left(distance, function(state, msg){
              if(state === 'complete' && self.context){
                self.context.proceed = true;
              }
            });
        }
        if(this.context.proceed){
            return null;
        }
        this.pushContext('doYield');
        this.pushContext();
    }
}