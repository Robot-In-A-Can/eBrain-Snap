var Persister = function(conf){
  var self = this;
  this.namespace = window.location.pathname.replace(/\//g, '')
  window.addEventListener('beforeunload', function(){return self.handleUnload();});
  if(conf.saveHandler && typeof conf.saveHandler === 'function' && conf.loadHandler && typeof conf.loadHandler === 'function'){
    this.saveHandler = conf.saveHandler;
    this.loadHandler = conf.loadHandler;
    this.clearHandler = conf.clearHandler;
  }
  this.fileType = conf.fileType || 'txt';
  this.currentProgram = localStorage['/' + this.namespace + '/currentProgram']
  this.init();
}

Persister.prototype = {
  listeners: [],
  init: function(){
    var unsaved = localStorage['/' + this.namespace + '/unsaved'];
    if(unsaved){
      this.loadHandler(unsaved);
    }else{
      if(this.currentProgram){
        var program = localStorage['/' + this.namespace + '/programs/' + this.currentProgram]
        if(program){
          this.loadHandler(program);
        }
      }
    }  
  },
  load: function(name){
    console.log('loading ' + name);
    var program = localStorage['/' + this.namespace + '/programs/' + name]
    if(program){
      this.currentProgram = name;
      localStorage['/' + this.namespace + '/currentProgram'] = name;
      this.clearHandler();
      this.loadHandler(program);
      this.notify();
    }
  },
  handleUnload: function(){
    // compare the programs to check for differences
    if(!this.unsaved()){
      // Program has not changed so no need to store unsaved
      localStorage.removeItem('/' + this.namespace + '/unsaved');
    }else{
      // Program has changed, so save unsaved changes
      localStorage['/' + this.namespace + '/unsaved'] = this.saveHandler(this.currentProgram || 'untitled');
    }
  },
  unsaved: function(){
    return !this.currentProgram || localStorage['/' + this.namespace + '/programs/' + this.currentProgram] !== this.saveHandler(this.currentProgram);
  },
  exists: function(name){
    return typeof localStorage['/' + this.namespace + '/programs/' + name] !== 'undefined'
  },
  saveAs: function(name){
    localStorage['/' + this.namespace + '/currentProgram'] = name;
    this.currentProgram = name;
    this.saveProgram();
    this.notify();
  },
  save: function(){
    this.saveProgram();
  },
  downloadCurrent: function(){
    if(this.currentProgram){
      var blob = new Blob([this.saveHandler(this.currentProgram)], {type: "text/plain;charset=utf-8"});
      var fileName = this.namespace + '-' + this.currentProgram + '.' + this.fileType;
      saveAs(blob, fileName);
    }
  },
  delete: function(program){
    if(localStorage['/' + this.namespace + '/currentProgram'] === program){
      localStorage.removeItem('/' + this.namespace + '/currentProgram');
    }
    localStorage.removeItem('/' + this.namespace + '/programs/' + program);
    this.currentProgram = undefined;
    this.clearHandler();
    this.notify();
  },
  new: function(){
    this.currentProgram = undefined;
    this.clearHandler();
    this.notify();
  },
  saveProgram: function(){
    localStorage['/' + this.namespace + '/programs/' + this.currentProgram] = this.saveHandler(this.currentProgram);
  },
  notify: function(){
    for(var i in this.listeners){
      if(this.listeners.hasOwnProperty(i)){
        this.listeners[i]();
      }
    }
  },
  subscribe: function(cb){
    this.listeners.push(cb);
  },
  fileList: function(){
    var files = [];
    var prefix = '/' + this.namespace + '/programs/';
    for(var i=0; i< localStorage.length; i++){
      var name = localStorage.key(i);
      if(name.startsWith(prefix)){
        files.push(name.replace(prefix, ''));
      }
    }
    return files;
  }
}