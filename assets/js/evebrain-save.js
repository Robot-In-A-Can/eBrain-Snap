EveBrainSave = function(el, conf){
  this.el = el;
  this.persister = new Persister(conf);
  this.init();
}

EveBrainSave.prototype.createMenuItem = function(text, cb){
  var li = document.createElement('li');
  li.innerText = text;
  li.addEventListener('click', cb);
  return li
}

EveBrainSave.prototype.createFileMenu = function(menu){
  var self = this;
  var progs_ul = menu.querySelector('ul#progs')
  if(!progs_ul){
    var progs_ul = document.createElement('ul');
    progs_ul.id = 'progs';
    menu.appendChild(progs_ul);
  }else{
    progs_ul.innerHTML = '';
  }
  
  this.persister.fileList().map(function(f){
    progs_ul.appendChild(self.createMenuItem(f, function(){ self.openProgram(f);}));
  });
}

EveBrainSave.prototype.setSaveFilename = function(name){
  var title = this.el.querySelector('.title');
  if(name){
    title.innerText = '['+name+']';
  }else{
    title.innerText = '';
  }
}

EveBrainSave.prototype.handleUpdate = function(){
  this.setSaveFilename(this.persister.currentProgram);
  this.createFileMenu(document.getElementById('save'));  
}

EveBrainSave.prototype.init = function(){
  var self = this;
  this.el.innerHTML = '&#10515; Save Program <span class="title"></span>';
  if(this.persister.currentProgram){ this.setSaveFilename(this.persister.currentProgram);}
  this.persister.subscribe(function(){self.handleUpdate();});
  var wrap = document.createElement('div');
  wrap.className = 'wrapper';
  this.el.appendChild(wrap);
  var menu = document.createElement('ul');
  menu.id="saveMenu";
  menu.appendChild(this.createMenuItem('Save', function(){ self.saveHandler();}));
  menu.appendChild(this.createMenuItem('Save as...', function(){ self.saveAsHandler();}));
  menu.appendChild(this.createMenuItem('New program', function(){ self.newHandler();}));
  menu.appendChild(this.createMenuItem('Delete program', function(){ self.deleteHandler();}));
  menu.appendChild(this.createMenuItem('Download current program', function(){ self.downloadHandler();}));
  var uploader = document.createElement('input');
  uploader.type = 'file';
  uploader.id = "uploader";
  wrap.appendChild(uploader);
  uploader.addEventListener('change', function(e){ self.uploadFileHandler(e) }, false);
  menu.appendChild(this.createMenuItem('Upload program', function(){ self.uploadHandler();}));
  
  var progs_li = document.createElement('li');
  progs_li.innerText = "Open program:"
  progs_li.className = 'inactive';
  menu.appendChild(progs_li);
  wrap.appendChild(menu);
  
  this.createFileMenu(wrap);
  
  this.el.addEventListener('click', function(){
    if(self.el.className === 'show'){
      self.el.className = ''
    }else{
      self.el.className = "show";
    }
  });
  this.el.addEventListener('mouseleave', function(){ self.el.className = "";});
  window.addEventListener("keydown", function(e){ self.handleKeyboard(e);}, false);
}

EveBrainSave.prototype.handleKeyboard = function(e){
  if(e.keyCode === 83 && e.metaKey){
    this.saveHandler();
    e.preventDefault();
    return false;
  }
}

EveBrainSave.prototype.saveHandler = function(){
  if(this.persister.currentProgram){
    this.persister.save();
  }else{
    this.saveAsHandler();
  }
}

EveBrainSave.prototype.saveAsHandler = function(){
  var filename = window.prompt("Choose the file name");
  if(filename && filename !== ''){
    if(this.persister.exists(filename)){
      alert("Error, file already exists with this name");
    }else{
      this.persister.saveAs(filename);
    }
  }
}

EveBrainSave.prototype.uploadHandler = function(){
  if(this.checkSaved()){
    document.getElementById('uploader').click();
  }
}

EveBrainSave.prototype.uploadFileHandler = function(e){
  var self = this;
  e.stopPropagation();
  e.preventDefault();
  if(typeof e.dataTransfer !== 'undefined'){
    var files = e.dataTransfer.files;
  }else if(typeof e.target !== 'undefined'){
    var files = e.target.files;
  }
  if(files.length > 1) return alert("Please select a single file to upload");
  
  // Read the file
  var r = new FileReader(files[0]);
  r.onload = function(e) { self.loadFromFile(e.target.result) }
  r.readAsText(files[0]);
  
  return false;
}

EveBrainSave.prototype.loadFromFile = function(content){
  this.persister.new();
  this.persister.loadHandler(content);
}

EveBrainSave.prototype.checkSaved = function(){
  if(this.persister.unsaved()){
    return window.confirm("You have unsaved changes which will be lost. Do you want to continue?.")
  }
  return true;
}

EveBrainSave.prototype.newHandler = function(){
  if(this.checkSaved()){
    this.persister.new();
  }
}

EveBrainSave.prototype.downloadHandler = function(){
  this.persister.downloadCurrent();
}

EveBrainSave.prototype.deleteHandler = function(){
  var filename = this.persister.currentProgram;
  if(filename && filename !== ''){
    if(confirm("Are you sure you want to delete program '" + filename + "'? This is permanent and cannot be undone.")){
      this.persister.delete(filename);
    }
  }
}

EveBrainSave.prototype.openProgram = function(filename){
  if(this.checkSaved()){
    if(filename && filename !== '') this.persister.load(filename);
  }
}