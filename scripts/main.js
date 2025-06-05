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

// Configuration for enemy counts - easy to modify
const ENEMY_CONFIG = {
    PEDRO_COUNT: 1,
    FROG_COUNT: 5,
    RAT_COUNT: 5,
    SNAIL_COUNT: 5,
    MADFROG_COUNT: 5,
    MADRAT_COUNT: 25
};

var Game = {
    display: null,
    map: {},
    engine: null,
    player: null,
    enemies: [], // Single array for all enemies
    ananas: null,
    statsDisplay: null,
    messageDisplay: null,
    messageHistory: [],
    
    init: function() {
        // Create the main game display
        this.display = new ROT.Display({spacing:1.1});
        
        // Create the stats display above the main display
        this.statsDisplay = new ROT.Display({width: 80, height: 1, spacing: 1.1});
        
        // Create the message display below the main display
        this.messageDisplay = new ROT.Display({
            width: 80, 
            height: 10, 
            spacing: 1.1,
            fg: "#fff",
            bg: "#000",
            forceSquareRatio: false,
            textAlign: "left"
        });
        
        // Add all displays to the page in order
        var container = document.createElement("div");
        container.appendChild(this.statsDisplay.getContainer());
        container.appendChild(this.display.getContainer());
        container.appendChild(this.messageDisplay.getContainer());
        document.body.appendChild(container);
        
        this._generateMap();
        
        // Create a new scheduler and engine
        var scheduler = new ROT.Scheduler.Simple();
        
        // Add player to scheduler
        scheduler.add(this.player, true);
        
        // Add all enemies to scheduler
        for (var i = 0; i < this.enemies.length; i++) {
            scheduler.add(this.enemies[i], true);
        }

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
        
        // Initial stats display
        this._drawStats();
        
        // Initial welcome message
        this.message("Welcome to the dungeon! Find the ananas and escape!");
    },
    
    _drawStats: function() {
        this.statsDisplay.clear();
        if (this.player) {
            this.statsDisplay.drawText(0, 0, "Health: " + this.player.getHealth());
        } else {
            this.statsDisplay.drawText(0, 0, "Health: 0 (DEAD)");
        }
    },
    
    // Add a message to the message display
    message: function(text) {
        // Add the new message to the history
        this.messageHistory.unshift(text);
        // Keep only the last 10 messages
        if (this.messageHistory.length > 10) {
            this.messageHistory.pop();
        }
        
        // Clear and redraw the message display
        this.messageDisplay.clear();
        
        // Display the messages with explicit left positioning
        for (var i = 0; i < this.messageHistory.length; i++) {
            // Draw text starting at the leftmost position (x=0)
            this.messageDisplay.drawText(0, i, this.messageHistory[i]);
        }
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
        
        // Create Pedro(s) and add to enemies array
        for (var i = 0; i < ENEMY_CONFIG.PEDRO_COUNT; i++) {
            this.enemies.push(this._createBeing(Pedro, freeCells));
        }
        
        // Create frogs
        for (var i = 0; i < ENEMY_CONFIG.FROG_COUNT; i++) {
            this.enemies.push(this._createBeing(Frog, freeCells));
        }
        
        // Create rats
        for (var i = 0; i < ENEMY_CONFIG.RAT_COUNT; i++) {
            this.enemies.push(this._createBeing(Rat, freeCells));
        }
        
        // Create snails
        for (var i = 0; i < ENEMY_CONFIG.SNAIL_COUNT; i++) {
            this.enemies.push(this._createBeing(Snail, freeCells));
        }
        
        // Create mad frogs
        for (var i = 0; i < ENEMY_CONFIG.MADFROG_COUNT; i++) {
            this.enemies.push(this._createBeing(MadFrog, freeCells));
        }
        
        // Create mad rats
        for (var i = 0; i < ENEMY_CONFIG.MADRAT_COUNT; i++) {
            this.enemies.push(this._createBeing(MadRat, freeCells));
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
        
        for (var i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].getX() === x && this.enemies[i].getY() === y) return true;
        }
        
        return false;
    },
    
    // Add a method to Game to debug the current state
    _debugState: function() {
        console.log("Enemies in array:", this.enemies.length);
        console.log("Current scheduler:", this.engine._scheduler);
    }
};

// Base Being class
var Being = function(x, y) {
    this._x = x;
    this._y = y;
    this._health = 1; // Default health value
    this._strength = 1; // Default strength value
    this._name = "being"; // Default name
}

