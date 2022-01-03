var escapable = /[\x00-\x1f\ud800-\udfff\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufff0-\uffff]/g;
var attempts = 0;
var eb;
var ebUSB;

function filterUnicode(quoted){

  escapable.lastIndex = 0;
  if( !escapable.test(quoted)) return quoted;

  return quoted.replace( escapable, function(a){
    return '';
  });
}

/**
 * ParentEveBrain has the movement functions (move, turn,
 * forward, etc) and digitalInput. These functions then 
 * call the send_msg function, which subclasses need to define.
 * Methods required to implement: send, clearMessagesCallbacks.
 * 
 * NOTE: the API for callbacks here is: state (usually started 
 * or complete), message (the returned message from the robot), optional.
 * Optional is not passed usually, so it is undefined (except when stop() is used).
 */
var ParentEveBrain = function() {
  this.digitalSensor = [];
  this.robot_state = 'idle';
  this.cbs = {};
  this.analogSensor = {level: null};
  this.distanceSensor = {level: null};
  this.tempSensor = {level: null};
  this.humidSensor = {level: null};
  this.ipAddress = null;
}

ParentEveBrain.prototype = {
  constructor: ParentEveBrain,

  connect_to_network: function(SSID, PASS, callback) {
    this.send({cmd: 'setConfig', arg: {sta_ssid: SSID, sta_pass: PASS}}, callback);
  },

  digitalInput: function(pin_number, cb){
    var self = this;
    this.send({cmd: 'digitalInput', arg:pin_number}, function(state, msg){
      cb(state, msg);
      if(state === 'complete' && undefined != msg){
        self.digitalSensor[pin_number] = msg.msg;
      }
    });
  },

  analogInput: function(pin_number, cb){
    var self = this;
    this.send({cmd: 'analogInput', arg:pin_number}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.analogSensor.level = msg.msg;
        cb(state, msg);
      }
    });
  },

  gpio: function(pin, pin_state, cb){
    this.send({cmd: pin_state[0], arg:pin}, cb);
  },

  gpio_pwm: function(pin_select,pin_value, cb){
    this.send({cmd: pin_select, arg:pin_value}, cb);
  },

  distanceInput: function(cb){
    var self = this;
    this.send({cmd: 'distanceSensor'}, function(state, msg){
      cb(state, msg);
      if(state === 'complete' && undefined != msg){
        self.distanceSensor.level = msg.msg;
      }
    });
  },

  temperature: function(cb){
    var self = this;
    this.send({cmd: 'temperature'}, function(state, msg){
      cb(state, msg);
      if(state === 'complete' && undefined != msg){
        self.tempSensor.level = msg.msg;
      }
    });
  },

  humidity: function(cb){
    var self = this;
    this.send({cmd: 'humidity'}, function(state, msg){
      cb(state, msg);
      if(state === 'complete' && undefined != msg){
        self.humidSensor.level = msg.msg;
      }
    });
  },

  beep: function(note,duration,cb){
    this.send({cmd: 'beep' , arg: [note, duration*1000]}, cb);
  },

  getIp: function(cb){
    var self = this;
    this.send({cmd: 'getConfig'}, function(state, msg) {
      cb(state, msg);
      if(state === 'complete' && undefined != msg){
        self.ipAddress = msg.msg.sta_ip; 
      }
    });
  },

  setServo: function(servoNum, angle, callback) {
    if (servoNum == 1) { // This is delierately a loose comparison
      this.send({cmd: "servo", arg: angle}, callback);
    } else if (servoNum == 2) {
      this.send({cmd: "servoII", arg: angle}, callback);
    }
  },

  move: function(direction, distance, cb){
    // If we pass this first check, distance is a number or a string parseable as such
    if (!(typeof distance === 'number' || !isNaN(distance))) {
      throw new Error('The distance must be a number');
    } else if (+distance < 0) {
      throw new Error('For this command, distance must be positive.');
    }
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
  }
}


