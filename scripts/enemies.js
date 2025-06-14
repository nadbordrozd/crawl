// Assassin class inherits from Being
var Assassin = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "Assassin";
    this._char = "A";
    this._color = "purple";
    this._sprite = "assassin";
}
Assassin.prototype = Object.create(Being.prototype);
Assassin.prototype.constructor = Assassin;
    
Assassin.prototype.act = function() {
    var x = Game.player.getX();
    var y = Game.player.getY();

    var passableCallback = function(x, y) {
        return Game.isPassableTile(x, y);
    }
    var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});

    var path = [];
    var pathCallback = function(x, y) {
        path.push([x, y]);
    }
    astar.compute(this._x, this._y, pathCallback);

    path.shift(); // Remove Assassin's current position
    
    if (path.length <= 1) { // If path is 1, we are adjacent. If 0, we are blocked.
        this._flash();
        this.playAttackAnimation();
        Game.message("The Assassin strikes you!");
        Game.player.takeDamage(this._strength);
        Game._drawStats();
    } else {
        // Move towards the player
        var newX = path[0][0];
        var newY = path[0][1];

        // NEW: Check if the destination is occupied before moving
        var targetBeing = Game.getBeingAt(newX, newY);
        if (targetBeing) {
            // Blocked, do nothing
            return;
        }
        this._moveTo(newX, newY);
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
    this._sprite = "frog";
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
        
        
        // Skip if intermediate or destination tiles are impassable
        if (!Game.isPassableTile(midX, midY) || !Game.isPassableTile(newX, newY)) {
            continue;
        }
        
        // Check what's at the destination tile
        var targetBeing = Game.getBeingAt(newX, newY);
        
        // Check if the destination tile is occupied by the player
        if (targetBeing === Game.player) {
            this.playAttackAnimation();
            // Attack the player!
            Game.message("A frog leaps at you and attacks!");
            Game.player.takeDamage(this._strength);
            return; // End turn after attacking
        }
        
        // Check if destination is occupied by another enemy
        var occupiedByEnemy = (targetBeing !== null && targetBeing !== this);
        
        // If destination is free, jump there
        if (!occupiedByEnemy) {
            // Valid move found - perform the jump
            this._moveTo(newX, newY);
            
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
    this._sprite = "rat";
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
        if (!Game.isPassableTile(newX, newY)) {
            continue; // Skip impassable tiles
        }
        
        // Check what's at the destination tile
        var targetBeing = Game.getBeingAt(newX, newY);
        
        // Check if the tile is occupied by the player
        if (targetBeing === Game.player) {
            this.playAttackAnimation();
            // Attack the player!
            Game.message("A rat bites you!");
            Game.player.takeDamage(this._strength);
            return; // End turn after attacking
        }
        
        // Check if the tile is occupied by another enemy
        var occupiedByEnemy = (targetBeing !== null && targetBeing !== this);
        
        // If tile is free, move there
        if (!occupiedByEnemy) {
            // Valid move found - perform the move
            this._moveTo(newX, newY);
            return; // End turn after moving
        }
    }
    // If no valid moves found, rat stays in place (skips turn)
}

// CarnivorousPlant class inherits from Being
var CarnivorousPlant = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "Carnivorous Plant";
    this._char = "C";
    this._color = "darkgreen";
    this._sprite = "audrey_2";
}
CarnivorousPlant.prototype = Object.create(Being.prototype);
CarnivorousPlant.prototype.constructor = CarnivorousPlant;

// CarnivorousPlant doesn't move or do anything in its turn
CarnivorousPlant.prototype.act = function() {
    // It just sits there doing nothing
}

