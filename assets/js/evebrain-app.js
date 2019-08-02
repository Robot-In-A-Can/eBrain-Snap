EveBrainApp = function(ready){
  this.ready = ready;
  this.has_connected = false;
  this.init();
}

EveBrainApp.prototype.extractConfig = function(){
  var self = this;
  self.hashConfig = {};
  if(window.location.hash !== ''){
    window.location.hash.replace('#', '').split('&').map(function(el){
      var split = el.split('=');
      self.hashConfig[split[0]] = split[1];
    });
  }
}

EveBrainApp.prototype.supportsLocalStorage = function(){
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

EveBrainApp.prototype.init = function(conf){
  this.initted = false;
  this.conf = conf;
  this.connect();
}

EveBrainApp.prototype.initPersistence = function(conf){
  if(this.supportsLocalStorage()){
    this.saveMenu = new EveBrainSave(document.getElementById('save'), conf);
  }
}

EveBrainApp.prototype.connect = function(){
  var self = this;
  self.extractConfig();
  self.connState = self.hashConfig['m'] ? 'connecting' : 'not_set';
  if(self.hashConfig['m']){
    self.evebrain = new EveBrain('ws://' + self.hashConfig['m'] + ':8899/websocket');
    self.evebrain.addListener(function(r){ self.handler(r) });
  }
  self.setConnState();
}

EveBrainApp.prototype.handler = function(state){
  if(state === 'connected'){
    this.connState = 'connected';
    this.has_connected = true;
    if(!this.initted){
      this.initted = true;
      this.ready(this.evebrain);
    }
  }else if(state === 'disconnected'){
    if(!this.has_connected){
      this.connState = 'cant_connect';
    }else{
      this.connState = 'disconnected';
    }
  }
  this.setConnState();
}

EveBrainApp.prototype.configure = function(e){
  var ip = prompt("Enter the address for your EveBrain here:\n (e.g. 192.168.4.1)", this.hashConfig['m']);
  if(ip){
    window.location = '#m=' + ip;
    this.connect();
  }
  e.preventDefault();
  return false;
}

EveBrainApp.prototype.setConnState = function(){
  var self = this;
  var cs = document.querySelector('#header .connState');
  switch(this.connState){
    case 'not_set':
      cs.innerHTML = '&#10007; <a href="#">Configure EveBrain connection</a>';
      cs.querySelector('a').addEventListener('click', function(e){ self.configure(e) });
      cs.className = 'connState';
      break;
    case 'connected':
      cs.innerHTML = '&#10003; Connected to EveBrain';
      cs.className = 'connState connected';
      break;
    case 'cant_connect':
      cs.innerHTML = '&#10007; <a href="#">Can\'t connect to EveBrain<a>';
      cs.querySelector('a').addEventListener('click', function(e){ self.configure(e) });
      cs.className = 'connState error';
      break;
    case 'disconnected':
      cs.innerHTML = '&#10007; <a href="#">Reconnecting to EveBrain</a>';
      cs.querySelector('a').addEventListener('click', function(e){ self.configure(e) });
      cs.className = 'connState error';
      break;
    default:
      cs.innerHTML = '&#10007; <a href="#">Configure EveBrain connection</a>';
      cs.querySelector('a').addEventListener('click', function(e){ self.configure(e) });
      cs.className = 'connState';
      break;

  }
}