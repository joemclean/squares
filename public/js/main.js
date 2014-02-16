// |------------------------|
// | Audio Setup            |
// |------------------------|

var context = new webkitAudioContext();
var oscillatorOneNode = context.createOscillator();
var oscillatorOneControl = context.createGainNode();
var oscillatorTwoNode = context.createOscillator();
var oscillatorTwoControl = context.createGainNode();
var oscillatorThreeNode = context.createOscillator();
var oscillatorThreeControl = context.createGainNode();
var oscillatorFourNode = context.createOscillator();
var oscillatorFourControl = context.createGainNode();
var outputControl = context.createGainNode();
var filterNode = context.createBiquadFilter();
//connect nodes
oscillatorOneNode.connect(oscillatorOneControl);
oscillatorTwoNode.connect(oscillatorTwoControl);
oscillatorThreeNode.connect(oscillatorThreeControl);
oscillatorFourNode.connect(oscillatorFourControl);

outputControl.connect(context.destination);

oscillatorOneNode.start(0);
oscillatorTwoNode.start(0);
oscillatorThreeNode.start(0);
oscillatorFourNode.start(0);


oscillatorOneNode.type = 1;
oscillatorOneNode.frequency.value = 220;

oscillatorTwoNode.type = 2;
oscillatorTwoNode.frequency.value = 110;
oscillatorTwoNode.detune.value = 10;

oscillatorThreeNode.type = 3;
oscillatorThreeNode.frequency.value = 164.81;
oscillatorThreeNode.detune.value = 20;

oscillatorFourNode.type = 2;
oscillatorFourNode.frequency.value = 138;
oscillatorFourNode.detune.value = 5;

oscillatorOneControl.gain.value = 1;
oscillatorTwoControl.gain.value = 1;
oscillatorThreeControl.gain.value = 1;
oscillatorFourControl.gain.value = 1;
outputControl.gain.value = 1.0;

filterNode.frequency.value = 700;