// MadFrog class inherits from Being
var MadFrog = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "mad frog";
    this._char = "f";
    this._color = "red"; // Red color to distinguish from regular frogs
    this._sprite = "mad_frog";
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
    
    // Calculate current distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var currentDistance = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Find all directions that reduce distance to player
    var goodDirections = [];
    var bestDistance = currentDistance; // Start with current distance
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we jump in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        
        // Only consider moves that get us closer or at least don't make us farther
        if (distance < bestDistance) {
            // This direction is better, clear previous good directions
            goodDirections = [dir];
            bestDistance = distance;
        } else if (distance === bestDistance) {
            // This direction is equally good, add it to options
            goodDirections.push(dir);
        }
    }
    
    // If no directions reduce distance, try all directions (fallback behavior)
    if (goodDirections.length === 0) {
        goodDirections = directions.slice(); // Copy all directions
    }
    
    // Shuffle the good directions to avoid bias
    for (var i = goodDirections.length - 1; i > 0; i--) {
        var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
        var tmp = goodDirections[i];
        goodDirections[i] = goodDirections[j];
        goodDirections[j] = tmp;
    }
    
    // Try each good direction until we find a valid move or attack
    for (var i = 0; i < goodDirections.length; i++) {
        var dir = goodDirections[i];
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
    
    
    // Skip if intermediate or destination tiles are impassable
    if (!Game.isPassableTile(midX, midY) || !Game.isPassableTile(newX, newY)) {
        return false;
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // Check if the destination tile is occupied by the player
    if (targetBeing === Game.player) {
        this.playAttackAnimation();
        // Attack the player!
        Game.message("A mad frog leaps at you furiously!");
        Game.player.takeDamage(this._strength);
        return true; // Successfully attacked
    }
    
    // Check if destination is occupied by another enemy
    if (targetBeing !== null && targetBeing !== this) {
        return false; // Blocked by enemy
    }
    
    // If destination is free, jump there
    this._moveTo(newX, newY);
    
    
    return true; // Successfully moved
}

// Scorpion class inherits from Being
var Scorpion = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Enemy health
    this._strength = 1; // Enemy strength
    this._name = "scorpion";
    this._char = "S";
    this._color = "orange";
    this._sprite = "scorpion";
}
Scorpion.prototype = Object.create(Being.prototype);
Scorpion.prototype.constructor = Scorpion;

Scorpion.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    // Calculate current distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var currentDistance = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Find all directions that reduce distance to player
    var goodDirections = [];
    var bestDistance = currentDistance; // Start with current distance
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we move in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        
        // Only consider moves that get us closer or at least don't make us farther
        if (distance < bestDistance) {
            // This direction is better, clear previous good directions
            goodDirections = [dir];
            bestDistance = distance;
        } else if (distance === bestDistance) {
            // This direction is equally good, add it to options
            goodDirections.push(dir);
        }
    }
    
    // If no directions reduce distance, try all directions (fallback behavior)
    if (goodDirections.length === 0) {
        goodDirections = directions.slice(); // Copy all directions
    }
    
    // Shuffle the good directions to avoid bias
    for (var i = goodDirections.length - 1; i > 0; i--) {
        var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
        var tmp = goodDirections[i];
        goodDirections[i] = goodDirections[j];
        goodDirections[j] = tmp;
    }
    
    // Try each good direction until we find a valid move or attack
    for (var i = 0; i < goodDirections.length; i++) {
        var dir = goodDirections[i];
        if (this._tryMove(dir)) {
            return;
        }
    }
    
    // If no valid moves found, mad rat stays in place (skips turn)
}

Scorpion.prototype._tryMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    
    // Check if the tile is passable
    if (!Game.isPassableTile(newX, newY)) {
        return false; // Impassable tile
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // If the destination is the player, attack but don't move.
    if (targetBeing === Game.player) {
        this.playAttackAnimation();
        Game.message("A Scorpion stings you viciously!");
        Game.player.takeDamage(this._strength);
        Game.message("The " + this.getName() + " attacks you for " + this._strength + " damage!");
        return true; // Successfully attacked
    }
    
    // If the destination is occupied by anything else, the move is blocked.
    if (targetBeing) {
        return false; // Blocked by another being
    }
    
    // If tile is free, move there
    this._moveTo(newX, newY);
    return true; // Successfully moved
} 