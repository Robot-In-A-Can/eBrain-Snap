var escapable = /[\x00-\x1f\ud800-\udfff\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufff0-\uffff]/g;
var attempts = 0;
var eb;

function filterUnicode(quoted){

  escapable.lastIndex = 0;
  if( !escapable.test(quoted)) return quoted;

  return quoted.replace( escapable, function(a){
    return '';
  });
}

var EveBrain = function(url){
  this.url = url;
  this.connect();
  this.cbs = {};
  this.listeners = [];
  this.sensorState = {follow: null, collide: null};
  this.analogSensor = {level: null};
  this.digitalSensor = [];
  this.wifiNetworks = {};
  this.ipAddress = {};
  this.distanceSensor = {level: null};
  this.tempSensor = {level: null};
  this.humidSensor = {level: null};
}

EveBrain.prototype = {

  connected: false,
  error: false,
  timeoutTimer: undefined,

  connect: function(){
    if(!this.connected && !this.error){
      var self = this;
      try { 
        //clear any previous websockets and clear msg queue and all timers
        clearTimeout(self.timeoutTimer);
        clearTimeout(self.connTimeout);
        clearTimeout(self.reconnectTimer);
        self.ws.close();
        self.robot_state = 'idle';
        self.msg_stack = [];
        self.cbs = {};
      }
      catch(error) {
        console.log(error);
      }
      this.has_connected = false;
      this.ws = filterUnicode(new WebSocket(this.url));
      this.ws.onmessage = function(ws_msg){self.handle_ws(ws_msg)};
      this.ws.onopen = function(){
        self.version(function(){
          self.setConnectedState(true);
          attempts = 0;
        });
      }
      this.ws.onerror = function(err){self.handleError(err); attempts += 1;}
      this.ws.onclose = function(err){self.handleError(err); attempts += 1;}
      if (attempts < 10) {
        this.connTimeout = window.setTimeout(function(){
          if(!self.connected){
            try { 
              self.ws.close();;
            }
            catch(error) {
              console.log(error);
            }
          } 
        }, 1000);
      }
    }
  },

  refresh: function(){
    var self = this;
    self.ws.close();
    clearTimeout(self.connTimeout);
    self.robot_state = 'idle';
    self.msg_stack = [];
    self.cbs = {};
    this.has_connected = false;
    this.ws = filterUnicode(new WebSocket(this.url));
    this.ws.onmessage = function(ws_msg){self.handle_ws(ws_msg)};
    this.ws.onopen = function(){
      self.version(function(){
        self.setConnectedState(true);
      });
    }
    this.ws.onerror = function(err){self.handleError(err)}
    this.ws.onclose = function(err){self.handleError(err)}
  },

  setConnectedState: function(state){
    var self = this;
    clearTimeout(self.connTimeout);
    self.connected = state;
    if(state){ self.has_connected = true; }
    if(self.has_connected){
      setTimeout(function(){
        self.broadcast(self.connected ? 'connected' : 'disconnected');
      }, 100);
    }
    // Try to auto reconnect if disconnected
    if(state){
      if(self.reconnectTimer){
        clearTimeout(self.reconnectTimer);
        self.reconnectTimer = undefined;
      }
    }else{
      if(!self.reconnectTimer && attempts < 10){
          self.reconnectTimer = setTimeout(function(){
          self.reconnectTimer = undefined;
          self.connect();
        }, 1000);
      }
    }
  },

  broadcast: function(msg){
    for(i in this.listeners){
      if(this.listeners.hasOwnProperty(i)){
        this.listeners[i](msg);
      }
    }
  },

  addListener: function(listener){
    this.listeners.push(listener);
  },

  handleError: function(err){
    if(err instanceof CloseEvent || err === 'Timeout'){
      if(this.ws.readyState === WebSocket.OPEN){
        this.ws.close()
      }
      this.setConnectedState(false);
      clearTimeout(self.reconnectTimer);
      self.reconnectTimer = undefined;
      this.msg_stack = [];
    }else{
      console.log(err);
    }
  },

  move: function(direction, distance, cb){
    this.send({cmd: direction, arg: distance}, cb);
  },

  turn: function(direction, angle, cb){
    this.send({cmd: direction, arg: angle}, cb);
  },

  forward: function(distance, cb){
    this.move('forward', distance, cb);
  },

  back: function(distance, cb){
    this.move('back', distance, cb);
  },

  left: function(distance, cb){
    this.move('right', distance, cb);
  },

  right: function(distance, cb){
    this.move('left', distance, cb);
  },

  leftMotorForward: function(distance, cb){
    this.move('leftMotorF', distance, cb);
  },

  rightMotorForward: function(distance, cb){
    this.move('rightMotorF', distance, cb);
  },

  
  leftMotorBackward: function(distance, cb){
    this.move('leftMotorB', distance, cb);
  },

  rightMotorBackward: function(distance, cb){
    this.move('rightMotorB', distance, cb);
  },

  arc: function(angle,radius,repeat,cb){
    this.send({cmd: 'arc' , arg:[angle,radius,repeat]}, cb);
  },



  //EveOneCommands
  gpio: function(pin, pin_state, cb){
    this.send({cmd: pin_state[0], arg:pin}, cb);
  },

  analogInput: function(pin_number, cb){
    var self = this;
    this.send({cmd: 'analogInput', arg:pin_number}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.analogSensor.level = msg.msg;
        cb(self.analogSensor.level);
      }
    });
  },

  analogInputPCF: function(pin_number, cb){
    var self = this;
    this.send({cmd: 'readSensors', arg:pin_number}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.analogSensor.level = msg.msg;
        cb(self.analogSensor.level);
      }
    });
  },

  temperature: function(cb){
    var self = this;
    this.send({cmd: 'temperature'}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.tempSensor.level = msg.msg;
        cb(self.tempSensor.level);
      }
    });
  },

  humidity: function(cb){
    var self = this;
    this.send({cmd: 'humidity'}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.humidSensor.level = msg.msg;
        cb(self.humidSensor.level);
      }
    });
  },

  digitalInput: function(pin_number, cb){
    var self = this;
    this.send({cmd: 'digitalInput', arg:pin_number}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.digitalSensor[pin_number] = msg.msg;
        cb(self.digitalSensor[pin_number]);
      }
    });
  },

  distanceInput: function(cb){
    var self = this;
    this.send({cmd: 'distanceSensor'}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.distanceSensor.level = msg.msg;
        cb(self.distanceSensor.level);
      }
    });
  },

  gpio_pwm: function(pin_select,pin_value, cb){
    this.send({cmd: pin_select, arg:pin_value}, cb);
  },

  servo: function(angle, cb){
    this.send({cmd: 'servo', arg:angle}, cb);
  },

  beep: function(note,duration,cb){
    this.send({cmd: 'beep' , arg:[note,duration*1000]}, cb);
  },

  stop: function(cb){
    var self = this;
    this.send({cmd:'stop'}, function(state, msg, recursion){
      if(state === 'complete' && !recursion){
        for(var i in self.cbs){
          self.cbs[i]('complete', undefined, true);
        }
        self.robot_state = 'idle';
        self.msg_stack = [];
        self.cbs = {};
        if(cb){ cb(state); }
      }
    });
  },

  pause: function(cb){
    this.send({cmd:'pause'}, cb);
  },

  resume: function(cb){
    this.send({cmd:'resume'}, cb);
  },

  ping: function(cb){
    this.send({cmd:'ping'}, cb);
  },

  version: function(cb){
    this.send({cmd:'version'}, cb);
  },

  getNetworks: function(cb){
    var self = this;
    this.send({cmd: 'startWifiScan'}, function(state, msg){
      if(state === 'notify' && undefined != msg){
        cb(msg.msg);
      }
    });
  },

  getIp: function(cb){
    var self = this;
    this.send({cmd: 'getConfig'}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        cb(msg.msg);
      }
    });
  },

  send: function(msg, cb){
    msg = filterUnicode(msg);
    msg.id = Math.random().toString(36).substr(2, 10);
    if(cb){
      this.cbs[msg.id] = cb;
    }
    if(msg.arg){ msg.arg = msg.arg.toString(); }
    if(['stop', 'pause', 'resume', 'ping', 'version'].indexOf(msg.cmd) >= 0){
      this.send_msg(msg);
    }else{
      this.msg_stack.push(msg);
      this.process_msg_queue();
    }
  },

  send_msg: function(msg){
    var self = this;
    msg = filterUnicode(msg);
    console.log(msg);
    if(this.ws.readyState === WebSocket.OPEN){
      this.ws.send(JSON.stringify(msg));
    }
    this.timeoutTimer = window.setTimeout(function(){ self.handleError("Timeout") }, 3000);
  },

  process_msg_queue: function(){
    if(this.robot_state === 'idle' && this.msg_stack.length > 0){
      this.robot_state = 'receiving';
      this.send_msg(this.msg_stack[0]);
    }
  },

  handle_ws: function(ws_msg){
    if (typeof ws_msg != 'undefined') {
      msg = JSON.parse(ws_msg.data);
      msg.msg = filterUnicode(msg.msg);
      msg.id = filterUnicode(msg.id);
      msg.status = filterUnicode(msg.status);
      console.log(msg);
      clearTimeout(this.timeoutTimer);
      if(msg.status === 'notify'){
        this.broadcast(msg.id);
        this.sensorState[msg.id] = msg.msg;
        return;
      }
      if(this.msg_stack.length > 0 && this.msg_stack[0].id == msg.id){
        if(msg.status === 'accepted'){
          if(this.cbs[msg.id]){
            this.cbs[msg.id]('started', msg);
          }
          this.robot_state = 'running';
        }else if(msg.status === 'complete'){
          if(this.cbs[msg.id]){
            this.cbs[msg.id]('complete', msg);
            delete this.cbs[msg.id];
          }
          this.msg_stack.shift();
          if(this.msg_stack.length === 0){
            this.broadcast('program_complete');
          }
          this.robot_state = 'idle';
          this.process_msg_queue();
        }
      }else{
        if(this.cbs[msg.id]){
          this.cbs[msg.id]('complete', msg);
          delete this.cbs[msg.id];
        }
      }
      if(msg.status && msg.status === 'error' && msg.msg === 'Too many connections'){
        this.error = true;
        this.broadcast('error');
      }
    } else {
      ws_msg.data = 0;
      ws_msg.status = 0;
      ws_msg.id = 0;
    }
  },

  robot_state: 'idle',
  msg_stack: []
}