$(window).load(function() {

// Many thanks to Simon Sarris, who inspired the drag and drop code.
// www.simonsarris.com

// |------------------------|
// | Node Objects           |
// |------------------------|


//Box object to hold data for all drawn rects
function Module() {
  this.x = 0;
  this.y = 0;
  this.w = 1; // default width and height
  this.control;
  this.fill = '#444444';
  this.io = "out";
  this.type;
}



//Initialize a new Node, add it, and invalidate the canvas
function addModule(x, y, w, fill, control, io, type) {
  var module = new Module;
  module.x = x;
  module.y = y;
  module.w = w;
  module.fill = fill;
  module.control = control;
  module.io = io;
  module.type = type;
  modules.push(module);
  invalidate();
}

// |------------------------|
// | Setup                  |
// |------------------------|

// holds all our rectangles
var modules = []; 

var canvas;
var ctx;
var WIDTH;
var HEIGHT;
var INTERVAL = 20;  // how often, in milliseconds, we check to see if a redraw is needed
var isDrag = false;
var mouseX, my; // mouse coordinates

var canvasValid = false; // whether canvas is up to date

var mySelection; 
var mySelectionColor = '#CC0000'; //outline color
var mySelectionWidth = 2; //outline width

// we use a fake canvas to draw individual shapes for selection testing
var ghostcanvas;
var gctx; // fake canvas context

// since we can drag from anywhere in a node
// instead of just its x/y corner, we need to save
// the offset of the mouse when we start dragging.
var offsetx, offsety;

// Padding and border style widths for mouse offsets
var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

// initialize our canvas, add a ghost canvas, set draw loop
// then add everything we want to intially exist on the canvas
function init() {
  canvas = document.getElementById('canvas');
  HEIGHT = canvas.height;
  WIDTH = canvas.width;
  ctx = canvas.getContext('2d');
  ghostcanvas = document.createElement('canvas');
  ghostcanvas.height = HEIGHT;
  ghostcanvas.width = WIDTH;
  gctx = ghostcanvas.getContext('2d');
  
  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false; }
  
  // fixes mouse co-ordinate problems when there's a border or padding
  // see getMouse for more detail
  if (document.defaultView && document.defaultView.getComputedStyle) {
    stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  
  // make draw() fire every INTERVAL milliseconds
  setInterval(draw, INTERVAL);
  
  // set our events. Up and down are for dragging,
  // double click is for making new modules
  canvas.onmousedown = myDown;
  canvas.onmouseup = myUp;
  
  // add custom initialization here:

  addModule(25, 90, 75, 'rgba(100,0,200,.5', oscillatorTwoControl, "out", "oscillator1");
  addModule(300, 400, 75, 'rgba(100,0,200,.5', oscillatorOneControl, "out", "oscillator2");
  addModule(700, 200, 75, 'rgba(100,0,200,.5', oscillatorThreeControl, "out", "oscillator3");
  addModule(500, 500, 75, 'rgba(100,0,200,.5', oscillatorFourControl, "out", "oscillator4");
  addModule(200, 200, 150, 'rgba(100,200,0,.5', outputControl, "in", "output");
  addModule(600, 300, 75, 'rgba(100,200,100,.5)', filterNode, "thru", "filter");
}

// |------------------------|
// |        Draw cycle      |
// |------------------------|

function draw() {
  if (canvasValid == false) {
    clear(ctx);

    
    // Add stuff you want drawn in the background all the time here
    
    // draw all modules
    var l = modules.length;
    for (var i = 0; i < l; i++) {
        drawshape(ctx, modules[i], modules[i].fill);
    }
    
    // draw selection
    // right now this is just a stroke along the edge of the selected box
    if (mySelection != null) {
      ctx.strokeStyle = mySelectionColor;
      ctx.lineWidth = mySelectionWidth;
      ctx.strokeRect(mySelection.x,mySelection.y,mySelection.w,mySelection.w);
      console.log(mySelection.type + ' was selected');
    }
    
    // Add stuff you want drawn on top all the time here
    check_collisions();
    canvasValid = true;
  }
}

//wipes the canvas context
function clear(c) {
  c.clearRect(0, 0, WIDTH, HEIGHT);
}

// Draws a single shape to a single context
// draw() will call this with the normal canvas
// myDown will call this with the ghost canvas
function drawshape(context, shape, fill) {
  context.fillStyle = fill;
  
  // We can skip the drawing of elements that have moved off the screen:
  if (shape.x > WIDTH || shape.y > HEIGHT) return; 
  if (shape.x + shape.w < 0 || shape.y + shape.w < 0) return;
  
  context.fillRect(shape.x,shape.y,shape.w,shape.w);
}

// |------------------------|
// | Mouse Input Processing |
// |------------------------|



// Happens when the mouse is moving inside the canvas
function myMove(e){
  if (isDrag){
    getMouse(e);
    
    mySelection.x = mouseX - offsetx;
    mySelection.y = mouseY - offsety;   
    
    // something is changing position so we better invalidate the canvas!
    invalidate();
  }
}

// Happens when the mouse is clicked in the canvas
function myDown(e){
  getMouse(e);
  clear(gctx);
  var l = modules.length;
  for (var i = l-1; i >= 0; i--) {
    // draw shape onto ghost context
    drawshape(gctx, modules[i], 'black');
    
    // get image data at the mouse x,y pixel
    var imageData = gctx.getImageData(mouseX, mouseY, 1, 1);
    var index = (mouseX + mouseY * imageData.width) * 4;
    
    // if the mouse pixel exists, select and break
    if (imageData.data[3] > 0) {
      mySelection = modules[i];
      offsetx = mouseX - mySelection.x;
      offsety = mouseY - mySelection.y;
      mySelection.x = mouseX - offsetx;
      mySelection.y = mouseY - offsety;
      isDrag = true;
      canvas.onmousemove = myMove;
      invalidate();
      clear(gctx);
      return;
    }
    
  }
  // havent returned means we have selected nothing
  mySelection = null;
  // clear the ghost canvas for next time
  clear(gctx);
  invalidate();
}

function myUp(){
  isDrag = false;
  canvas.onmousemove = null;
}

function invalidate() {
  canvasValid = false;
}

// Sets mouseX,mouseY to the mouse position relative to the canvas
// unfortunately this can be tricky, we have to worry about padding and borders
function getMouse(e) {
      var element = canvas, offsetX = 0, offsetY = 0;

      if (element.offsetParent) {
        do {
          offsetX += element.offsetLeft;
          offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
      }

      // Add padding and border style widths to offset
      offsetX += stylePaddingLeft;
      offsetY += stylePaddingTop;

      offsetX += styleBorderLeft;
      offsetY += styleBorderTop;

      mouseX = e.pageX - offsetX;
      mouseY = e.pageY - offsetY
}

// |--------------------|
// | Collision Checking |
// |--------------------|


rect_collision = function(x1, y1, size1, x2, y2, size2) {
  var bottom1, bottom2, left1, left2, right1, right2, top1, top2;
  left1 = x1;
  right1 = x1 + (size1);
  top1 = y1;
  bottom1 = y1 + (size1);
  left2 = x2;
  right2 = x2 + (size2);
  top2 = y2;
  bottom2 = y2 + (size2);
  return !(left1 > right2 || left2 > right1 || top1 > bottom2 || top2 > bottom1);
};

function check_collisions () {
  var l = modules.length;
  for (var i = 0; i < l; i++) {
    box = modules[i]
    for (var j = 0; j < l; j++) {
      boxTwo = modules[j]
      if (box !== boxTwo) {
        if (rect_collision(box.x,box.y,box.w,boxTwo.x,boxTwo.y,boxTwo.w)) {
          console.log('overlap between ' + box.type + ' and ' + boxTwo.type +'!');
          establishConnection(box, boxTwo);
        } else {
          severConnection(box, boxTwo);
        };
      }
    }
  }
}

function establishConnection (nodeOne, nodeTwo) {
  if (nodeOne.io == "out" && nodeTwo.io == "in") {
    nodeOne.control.connect(nodeTwo.control);
    console.log(nodeOne.type +' connected to ' + nodeTwo.type);


  } else if (nodeOne.io == "thru" && nodeTwo.io == "in") {
    nodeOne.control.connect(nodeTwo.control);
    console.log(nodeOne.type +' connected to ' + nodeTwo.type);

  } else if (nodeOne.io == "out" && nodeTwo.io == "thru"){
    nodeOne.control.connect(nodeTwo.control);
    console.log(nodeOne.type +' connected to ' + nodeTwo.type);
  } else {
    //no compatability.
  }
};


function severConnection (nodeOne, nodeTwo) {
  if (nodeOne.io == "out" && nodeTwo.io == "in") {
    nodeOne.control.disconnect(nodeTwo.control);
    console.log(nodeOne.type +' disconnected from ' + nodeTwo.type);

  } else if (nodeOne.io == "thru" && nodeTwo.io == "in") {
    nodeOne.control.disconnect(nodeTwo.control);
    console.log(nodeOne.type +' disconnected from ' + nodeTwo.type);

  } else if (nodeOne.io == "out" && nodeTwo.io == "thru"){
    nodeOne.control.disconnect(nodeTwo.control);
    console.log(nodeOne.type +' disconnected from ' + nodeTwo.type);

  } else {
    //no compatability.
  }
};

init();

});