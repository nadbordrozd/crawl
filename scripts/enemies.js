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