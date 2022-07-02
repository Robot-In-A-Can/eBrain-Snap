var escapable = /[\x00-\x1f\ud800-\udfff\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufff0-\uffff]/g;
var attempts = 0;
var eb;
var ebUSB;
// this is used by some RIAC Snap blocks to send a signal to snap when
// they are done waiting.
world.moveons = {};

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
 * call the send function, which subclasses need to define.
 * Methods required to implement: send_msg.
 * 
 * NOTE: the API for callbacks here is: state (usually started 
 * or complete), message (the returned message from the robot), optional.
 * Optional is not passed usually, so it is undefined (except when stop() is used).
 */
var ParentEveBrain = function() {
  this.digitalSensor = [];
  this.robot_state = 'idle';
  this.cbs = {};
  this.msg_stack = [];
  this.analogSensor = {level: null};
  this.distanceSensor = {level: null};
  this.tempSensor = {level: null};
  this.humidSensor = {level: null};
  this.compassSensor = {x: null, y: null, z: null};
  this.config = null;
  this.sensorState = {};
  this.eBrainVersion = null;
  this.lastPausedState = null;
}

ParentEveBrain.prototype = {
  constructor: ParentEveBrain,

  /**
   * Deals with the callback, and queues up the message to be sent to ebrain.
   * If the command is not 'important' (ie not 'stop', etc) or it is a command 
   * that runs immediately, like 'pinServo', it is queued up.
   * The subclasses must call process_msg_queue when the robot is idle to
   * make sure queued messages are indeed sent, and must shift() the queue once 
   * a response is received.
   * @param msg Message to send
   * @param cb callback for message
   */
  send: function(msg, cb){
    msg = filterUnicode(msg);
    msg.id = Math.random().toString(36).substring(2, 12);
    if(cb){
      this.cbs[msg.id] = cb;
    }
    if(msg.arg && msg.arg.toString() != '[object Object]') {
      msg.arg = msg.arg.toString();
    }
    if(['stop', 'pause', 'resume', 'ping', 'version', 'pinServo'].indexOf(msg.cmd) >= 0){
      this.send_msg(msg);
    }else{
      this.msg_stack.push(msg);
      this.process_msg_queue();
    }
  },

  process_msg_queue: function(){
    if(this.robot_state === 'idle' && this.msg_stack.length > 0){
      this.robot_state = 'receiving';
      this.send_msg(this.msg_stack[0]);
    }
  },

  clearMessagesCallbacks: function() {
    this.cbs = {};
    this.msg_stack = [];
  },

  version: function(cb){
    this.send({cmd:'version'}, cb);
  },


  getVersion: function(cb) {
    var self = this;
    this.send({cmd:'version'}, function(state, msg) {
      if (state === 'complete' && undefined !== msg) {
        self.eBrainVersion = msg.msg;
      }
      cb(state, msg);
    });
  },

  stop: function(cb){
    var self = this;
    this.send({cmd:'stop'}, function(state, msg, recursion){
      if(state === 'complete' && !recursion){
        for(var i in self.cbs){
          // console.log('calling callback ' + self.cbs[i]);
          self.cbs[i]('complete', undefined, true);
        }
        self.robot_state = 'idle';
        cb(state, msg);
        self.clearMessagesCallbacks();
      }
    });
  },
  /**
   * Initiates wifi scan.
   * @param {function} callback Called when info on the WiFi networks is received.
   */
  wifiScan: function(callback) {
    var self = this;
    this.send({cmd: "startWifiScan"}, null); // don't need a callback when the scan has started
    this.cbs['wifiScan'] = function(state, message) {
      callback(state, message); // chain given callback
    }
  },

  connect_to_network: function(SSID, PASS, callback) {
    this.send({cmd: 'setConfig', arg: {sta_ssid: SSID, sta_pass: PASS}}, callback);
  },

  setWheelDimensions: function(wheelDiameter, wheelDistance, callback) {
    this.send({cmd: 'setConfig', arg: {'wheelDiameter': wheelDiameter, 'wheelDistance': wheelDistance}}, callback);
  },

  postToServer: function (onOff, server_host, sec, temp, dist, callback) {
    onOff = onOff === 'On' ? 1 : 0;
    this.send({
      cmd: "postToServer",
      arg: { "onOff": onOff, "server": server_host, "time": sec, "toggleTempHumidity":temp,"toggleDistance":dist }
    }, callback);
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

  digitalNotify: function(pin_number, cb) {
    var self = this;
    this.send({cmd: 'digitalNotify', arg:pin_number}, cb);
  },

  digitalStopNotify: function(pin_number, cb) {
    // Remove the pin status from sensorState
    var index = 'pin_' + pin_number + '_status';
    delete this.sensorState[index];
    this.send({cmd: 'digitalStopNotify', arg:pin_number}, cb);
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

  compass: function(cb){
    var self = this;
    this.send({cmd: 'compassSensor'}, function(state, msg){
      cb(state, msg);
      if(state === 'complete' && undefined != msg){
        self.compassSensor.x = msg.X;
        self.compassSensor.y = msg.Y;
        self.compassSensor.z = msg.Z;
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

  getConfig: function(callback) {
    var self = this;
    this.send({cmd: 'getConfig'}, function(state, msg) {
      if(state === 'complete' && undefined != msg){
        self.config = msg.msg;
      }
      callback(state, msg);
    });
  },

  setServo: function(servoNum, angle, callback) {
    if (servoNum == 1) { // This is delierately a loose comparison
      this.send({cmd: "servo", arg: angle}, callback);
    } else if (servoNum == 2) {
      this.send({cmd: "servoII", arg: angle}, callback);
    }
  },

  pinServo: function(pin, angle, callback) {
    this.send({cmd: "pinServo", arg: {pin: pin, angle:angle}}, callback);
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

  advancedMove: function(leftDistance, leftSpeed, rightDistance, rightSpeed, cb) {
    this.send({cmd: "speedMove", arg: {"leftDistance": leftDistance, "leftSpeed": leftSpeed,
    "rightDistance": rightDistance, "rightSpeed": rightSpeed}}, cb);
  },

  advancedMoveSteps: function(leftDistance, leftSpeed, rightDistance, rightSpeed, cb) {
    this.send({cmd: "speedMoveSteps", arg: {"leftSteps": leftDistance, "leftSpeed": leftSpeed,
    "rightSteps": rightDistance, "rightSpeed": rightSpeed}}, cb);
  },

  calibrateSlack: function(slackAmount, cb) {
    this.send({cmd:"calibrateSlack", arg: slackAmount}, cb);
  },

  pause: function(cb){
    var self = this;
    this.send({cmd:'pause'}, function(state, msg) {
      if (state === 'complete' && msg) {
        // put the remaining millimeters in this ebrain object
        self.lastPausedState = msg.msg;
      }
      cb(state, msg);
    });
  },

  resume: function(cb){
    this.send({cmd:'resume'}, cb);
  }
}

var EveBrain = function(url){
  ParentEveBrain.call(this);
  this.url = url;
  this.initializeAndConnect();
  this.cbs = {};
  this.listeners = [];
  this.wifiNetworks = {};
}

EveBrain.prototype = {

  connected: false,
  error: false,
  timeoutTimer: undefined,

  /**
   * Called by the connect block. Performs initialization
   * to ensure that the disconnected dialogs behave as expected,
   * and attempts to connect to the ebrain
   */
  initializeAndConnect: function() {
    // Stores whether the ebrain was connected once at least once since executing 
    // the Connect block. Prevents the disconnected dialog from showing when using the Connect block.
    this.wasConnectedOnce = false;
    // also prevents the disconnected dialog from showing when using the Connect
    attempts = 0;
    this.connect();
  },

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
        self.wasConnectedOnce = true;
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
              self.ws.close();
            }
            catch(error) {
              console.log(error);
            }
          } 
        }, 1000);
        // checks that the robot was connected at least once over wifi, and is not connected by USB
      } else if (this.wasConnectedOnce && eb) {
        // on the last attempt, show the disconnected message.
        if (SnapTranslator.language.startsWith('fr')) {
          morphicAlert("Robot déconnecté",
          "Connexion WiFi au robot interrompu!", "S'il te plaît, reconnecte avec le bloc Connecter et reprends l'exécution.");
        } else {
          morphicAlert("Robot Disconnected!",
            "Robot disconnected by WiFi!", "Please reconnect using the Connect block and unpause.");
        }
        world.moveon = 1;
        world.children[0].stage.threads.pauseAll();
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
        // If at the end of the attempts and was connected at least once, 
        // show the user an alert and pause their code.
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
    console.log("websocket error: " + JSON.stringify(err));
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

  ping: function(cb){
    this.send({cmd:'ping'}, cb);
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
        if (this.cbs[msg.id]) {
          this.cbs[msg.id]('notify', msg);
          delete this.cbs[msg.id];
        }
        return;
      }
      if(this.msg_stack.length > 0 && this.msg_stack[0].id == msg.id){
        if(msg.status === 'accepted'){
          if(this.cbs[msg.id]){
            this.cbs[msg.id]('started', msg);
          }
          this.robot_state = 'running';
        } else {
          // this branch does the same thing in the event of 'complete', 'error' etc
          // statuses, since otherwise if a command returns an error this object will be
          // in an inconsistent state, where the only way to get out of it is to
          // run the stop() block.
          if(this.cbs[msg.id]){
            this.cbs[msg.id](msg.status, msg);
            delete this.cbs[msg.id];
          }
          this.msg_stack.shift();
          if(this.msg_stack.length === 0){
            this.broadcast('program_complete');
          }
          this.robot_state = 'idle';
          this.process_msg_queue();
        }
      } else {
        // here: if it's something like a version command, that bypasses the msg_stack
        if(this.cbs[msg.id]){
          this.cbs[msg.id]('complete', msg);
          delete this.cbs[msg.id];
        }
      }
      
      if (msg.status === 'error') {
        morphicAlert("Error", msg['msg']); // Alert user about error
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

// Add the movement functions to the EveBrain prototype
for (parentMemberName in ParentEveBrain.prototype) {
  EveBrain.prototype[parentMemberName] = ParentEveBrain.prototype[parentMemberName];
}


var EveBrainUSB = function() {
  ParentEveBrain.call(this);
  this.cbs = {};
  // Initially, set connected to true if there is a port.
  if (world.port) {
    this.connected = true;
  } else {
    this.connected = false;
  }
};

EveBrainUSB.prototype = Object.create(ParentEveBrain.prototype);
Object.defineProperty(EveBrainUSB.prototype, 'constructor', {
  value: EveBrainUSB,
  enumerable: false,
  writable: true
});

EveBrainUSB.prototype.send_msg = function(message, callback) {
  message = filterUnicode(message);
  writeToStream(JSON.stringify(message));
}

/**
 * Runs the callback associated with the given message and manages
 * the robot's state.
 * @param message Message from ebrain
 */
EveBrainUSB.prototype.doCallback = function(message) {
  if(message && message.status === 'notify'){
    this.sensorState[message.id] = message.msg;
    if (this.cbs[message.id]) {
      this.cbs[message.id]('notify', message);
      delete this.cbs[message.id];
    }
    return;
  }

  if(this.msg_stack.length > 0 && this.msg_stack[0].id == message.id){
    if(message && message.status == 'accepted') {
      this.robot_state = 'running';
      if(this.cbs[message.id]){
        this.cbs[message.id]('started', message);
      }
    } else {
      // this branch does the same thing in the event of 'complete', 'error' etc
      // statuses, since otherwise if a command returns an error this object will be
      // in an inconsistent state, where the only way to get out of it is to
      // run the stop() block.
      if (this.cbs[message.id]) {
        this.cbs[message.id](message.status, message);
        delete this.cbs[message.id];
      }
      this.robot_state = 'idle';
      this.msg_stack.shift(); // Pop message that prompted this response off queue
      this.process_msg_queue();
    }
  } else {
    // here: if it's something like a version command, that bypasses the msg_stack
    if(this.cbs[message.id]){
      this.cbs[message.id]('complete', message);
      delete this.cbs[message.id];
    }
  }

  if (message && message.status === 'error') {
    morphicAlert("Error", message.msg);
  }
}

/**
 * Tests the connection. If the robot is connected, will
 * (async) set this.connected = true (once the robot responds).
 * Sets this.connected = false at the start.
 */
EveBrainUSB.prototype.testConnection = function() {
  this.connected = false;
  var self = this;
  this.version(function(status, msg) {
    if (status === 'complete') {
      self.connected = true;
    }
  });
}

let inputDone;
let outputDone;
world.outputStream = undefined; // Set this to undefined so it is easy to check for its existence

async function USBconnect() {
  // Request & open port here.
  world.port = await navigator.serial.requestPort();
  if (ebUSB) {
    ebUSB.connected = true;
  }
  // Wait for the port to open.
  await world.port.open({ baudRate: 230400 });

  // on disconnect, alert user and pause Snap!
  world.port.addEventListener('disconnect', event => {
    if (ebUSB) {
      ebUSB.connected = false; // signal disconnection to other code.
    }
    if (SnapTranslator.language.startsWith('fr')) {
      morphicAlert("Robot déconnecté!",
      "Connexion USB au robot interrompu!", "S'il te plaît reconnecte avec le bloc Connecter et reprends l'exécution.");
    } else {
      morphicAlert("Robot Disconnected!", 
      "Robot disconnected by USB!", "Please reconnect using the Connect block and unpause.");
    }
    world.moveon = 1;
    world.children[0].stage.threads.pauseAll();
  });

  // Setup the output stream
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(world.port.writable);
  world.outputStream = encoder.writable;

  // Make stream
  let decoder = new TextDecoderStream();
  inputDone = world.port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable;

  world.reader = inputStream.getReader();
  readLoop(); // Start infinite read loop
}

/**
 * This reads from the serial in a loop, and 
 * runs the given callbacks (using ebUSB).
 */
async function readLoop() {
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
          if (ebUSB) {
            ebUSB.doCallback(message);
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
}

/**
 * Tries to parse string as json. Also verifies that it is valid (check it has an id).
 * NOTE: the json MUST end with '\r\n'
 * @return An object of form {parsed, unparseable}, where parseable is a 
 * list of all parseable objects and, unparseable is a string representing what remaining
 * bits couldn't be parsed (if such exists).
*/
function tryParseeBrainResponse(jsonString) {
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

// https://forum.snap.berkeley.edu/t/how-do-i-make-a-dialog-box-with-custom-buttons/6347/4
/**
 * Creates a red morhpic dialog and shows it to the user, with one 'Close' button.
 * If there is another alert with the same title and message, this one will not be shown.
 * NOTE: this uses non bold text, otherwise the text is clipped.
 * @param {string} title Title for the dialog
 * @param {String} message Rest parameters of lines to show in the body of the dialog.
 * If it does not contain Strings, calls toString on it.
 */
function morphicAlert(title, ...messages) {
  morphicDialog(new Color(255, 0, 0, 1), title, ...messages);
}
/**
 * Creates a morhpic dialog and shows it to the user, with one 'Close' button.
 * If there is another alert with the same title and message, this one will not be shown.
 * NOTE: this uses non bold text, otherwise the text is clipped.
 * @param {Color} color The title bar color.
 * @param {string} title Title for the dialog
 * @param {String} message Rest parameters of lines to show in the body of the dialog.
 * If it does not contain Strings, calls toString on it.
 */
function morphicDialog(color, title, ...messages) {
  if (Array.isArray(messages) && messages.length > 0) {
    var message = "";
    for (var i = 0; i < messages.length - 1; i++) {
      message += messages[i] + "\n";
    }
    message += messages[messages.length - 1];
    morphicAlertString(title, message, color);
  } else if (typeof messages === "string") {
    morphicAlertString(title, messages, color);
  } else if (messages === null || messages === undefined) {
    morphicAlertString(title, "[Error message is missing. Please report that this happened to the developers.]", color);
  } else {
    morphicAlertString(title, messages.toString(), color);
  }
}

var activeAlerts = new Map();

/**
 * Creates a morhpic dialog and shows it to the user, with one 'Close' button.
 * NOTE: use morphicAlert instead, it has more robust type checking.
 * @param {string} title Title for the dialog
 * @param {string} message Message in the body of the dialog
 * @param {Color} color Colour of the title bar, red by default.
 */
 function morphicAlertString(title, message, color) {
  var alertContents = title + message;
  if (activeAlerts.get(alertContents) !== undefined) {
    // don't create a dialog if an identical one exists.
    return;
  }

  let box = new DialogBoxMorph(); // make dialog
  // add label (in the weirdest way imaginable)
  box.labelString = title;
  box.createLabel();
  const addLabel = function (text, type) {
    let txt = new TextMorph(text);
    // Text should be bold to match the snap style but has to be 
    // false here, otherwise the text overflows.
    txt.isBold = false;
    box['add' + type](txt);
  }
  addLabel(message, 'Body') // do not change the second input of these
  box.titleBarColor = color || new Color(255, 0, 0, 1); // Make titlebar red if not specified.
  box.titlePadding = 12; // make titlebar taller

  // Add this box to the activeAlerts map, and make the close button work.
  activeAlerts.set(alertContents, box);
  box.cancelAndProcess = function() {
    box.ok();
    activeAlerts.delete(alertContents);
  }
  // This button will close the dialog and remove it from the list of active alerts
  box.addButton('cancelAndProcess', 'Close');
  box.fixLayout(); // required, otherwise box looks weird
  box.popUp(world); // popup box
}
