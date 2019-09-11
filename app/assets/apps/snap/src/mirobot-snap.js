SpriteMorph.prototype.categories.push('Robot');
SpriteMorph.prototype.blockColor.Robot = new Color(216, 45, 45);


// Mirobot functions
Process.prototype.mirobotForward = function (distance) {
  // interpolated
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

Process.prototype.mirobotBack = function (distance) {
    // interpolated
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

Process.prototype.mirobotLeft = function (angle) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.left(angle, function(state, msg){
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

Process.prototype.mirobotRight = function (angle) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.right(angle, function(state, msg){
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

Process.prototype.mirobotArc = function (angle,radius,repeat) {
    // interpolated
    if (typeof this.context.proceed === 'undefined') {
        var self = this;
        this.context.proceed = false;
        evebrain.arc(angle,radius,repeat,function(state, msg){
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

Process.prototype.mirobotStop = function () {
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
