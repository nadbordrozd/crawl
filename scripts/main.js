const KEY_CODES = {
    ENTER: 13,
    SPACE: 32,
    UP: 38,
    PAGE_UP: 33,
    RIGHT: 39,
    PAGE_DOWN: 34,
    DOWN: 40,
    END: 35,
    LEFT: 37,
    HOME: 36
};

var Game = {
    display: null,
    map: {},
    engine: null,
    player: null,
    pedro: null,
    ananas: null,
    statsDisplay: null,
    frogs: [],
    rats: [],
    
    init: function() {
        // Create the main game display
        this.display = new ROT.Display({spacing:1.1});
        
        // Create the stats display above the main display
        this.statsDisplay = new ROT.Display({width: 40, height: 1, spacing: 1.1});
        
        // Add both displays to the page
        var container = document.createElement("div");
        container.appendChild(this.statsDisplay.getContainer());
        container.appendChild(this.display.getContainer());
        document.body.appendChild(container);
        
        this._generateMap();
        
        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        scheduler.add(this.pedro, true);
        
        // Add frogs to scheduler
        for (var i = 0; i < this.frogs.length; i++) {
            scheduler.add(this.frogs[i], true);
        }
        
        // Add rats to scheduler
        for (var i = 0; i < this.rats.length; i++) {
            scheduler.add(this.rats[i], true);
        }

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
        
        // Initial stats display
        this._drawStats();
    },
    
    _drawStats: function() {
        this.statsDisplay.clear();
        this.statsDisplay.draw(5, 0, "Health: " + this.player.getHealth());
    },
    
    _generateMap: function() {
        var digger = new ROT.Map.Digger();
        var freeCells = [];
        
        var digCallback = function(x, y, value) {
            if (value) { return; }
            
            var key = x+","+y;
            this.map[key] = ".";
            freeCells.push(key);
        }
        digger.create(digCallback.bind(this));
        
        this._generateBoxes(freeCells);
        this._drawWholeMap();
        
        this.player = this._createBeing(Player, freeCells);
        this.pedro = this._createBeing(Pedro, freeCells);
        
        // Create 3 frogs
        for (var i = 0; i < 3; i++) {
            this.frogs.push(this._createBeing(Frog, freeCells));
        }
        
        // Create 3 rats
        for (var i = 0; i < 3; i++) {
            this.rats.push(this._createBeing(Rat, freeCells));
        }
    },
    
    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        return new what(x, y);
    },
    
    _generateBoxes: function(freeCells) {
        for (var i=0;i<10;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this.map[key] = "*";
            if (!i) { this.ananas = key; } /* first box contains an ananas */
        }
    },
    
    _drawWholeMap: function() {
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            this.display.draw(x, y, this.map[key]);
        }
    },
    
    // Helper function to check if a position is occupied
    _isOccupied: function(x, y) {
        var key = x + "," + y;
        if (this.player && this.player.getX() === x && this.player.getY() === y) return true;
        if (this.pedro && this.pedro.getX() === x && this.pedro.getY() === y) return true;
        for (var i = 0; i < this.frogs.length; i++) {
            if (this.frogs[i].getX() === x && this.frogs[i].getY() === y) return true;
        }
        for (var i = 0; i < this.rats.length; i++) {
            if (this.rats[i].getX() === x && this.rats[i].getY() === y) return true;
        }
        return false;
    }
};

// Base Being class
var Being = function(x, y) {
    this._x = x;
    this._y = y;
}

Being.prototype.getSpeed = function() { return 100; }
Being.prototype.getX = function() { return this._x; }
Being.prototype.getY = function() { return this._y; }
Being.prototype._draw = function() {
    Game.display.draw(this._x, this._y, this._char, this._color);
}

// Player class inherits from Being
var Player = function(x, y) {
    Being.call(this, x, y);
    this._health = 5;
    this._char = "@";
    this._color = "#ff0";
    this._draw();
}
Player.prototype = Object.create(Being.prototype);
Player.prototype.constructor = Player;