let inputDone;
let outputDone;

async function USBconnect() {
  // CODELAB: Add code to request & open port here.
  world.port = await navigator.serial.requestPort();
  // - Wait for the port to open.
  await world.port.open({ baudRate: 230400 });

  // CODELAB: Add code setup the output stream here.
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(world.port.writable);
  world.outputStream = encoder.writable;

  // CODELAB: Send CTRL-C and turn off echo on REPL
  writeToStream(' {cmd: "version", id: "k1q6if75si"} ');
  //writeToStream('\x03', 'echo(false);');

  // CODELAB: Add code to read the stream here.\
  let decoder = new TextDecoderStream();
  inputDone = world.port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable;

  world.reader = inputStream.getReader();
  readLoop();

}

async function readLoop() {
  // CODELAB: Add read loop here.
  var log;
  world.USB = '';
  console.log("USB Reader Listening...");

  while (true) {
    const { value, done } = await world.reader.read();
    if (value) {
      if(value.includes('{')){
        world.USB = '';
      }
      world.USB += value;
      console.log (value + '\n');
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      world.reader.releaseLock();
      break;
    }
  }
  //return log;
}

function writeToStream(...lines) {
  // CODELAB: Write to output stream
  const writer = world.outputStream.getWriter();
  lines.forEach((line) => {
    console.log('[SEND]', line);
    writer.write(line + '\n');
  });
  writer.releaseLock();

}

world.digitalSensor = [];