var EveBrain = function(url){
  ParentEveBrain.call(this);
  this.url = url;
  this.connect();
  this.cbs = {};
  this.listeners = [];
  this.sensorState = {follow: null, collide: null};
  this.wifiNetworks = {};
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

  clearMessagesCallbacks: function() {
    this.cbs = {};
    this.msg_stack = [];
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

  // note: many functions are in the ParentEveBrain.

  //EveOneCommands

  analogInputPCF: function(pin_number, cb){
    var self = this;
    this.send({cmd: 'readSensors', arg:pin_number}, function(state, msg){
      if(state === 'complete' && undefined != msg){
        self.analogSensor.level = msg.msg;
        cb(self.analogSensor.level);
      }
    });
  },

  servo: function(angle, cb){
    this.send({cmd: 'servo', arg:angle}, cb);
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

  send: function(msg, cb){
    msg = filterUnicode(msg);
    msg.id = Math.random().toString(36).substring(2, 12);
    if(cb){
      this.cbs[msg.id] = cb;
    }
    if(msg.arg && msg.arg.toString() != '[object Object]') {
      msg.arg = msg.arg.toString();
    }
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

  stop: function(){
    var self = this;
    this.send({cmd:'stop'}, function(state, msg, recursion){
      console.log('in stop callback');
      if(state === 'complete' && !recursion){
        for(var i in self.cbs){
          // console.log('calling callback ' + self.cbs[i]);
          self.cbs[i]('complete', undefined, true);
        }
        self.robot_state = 'idle';
        self.clearMessagesCallbacks();
      }
    });
  },

  robot_state: 'idle',
  msg_stack: []
}

// Add the movement functions to the EveBrain prototype
for (parentMemberName in ParentEveBrain.prototype) {
  EveBrain.prototype[parentMemberName] = ParentEveBrain.prototype[parentMemberName];
}


var EveBrainUSB = function() {
  ParentEveBrain.call(this);
  this.cbs = USBcallbacks;
  this.connected = false;
};

EveBrainUSB.prototype = Object.create(ParentEveBrain.prototype);
Object.defineProperty(EveBrainUSB.prototype, 'constructor', {
  value: EveBrainUSB,
  enumerable: false,
  writable: true
});

EveBrainUSB.prototype.send = function(message, callback) {
  if(['stop', 'pause', 'resume', 'ping', 'version'].indexOf(message.cmd) < 0 && this.robot_state !== 'idle'){
    throw new Error('Cannot call multiple commands at once on USB');
  }

  message = filterUnicode(message);
  message.id = Math.random().toString(36).substring(2, 12);
  if(message.arg && message.arg.toString() != '[object Object]') {
    message.arg = message.arg.toString();
  }
  // We make a new callback that sets this.robot_state because the
  // loop that calls the callbacks is in a global function, so there's
  // no easy way to have it set this.robot_state (without it being a total kludge).
  var self = this;
  var newCallback = function(state, message, optional) {
    callback(state, message, optional);
    if (state == 'complete') {
      self.robot_state = 'idle';
    } else if (state == 'started') {
      self.robot_state = 'running';
    }
  }
  addToUSBCallbacks(message.id, newCallback);
  writeToStream(JSON.stringify(message)); // Write the message at the end to avoid a race with the add to callback
}

EveBrainUSB.prototype.clearMessagesCallbacks = function() {
  USBcallbacks = {};
  this.cbs = USBcallbacks;
}

EveBrainUSB.prototype.stop = function(){
  var self = this;
  this.send({cmd:'stop'}, function(state, msg, recursion){
    if(state === 'complete' && !recursion){
      for(var i in self.cbs){
        self.cbs[i]('complete', undefined, true);
      }
      self.robot_state = 'idle';
      self.clearMessagesCallbacks();
    }
  });
}

/**
 * Tests the connection. If the robot is connected, will
 * (async) set this.connected = true (once the robot responds).
 * Sets this.connected = false at the start.
 */
EveBrainUSB.prototype.testConnection = function() {
  this.connected = false;
  var self = this;
  this.send({cmd: "version"}, function(status, msg) {
    if (status === 'complete') {
      self.connected = true;
    }
  });
}

// Add the movement functions to the prototype
for (parentMemberName in ParentEveBrain.prototype) {
  EveBrainUSB.prototype[parentMemberName] = ParentEveBrain.prototype[parentMemberName];
}

let inputDone;
let outputDone;

async function USBconnect() {
  // Request & open port here.
  world.port = await navigator.serial.requestPort();
  // Wait for the port to open.
  await world.port.open({ baudRate: 230400 });

  // Setup the output stream
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(world.port.writable);
  world.outputStream = encoder.writable;

  // Send version command to eBrain
  writeToStream(' {cmd: "version", id: "' + Math.random().toString(36).substring(2, 12) + ' "} ');

  // Make stream
  let decoder = new TextDecoderStream();
  inputDone = world.port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable;

  world.reader = inputStream.getReader();
  readLoop(); // Start infinite read loop
}

USBcallbacks = {};

function addToUSBCallbacks(id, callback) {
  USBcallbacks[id] = callback;
}

/**
 * This reads from the serial in a loop, and 
 * runs the given callbacks (from USBcallbacks) if the 
 * ID matches. Deletes the callback if the status is 'complete'
 */
async function readLoop() {
  var log;
  world.USB = '';
  console.log("USB Reader Listening...");

  while (true) {
    const { value, done } = await world.reader.read();
    if (value) {
      world.USB += value;
      console.log (value + '\n');

      // Now, I check if the JSON is complete and respond to the callback if necessary
      // and remove the message from the stack
      if (world.USB.includes('}')) {
        var messages = tryParseeBrainResponse(world.USB);
        for (var i = 0; i < messages.parsed.length; i++ ) {
          var message = messages.parsed[i];

          if(message && message.status == 'accepted'){
            if(USBcallbacks[message.id]){
              USBcallbacks[message.id]('started', message);
            }
          }else if(message && message.status == 'complete'){
            if(USBcallbacks[message.id]){
              USBcallbacks[message.id]('complete', message);
              delete USBcallbacks[message.id];
            }
          }
        }
        world.USB = '';
        if (messages.unparseable) {
          world.USB = messages.unparseable;
        }
      }
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      world.reader.releaseLock();
      break;
    }
  }
  //return log;
}

/**
 * Tries to parse string as json. Also verifies that it is valid as a
 * response from the eBrain (check it has an id).
 * NOTE: the json MUST NOT have an '}' except to end the object.
 * @return An object of form {parsed, unparseable}, where parseable is a 
 * list of all parseable objects and, unparseable is a string representing what remaining
 * bits couldn't be parsed (if such exists).
*/
function tryParseeBrainResponse(jsonString) {
  // console.log('in tryparse. Input: ' + jsonString);
  var out = {parsed: []};

  // First, try and split if there are multiple objects being returned
  var jsons = jsonString.split('\r\n');
  for (var i = 0; i < jsons.length; i++) {
    try {
      var response = JSON.parse(jsons[i]);
      if (response && typeof response === "object" && response.id) {
        out.parsed.push(response);
      }
    } catch (e) {
      // Only add a str to unparseable if it's at the end.
      if (i == jsons.length - 1) {
        out.unparseable = jsons[i];
      }
    }
  }
  return out;
}

function writeToStream(...lines) {
  // Write to output stream
  const writer = world.outputStream.getWriter();
  lines.forEach((line) => {
    console.log('[SEND]', line);
    writer.write(line + '\n');
  });
  writer.releaseLock();

}