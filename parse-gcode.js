//function g(gcode, eb) {

if (typeof world.plotterState === 'undefined') {
  world.plotterState = {paused: false, position:{X:0, Y:0}};
}
function badParsed(val) {
  if (isNaN(val)) {
    return !(val === undefined || val === null);
  } else {
    return false;
  }
} 

var units = "mm";
// Implemented commands:
// g1 and g0: move to the specified X and Y coordinates.
// g20: inches g21: millimeters
// M2: program end

// Unimplemented, but might implement:
// g90: absolute positioning
// g91: relative positioning

var points = [];
var lines = gcode.split(/\r?\n/);
for (l of lines) {
  // cut comment if it exists
  if (l.includes(";")) {
    l = l.split(";")[0];
  }
  if (l.startsWith("G20")) {
    units = "inches";
  } else if (l.startsWith("G21")) {
    units = "mm";
  } else if (l.startsWith("G1") || l.startsWith("G0")) {
    var line = l.split(" ");
    var point = {};
    for (const c of line) {
      if (c.startsWith("X")) {
        point.X = parseFloat(c.substring(1));
        if (units === "inches") {
          point.X *= 25.4;
        }
      } else if (c.startsWith("Y")) {
        point.Y = parseFloat(c.substring(1));
        if (units === "inches") {
          point.Y *= 25.4;
        }
      }
    }
    // if saw an X or Y but could not parse the number, stop parsing.
    if (badParsed(point.X) || badParsed(point.Y)) {
      morphicAlert("Error!", "Invalid point " + l + " for command G1");
      return new List([]);
    } else {
      // if the G1 is missing an X or Y, silently ignore it
      if (typeof point.X === 'number' && typeof point.Y === 'number') {
        points.push(point);
      }
    }
  } else if (l.startsWith("M2")) {
    break; // stop job when we see M2
  }
}
if (points.length === 0) {
  morphicAlert("Error!", "No points were found in the Gcode");
  return new List([]);
}
var Xcoords = [];
var Ycoords = [];
for (const point of points) {
  Xcoords.push(point.X);
  Ycoords.push(point.Y);
}
return new List([new List(Xcoords), new List(Ycoords)]);

//}