Being.prototype.getSpeed = function() { return 100; }
Being.prototype.getX = function() { return this._x; }
Being.prototype.getY = function() { return this._y; }
Being.prototype.getHealth = function() { return this._health; }
Being.prototype.getStrength = function() { return this._strength; }
Being.prototype.getName = function() { return this._name; }
Being.prototype._draw = function() {
    Game.display.draw(this._x, this._y, this._char, this._color);
}

// Add takeDamage method to Being prototype
Being.prototype.takeDamage = function(amount) {
    this._health -= amount;
    // If health drops to 0 or below, the being dies
    if (this._health <= 0) {
        this.die();
        return true; // Return true if the being died
    }
    
    return false; // Return false if the being is still alive
}

// Add die method to base Being class
Being.prototype.die = function() {
    // Clear the being from the map display
    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    
    // Remove from appropriate array based on type
    if (this instanceof Player) {
        Game.player = null;
        Game.engine.lock();
        Game.message("Game over - you have died!");
        window.removeEventListener("keydown", this);
    } else {
        // Remove from enemies array
        var index = Game.enemies.indexOf(this);
        if (index !== -1) Game.enemies.splice(index, 1);
    }
    
    // Remove from scheduler if it exists
    if (Game.engine && Game.engine._scheduler) {
        try {
            Game.engine._scheduler.remove(this);
        } catch (e) {
            console.log("Error removing from scheduler:", e);
        }
    }
}

// Player class inherits from Being
var Player = function(x, y) {
    Being.call(this, x, y);
    this._health = 5; // Override default health for player
    this._strength = 1; // Player's strength
    this._name = "player";
    this._char = "@";
    this._color = "#ff0";
    this._draw();
}
Player.prototype = Object.create(Being.prototype);
Player.prototype.constructor = Player;

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    if (code == KEY_CODES.ENTER) {
        this._checkBox();
        Game._drawStats();
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
        return;
    }
    
    if (code == KEY_CODES.SPACE) {
        // Check surroundings and skip turn
        this._checkSurroundings(this._x, this._y);
        Game.message("You look around carefully...");
        Game._drawStats();
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
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

    // Check for enemies at the target position
    var targetEnemy = null;
    for (var i = 0; i < Game.enemies.length; i++) {
        var enemy = Game.enemies[i];
        if (enemy.getX() === newX && enemy.getY() === newY) {
            targetEnemy = enemy;
            break;
        }
    }

    // If there's an enemy, attack it instead of moving
    if (targetEnemy) {
        // Player attacks enemy with their strength
        var killed = targetEnemy.takeDamage(this._strength);
        if (killed) {
            Game.message("You defeated the " + targetEnemy.getName() + "!");
        } else {
            Game.message("You hit the " + targetEnemy.getName() + "!");
        }
        // Player stays in place
    } else {
        // Check for nearby creatures and provide messages
        this._checkSurroundings(newX, newY);

        // Move player
        Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
        this._x = newX;
        this._y = newY;
        this._draw();
    }
    
    Game._drawStats();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

// Add a method to check surroundings and provide contextual messages
Player.prototype._checkSurroundings = function(newX, newY) {
    for (var i = 0; i < Game.enemies.length; i++) {
        var enemy = Game.enemies[i];
        var dx = Math.abs(enemy.getX() - newX);
        var dy = Math.abs(enemy.getY() - newY);
        
        if (dx <= 2 && dy <= 2) {
            if (enemy instanceof Frog) {
                Game.message("You hear a frog croaking nearby.");
            } else if (enemy instanceof Rat) {
                Game.message("You hear rats scurrying in the darkness.");
            } else if (enemy instanceof Pedro) {
                Game.message("You can hear Pedro's footsteps nearby!");
            }
            return;
        }
    }
}

Player.prototype._checkBox = function() {
    var key = this._x + "," + this._y;
    if (Game.map[key] != "*") {
        Game.message("There is no box here!");
    } else if (key == Game.ananas) {
        Game.message("Hooray! You found an ananas and won this game.");
        Game.engine.lock();
        window.removeEventListener("keydown", this);
    } else {
        Game.message("This box is empty :-(");
    }
}

// Pedro class inherits from Being
var Pedro = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "Pedro";
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

    path.shift(); // Remove Pedro's current position
    
    if (path.length === 0) {
        // This should not normally happen, but handle it gracefully
        return;
    }
    
    if (path.length === 1) {
        // Pedro is adjacent to the player, attack instead of moving
        Game.message("Pedro hits you!");
        Game.player.takeDamage(this._strength);
        Game._drawStats(); // Update stats display to show new health
    } else {
        // Move towards the player
        x = path[0][0];
        y = path[0][1];
        Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
        this._x = x;
        this._y = y;
        this._draw();
        
        // Add a message when Pedro gets closer
        if (path.length <= 3) {
            Game.message("Pedro is getting closer! You can hear his footsteps.");
        }
    }
}