Player.prototype.getHealth = function() { return this._health; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    if (code == KEY_CODES.ENTER || code == KEY_CODES.SPACE) {
        this._checkBox();
        return;
    }

    var keyMap = {};
    keyMap[KEY_CODES.UP] = 0;
    keyMap[KEY_CODES.PAGE_UP] = 1;
    keyMap[KEY_CODES.RIGHT] = 2;
    keyMap[KEY_CODES.PAGE_DOWN] = 3;
    keyMap[KEY_CODES.DOWN] = 4;
    keyMap[KEY_CODES.END] = 5;
    keyMap[KEY_CODES.LEFT] = 6;
    keyMap[KEY_CODES.HOME] = 7;

    /* one of numpad directions? */
    if (!(code in keyMap)) { return; }

    /* is there a free space? */
    var dir = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var newKey = newX + "," + newY;
    if (!(newKey in Game.map)) { return; }

    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = newX;
    this._y = newY;
    this._draw();
    Game._drawStats();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}
    
Player.prototype._checkBox = function() {
    var key = this._x + "," + this._y;
    if (Game.map[key] != "*") {
        alert("There is no box here!");
    } else if (key == Game.ananas) {
        alert("Hooray! You found an ananas and won this game.");
        Game.engine.lock();
        window.removeEventListener("keydown", this);
    } else {
        alert("This box is empty :-(");
    }
}

// Pedro class inherits from Being
var Pedro = function(x, y) {
    Being.call(this, x, y);
    this._char = "P";
    this._color = "red";
    this._draw();
}
Pedro.prototype = Object.create(Being.prototype);
Pedro.prototype.constructor = Pedro;
    
Pedro.prototype.act = function() {
    var x = Game.player.getX();
    var y = Game.player.getY();

    var passableCallback = function(x, y) {
        return (x+","+y in Game.map);
    }
    var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});

    var path = [];
    var pathCallback = function(x, y) {
        path.push([x, y]);
    }
    astar.compute(this._x, this._y, pathCallback);

    path.shift();
    if (path.length == 1) {
        Game.engine.lock();
        alert("Game over - you were captured by Pedro!");
    } else {
        x = path[0][0];
        y = path[0][1];
        Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
        this._x = x;
        this._y = y;
        this._draw();
    }
}

// Frog class inherits from Being
var Frog = function(x, y) {
    Being.call(this, x, y);
    this._char = "f";
    this._color = "green";
    this._draw();
}
Frog.prototype = Object.create(Being.prototype);
Frog.prototype.constructor = Frog;

Frog.prototype.act = function() {
    // Possible jump directions: up, right, down, left
    var directions = [
        [0, -2], // up
        [2, 0],  // right
        [0, 2],  // down
        [-2, 0]  // left
    ];
    
    // Shuffle directions randomly
    for (var i = directions.length - 1; i > 0; i--) {
        var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
        var tmp = directions[i];
        directions[i] = directions[j];
        directions[j] = tmp;
    }
    
    // Try each direction until we find a valid move
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        var midX = this._x + dir[0]/2;
        var midY = this._y + dir[1]/2;
        
        // Check if both intermediate and destination tiles are valid
        var midKey = midX + "," + midY;
        var newKey = newX + "," + newY;
        
        if (midKey in Game.map && newKey in Game.map && !Game._isOccupied(newX, newY)) {
            // Valid move found - perform the jump
            Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
            this._x = newX;
            this._y = newY;
            this._draw();
            break;
        }
    }
}

// Rat class inherits from Being
var Rat = function(x, y) {
    Being.call(this, x, y);
    this._char = "r";
    this._color = "#808080"; // Grey color
    this._draw();
}
Rat.prototype = Object.create(Being.prototype);
Rat.prototype.constructor = Rat;

Rat.prototype.act = function() {
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    // Shuffle directions randomly
    for (var i = directions.length - 1; i > 0; i--) {
        var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
        var tmp = directions[i];
        directions[i] = directions[j];
        directions[j] = tmp;
    }
    
    // Try each direction until we find a valid move
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        var newKey = newX + "," + newY;
        
        if (newKey in Game.map && !Game._isOccupied(newX, newY)) {
            // Valid move found - perform the move
            Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
            this._x = newX;
            this._y = newY;
            this._draw();
            break;
        }
    }
}

Game.init();

