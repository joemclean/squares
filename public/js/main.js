var context = new webkitAudioContext();
var oscillatorOneNode = context.createOscillator();
var oscillatorOneControl = context.createGainNode();
var oscillatorTwoNode = context.createOscillator();
var oscillatorTwoControl = context.createGainNode();
var outputControl = context.createGainNode();

//connect nodes
oscillatorOneNode.connect(oscillatorOneControl);
oscillatorTwoNode.connect(oscillatorTwoControl);
outputControl.connect(context.destination);

oscillatorOneNode.start(0);
oscillatorTwoNode.start(0);

oscillatorOneControl.gain.value = 1.0;
oscillatorTwoControl.gain.value = 1.0;
outputControl.gain.value = 1.0;

$(window).load(function() {

// Last updated August 2010 by Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

//Box object to hold data for all drawn rects
function Box() {
  this.x = 0;
  this.y = 0;
  this.w = 1; // default width and height
  this.control = outputControl;
  this.fill = '#444444';
  this.io = "out";
}

//Initialize a new Box, add it, and invalidate the canvas
function addRect(x, y, w, fill, control, io) {
  var rect = new Box;
  rect.x = x;
  rect.y = y;
  rect.w = w;
  rect.fill = fill;
  rect.control = control;
  rect.io = io;
  boxes.push(rect);
  invalidate();
}

// holds all our rectangles
var boxes = []; 

var canvas;
var ctx;
var WIDTH;
var HEIGHT;
var INTERVAL = 20;  // how often, in milliseconds, we check to see if a redraw is needed

var isDrag = false;
var mx, my; // mouse coordinates

 // when set to true, the canvas will redraw everything
 // invalidate() just sets this to false right now
 // we want to call invalidate() whenever we make a change
var canvasValid = false;

// The node (if any) being selected.
// If in the future we want to select multiple objects, this will get turned into an array
var mySel; 

// The selection color and width. Right now we have a red selection with a small width
var mySelColor = '#CC0000';
var mySelWidth = 2;

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
  // double click is for making new boxes
  canvas.onmousedown = myDown;
  canvas.onmouseup = myUp;
  
  // add custom initialization here:

  addRect(200, 200, 100, 'rgba(100,200,0,.5', oscillatorOneControl, "out");
  addRect(25, 90, 75, 'rgba(100,0,200,.5', oscillatorTwoControl, "out");
  addRect(300, 400, 75, 'rgba(100,0,200,.5', outputControl, "in");
}

function draw() {
  if (canvasValid == false) {
    check_collisions();
    clear(ctx);

    
    // Add stuff you want drawn in the background all the time here
    
    // draw all boxes
    var l = boxes.length;
    for (var i = 0; i < l; i++) {
        drawshape(ctx, boxes[i], boxes[i].fill);
    }
    
    // draw selection
    // right now this is just a stroke along the edge of the selected box
    if (mySel != null) {
      ctx.strokeStyle = mySelColor;
      ctx.lineWidth = mySelWidth;
      ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.w);
    }
    
    // Add stuff you want drawn on top all the time here
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

// Happens when the mouse is moving inside the canvas
function myMove(e){
  if (isDrag){
    getMouse(e);
    
    mySel.x = mx - offsetx;
    mySel.y = my - offsety;   
    
    // something is changing position so we better invalidate the canvas!
    invalidate();
  }
}

// Happens when the mouse is clicked in the canvas
function myDown(e){
  getMouse(e);
  clear(gctx);
  var l = boxes.length;
  for (var i = l-1; i >= 0; i--) {
    // draw shape onto ghost context
    drawshape(gctx, boxes[i], 'black');
    
    // get image data at the mouse x,y pixel
    var imageData = gctx.getImageData(mx, my, 1, 1);
    var index = (mx + my * imageData.width) * 4;
    
    // if the mouse pixel exists, select and break
    if (imageData.data[3] > 0) {
      mySel = boxes[i];
      offsetx = mx - mySel.x;
      offsety = my - mySel.y;
      mySel.x = mx - offsetx;
      mySel.y = my - offsety;
      isDrag = true;
      canvas.onmousemove = myMove;
      invalidate();
      clear(gctx);
      return;
    }
    
  }
  // havent returned means we have selected nothing
  mySel = null;
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

// Sets mx,my to the mouse position relative to the canvas
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

      mx = e.pageX - offsetX;
      my = e.pageY - offsetY
}

rect_collision = function(x1, y1, size1, x2, y2, size2) {
  var bottom1, bottom2, left1, left2, right1, right2, top1, top2;
  left1 = x1 - (size1/2);
  right1 = x1 + (size1/2);
  top1 = y1 - (size1/2);
  bottom1 = y1 + (size1/2);
  left2 = x2 - (size2/2);
  right2 = x2 + (size2/2);
  top2 = y2 - (size2/2);
  bottom2 = y2 + (size2/2);
  return !(left1 > right2 || left2 > right1 || top1 > bottom2 || top2 > bottom1);
};

function check_collisions () {
  var l = boxes.length;
  for (var i = 0; i < l; i++) {
    box = boxes[i]
    for (var j = 0; j < l; j++) {
      boxTwo = boxes[j]
      if (box === boxTwo) {
        //do nothing
      } else {
        if (rect_collision(box.x,box.y,box.w,boxTwo.x,boxTwo.y,boxTwo.w)) {
          console.log('overlap!');
          if (box.io == "out" && boxTwo.io == "in") {
            box.control.connect(boxTwo.control);
            console.log('connection established!');
          } else if (box.io == "in" && boxTwo.io == "out") {
            boxTwo.control.connect(box.control);
            console.log('connection established!');
          } else {
            //no compatability.
          }
        } else {
          console.log('no overlap!');
          box.control.disconnect(boxTwo.control);
          boxTwo.control.disconnect(box.control);
        };
      }
    }
  }
}

init();


});