// Frog class inherits from Being
var Frog = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "frog";
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
    
    // Try each direction until we find a valid move or attack
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        var midX = this._x + dir[0]/2;
        var midY = this._y + dir[1]/2;
        
        // Check if both intermediate and destination tiles are valid
        var midKey = midX + "," + midY;
        var newKey = newX + "," + newY;
        
        // Skip if intermediate or destination tiles are impassable
        if (!(midKey in Game.map) || !(newKey in Game.map)) {
            continue;
        }
        
        // Check if the destination tile is occupied by the player
        if (Game.player && Game.player.getX() === newX && Game.player.getY() === newY) {
            // Attack the player!
            Game.message("A frog leaps at you and attacks!");
            Game.player.takeDamage(this._strength);
            Game._drawStats();
            return; // End turn after attacking
        }
        
        // Check if destination is occupied by another enemy
        var occupiedByEnemy = false;
        for (var j = 0; j < Game.enemies.length; j++) {
            var enemy = Game.enemies[j];
            if (enemy !== this && enemy.getX() === newX && enemy.getY() === newY) {
                occupiedByEnemy = true;
                break;
            }
        }
        
        // If destination is free, jump there
        if (!occupiedByEnemy) {
            // Valid move found - perform the jump
            Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
            this._x = newX;
            this._y = newY;
            this._draw();
            
            // If player is nearby, add a message
            var playerX = Game.player ? Game.player.getX() : -1;
            var playerY = Game.player ? Game.player.getY() : -1;
            var dx = Math.abs(this._x - playerX);
            var dy = Math.abs(this._y - playerY);
            
            if (playerX !== -1 && dx <= 3 && dy <= 3) {
                Game.message("You hear a frog jumping nearby.");
            }
            
            return; // End turn after moving
        }
    }
    // If no valid moves found, frog stays in place (skips turn)
}

// Rat class inherits from Being
var Rat = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "rat";
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
    
    // Try each direction until we find a valid move or attack
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        var newKey = newX + "," + newY;
        
        // Check if the tile is passable
        if (!(newKey in Game.map)) {
            continue; // Skip impassable tiles
        }
        
        // Check if the tile is occupied by the player
        if (Game.player && Game.player.getX() === newX && Game.player.getY() === newY) {
            // Attack the player!
            Game.message("A rat bites you!");
            Game.player.takeDamage(this._strength);
            Game._drawStats();
            return; // End turn after attacking
        }
        
        // Check if the tile is occupied by another enemy
        var occupiedByEnemy = false;
        for (var j = 0; j < Game.enemies.length; j++) {
            var enemy = Game.enemies[j];
            if (enemy !== this && enemy.getX() === newX && enemy.getY() === newY) {
                occupiedByEnemy = true;
                break;
            }
        }
        
        // If tile is free, move there
        if (!occupiedByEnemy) {
            // Valid move found - perform the move
            Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
            this._x = newX;
            this._y = newY;
            this._draw();
            return; // End turn after moving
        }
    }
    // If no valid moves found, rat stays in place (skips turn)
}

// Snail class inherits from Being
var Snail = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "snail";
    this._char = "s";
    this._color = "#8B4513"; // Brown color
    this._draw();
}
Snail.prototype = Object.create(Being.prototype);
Snail.prototype.constructor = Snail;

// Snail doesn't move or do anything in its turn
Snail.prototype.act = function() {
    // Snails just sit there doing nothing
}

// MadFrog class inherits from Being
var MadFrog = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "mad frog";
    this._char = "f";
    this._color = "red"; // Red color to distinguish from regular frogs
    this._draw();
}
MadFrog.prototype = Object.create(Being.prototype);
MadFrog.prototype.constructor = MadFrog;

