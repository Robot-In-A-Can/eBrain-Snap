function gcodeToPoints(gcode, wheelDiameter, stepsPerTurn) {
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
    Xcoords.push(Math.round(convertMMToSteps(point.X, wheelDiameter, stepsPerTurn)));
    Ycoords.push(Math.round(convertMMToSteps(point.Y, wheelDiameter, stepsPerTurn)));
  }
  return new List([new List(Xcoords), new List(Ycoords)]);
}


PlotterState = function() {
  this.paused = false;
  this.position = new PlotterCoordinate();
  // both of these are only used by the gcode code,
  // so they are in STEPS only.
  this.goalPoint = new GoalPoint(new PlotterCoordinate(), 0, 0);
  this.pausedPosition = {X:0, Y:0};
  this.inJob = false;
  this.savePausedPosition = function(eb) {
    // Save the plotter's current position into its tracked position.
    // Note that the plotter is allowed to move between paused and unpaused.
    this.position.X.setSteps(this.goalPoint.X - (this.goalPoint.Xdir * eb.lastPausedState.leftMotorRemaining));
    this.position.Y.setSteps(this.goalPoint.Y - (this.goalPoint.Ydir * eb.lastPausedState.rightMotorRemaining));
    // Save the current, paused position. This is where the plotter will return to when unpaused.
    this.pausedPosition = {};
    this.pausedPosition.X = this.position.X.getSteps();
    this.pausedPosition.Y = this.position.Y.getSteps();
  }
  this.setGoalPoint = function(X, Y) {
    this.goalPoint = new GoalPoint(this.position, X, Y);
  }
}

PlotterCoordinate = function() {
  this.X = new PlotterValue();
  this.Y = new PlotterValue();
}
function GoalPoint(position, X, Y) {
  this.Xdir = X - position.X.getSteps() > 0 ? 1 : -1;
  this.Ydir = Y - position.Y.getSteps() > 0 ? 1 : -1;
  this.X = X;
  this.Y = Y;
}

const PlotterValueProto = {
  setSteps: function(value) {
    this.value = value;
  },
  getSteps: function() {
    return this.value;
  },
  incrementSteps: function(value) {
    this.value += value;
  },
  setMM: function(value, wheelDiameter, stepsPerTurn) {
    this.value = convertMMToSteps(value, wheelDiameter, stepsPerTurn);
  },
  getMM: function(wheelDiameter, stepsPerTurn) {
    return convertStepsToMM(this.value, wheelDiameter, stepsPerTurn);
  },
  incrementMM: function(value, wheelDiameter, stepsPerTurn) {
    this.value += convertMMToSteps(value, wheelDiameter, stepsPerTurn);
  }
}

function PlotterValue() {
  this.value = 0;
}

PlotterValue.prototype = PlotterValueProto;
PlotterValue.prototype.constructor = PlotterValue;

function convertMMToSteps(value, wheelDiameter, stepsPerTurn) {
  return value * (stepsPerTurn / (Math.PI * wheelDiameter));
}

function convertStepsToMM(value, wheelDiameter, stepsPerTurn) {
  return value / (stepsPerTurn / (Math.PI * wheelDiameter));
}
// Create the plotter state object
world.plotterState = new PlotterState();

world.modifiedPlotter = true;