MadFrog.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Possible jump directions: up, right, down, left
    var directions = [
        [0, -2], // up
        [2, 0],  // right
        [0, 2],  // down
        [-2, 0]  // left
    ];
    
    // Calculate which direction gets us closest to the player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var bestDirection = null;
    var bestDistance = Infinity;
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we jump in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestDirection = dir;
        }
    }
    
    // Try the best direction first
    if (bestDirection && this._tryJump(bestDirection)) {
        return;
    }
    
    // If best direction failed, shuffle and try other directions
    for (var i = directions.length - 1; i > 0; i--) {
        var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
        var tmp = directions[i];
        directions[i] = directions[j];
        directions[j] = tmp;
    }
    
    // Try each direction until we find a valid move or attack
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        if (dir === bestDirection) continue; // Skip best direction, already tried
        
        if (this._tryJump(dir)) {
            return;
        }
    }
    
    // If no valid moves found, mad frog stays in place (skips turn)
}

MadFrog.prototype._tryJump = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var midX = this._x + dir[0]/2;
    var midY = this._y + dir[1]/2;
    
    // Check if both intermediate and destination tiles are valid
    var midKey = midX + "," + midY;
    var newKey = newX + "," + newY;
    
    // Skip if intermediate or destination tiles are impassable
    if (!(midKey in Game.map) || !(newKey in Game.map)) {
        return false;
    }
    
    // Check if the destination tile is occupied by the player
    if (Game.player && Game.player.getX() === newX && Game.player.getY() === newY) {
        // Attack the player!
        Game.message("A mad frog leaps at you furiously!");
        Game.player.takeDamage(this._strength);
        Game._drawStats();
        return true; // Successfully attacked
    }
    
    // Check if destination is occupied by another enemy
    for (var j = 0; j < Game.enemies.length; j++) {
        var enemy = Game.enemies[j];
        if (enemy !== this && enemy.getX() === newX && enemy.getY() === newY) {
            return false; // Blocked by enemy
        }
    }
    
    // If destination is free, jump there
    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = newX;
    this._y = newY;
    this._draw();
    
    // If player is nearby, add a message
    var playerX = Game.player ? Game.player.getX() : -1;
    var playerY = Game.player ? Game.player.getY() : -1;
    var dx = Math.abs(this._x - playerX);
    var dy = Math.abs(this._y - playerY);
    
    if (playerX !== -1 && dx <= 3 && dy <= 3) {
        Game.message("You hear an angry frog jumping aggressively nearby.");
    }
    
    return true; // Successfully moved
}

// MadRat class inherits from Being
var MadRat = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "mad rat";
    this._char = "r";
    this._color = "red"; // Red color to distinguish from regular rats
    this._draw();
}
MadRat.prototype = Object.create(Being.prototype);
MadRat.prototype.constructor = MadRat;

MadRat.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    // Calculate which direction gets us closest to the player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var bestDirection = null;
    var bestDistance = Infinity;
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we move in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestDirection = dir;
        }
    }
    
    // Try the best direction first
    if (bestDirection && this._tryMove(bestDirection)) {
        return;
    }
    
    // If best direction failed, shuffle and try other directions
    for (var i = directions.length - 1; i > 0; i--) {
        var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
        var tmp = directions[i];
        directions[i] = directions[j];
        directions[j] = tmp;
    }
    
    // Try each direction until we find a valid move or attack
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        if (dir === bestDirection) continue; // Skip best direction, already tried
        
        if (this._tryMove(dir)) {
            return;
        }
    }
    
    // If no valid moves found, mad rat stays in place (skips turn)
}

MadRat.prototype._tryMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var newKey = newX + "," + newY;
    
    // Check if the tile is passable
    if (!(newKey in Game.map)) {
        return false; // Impassable tile
    }
    
    // Check if the tile is occupied by the player
    if (Game.player && Game.player.getX() === newX && Game.player.getY() === newY) {
        // Attack the player!
        Game.message("A mad rat bites you viciously!");
        Game.player.takeDamage(this._strength);
        Game._drawStats();
        return true; // Successfully attacked
    }
    
    // Check if the tile is occupied by another enemy
    for (var j = 0; j < Game.enemies.length; j++) {
        var enemy = Game.enemies[j];
        if (enemy !== this && enemy.getX() === newX && enemy.getY() === newY) {
            return false; // Blocked by enemy
        }
    }
    
    // If tile is free, move there
    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = newX;
    this._y = newY;
    this._draw();
    return true; // Successfully moved
}

Game.init();

