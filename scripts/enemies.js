// Assassin class inherits from Being
var Assassin = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "Assassin";
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
        this.playAttackAnimation();
        Game.message("The Assassin strikes you!");
        Game.player.takeDamage(this._strength);
    } else {
        // Move towards the player
        var newX = path[0][0];
        var newY = path[0][1];

        // Check if the destination is occupied before moving
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
    this._health = 1;
    this._strength = 1;
    this._name = "frog";
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
            Game.message("A frog leaps at you and attacks!");
            Game.player.takeDamage(this._strength);
            return; // End turn after attacking
        }
        
        // Check if destination is occupied by another enemy
        var occupiedByEnemy = (targetBeing !== null && targetBeing !== this);
        
        // If destination is free, jump there
        if (!occupiedByEnemy) {
            this._moveTo(newX, newY);
            return; // End turn after moving
        }
    }
    // If no valid moves found, frog stays in place (skips turn)
}

// Rat class inherits from Being
var Rat = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "rat";
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
        
        // Check if the tile is passable
        if (!Game.isPassableTile(newX, newY)) {
            continue; // Skip impassable tiles
        }
        
        // Check what's at the destination tile
        var targetBeing = Game.getBeingAt(newX, newY);
        
        // Check if the tile is occupied by the player
        if (targetBeing === Game.player) {
            this.playAttackAnimation();
            Game.message("A rat bites you!");
            Game.player.takeDamage(this._strength);
            return; // End turn after attacking
        }
        
        // Check if the tile is occupied by another enemy
        var occupiedByEnemy = (targetBeing !== null && targetBeing !== this);
        
        // If tile is free, move there
        if (!occupiedByEnemy) {
            this._moveTo(newX, newY);
            return; // End turn after moving
        }
    }
    // If no valid moves found, rat stays in place (skips turn)
}

// CarnivorousPlant class inherits from Being
var CarnivorousPlant = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "Carnivorous Plant";
    this._sprite = "audrey_2";
}
CarnivorousPlant.prototype = Object.create(Being.prototype);
CarnivorousPlant.prototype.constructor = CarnivorousPlant;

CarnivorousPlant.prototype.act = function() {
    // Check the 4 cardinal directions for the player
    var directions = [
        [0, -1],  // Up
        [1,  0],  // Right
        [0,  1],  // Down
        [-1, 0]   // Left
    ];
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var checkX = this._x + dir[0];
        var checkY = this._y + dir[1];
        
        // Check if the player is at this adjacent position
        var targetBeing = Game.getBeingAt(checkX, checkY);
        if (targetBeing === Game.player) {
            this.playAttackAnimation();
            Game.message("The Carnivorous Plant snaps at you!");
            Game.player.takeDamage(this._strength);
            return; // End turn after attacking
        }
    }
    
    // If no player is adjacent, the plant just sits there
}

// MadFrog class inherits from Being
var MadFrog = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "mad frog";
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
    var bestDistance = currentDistance;
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we jump in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        
        // Only consider moves that get us closer or at least don't make us farther
        if (distance < bestDistance) {
            goodDirections = [dir];
            bestDistance = distance;
        } else if (distance === bestDistance) {
            goodDirections.push(dir);
        }
    }
    
    // If no directions reduce distance, try all directions (fallback behavior)
    if (goodDirections.length === 0) {
        goodDirections = directions.slice();
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
        Game.message("A mad frog leaps at you furiously!");
        Game.player.takeDamage(this._strength);
        return true;
    }
    
    // Check if destination is occupied by another enemy
    if (targetBeing !== null && targetBeing !== this) {
        return false;
    }
    
    // If destination is free, jump there
    this._moveTo(newX, newY);
    return true;
}

// Scorpion class inherits from Being
var Scorpion = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "scorpion";
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
    var bestDistance = currentDistance;
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we move in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        
        // Only consider moves that get us closer or at least don't make us farther
        if (distance < bestDistance) {
            goodDirections = [dir];
            bestDistance = distance;
        } else if (distance === bestDistance) {
            goodDirections.push(dir);
        }
    }
    
    // If no directions reduce distance, try all directions (fallback behavior)
    if (goodDirections.length === 0) {
        goodDirections = directions.slice();
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
}

Scorpion.prototype._tryMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    
    // Check if the tile is passable
    if (!Game.isPassableTile(newX, newY)) {
        return false;
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // If the destination is the player, attack but don't move
    if (targetBeing === Game.player) {
        this.playAttackAnimation();
        Game.message("A Scorpion stings you viciously!");
        Game.player.takeDamage(this._strength);
        return true;
    }
    
    // If the destination is occupied by anything else, the move is blocked
    if (targetBeing) {
        return false;
    }
    
    // If tile is free, move there
    this._moveTo(newX, newY);
    return true;
}

// Ghost class inherits from Being
var Ghost = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "ghost";
    this._sprite = "ghost";
}
Ghost.prototype = Object.create(Being.prototype);
Ghost.prototype.constructor = Ghost;

Ghost.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    // Calculate Manhattan distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var manhattanDistance = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // If player is within Manhattan distance 5, move towards player
    if (manhattanDistance <= 5) {
        // Find direction that gets us closest to the player
        var bestDirection = null;
        var bestDistance = manhattanDistance;
        
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var newX = this._x + dir[0];
            var newY = this._y + dir[1];
            
            // Check if new position is within map bounds
            if (newX < 0 || newX >= Game.currentLevel.MAP_WIDTH || 
                newY < 0 || newY >= Game.currentLevel.MAP_HEIGHT) {
                continue;
            }
            
            // Calculate distance to player from this new position
            var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
            
            // If this gets us closer, it's our best option
            if (distance < bestDistance) {
                bestDirection = dir;
                bestDistance = distance;
            }
        }
        
        // Try to move in the best direction
        if (bestDirection && this._tryGhostMove(bestDirection)) {
            return;
        }
        
        // If best direction failed, try any valid direction towards player
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var newX = this._x + dir[0];
            var newY = this._y + dir[1];
            
            // Check bounds
            if (newX < 0 || newX >= Game.currentLevel.MAP_WIDTH || 
                newY < 0 || newY >= Game.currentLevel.MAP_HEIGHT) {
                continue;
            }
            
            var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
            
            // Only try moves that don't make us farther from player
            if (distance <= manhattanDistance && this._tryGhostMove(dir)) {
                return;
            }
        }
    } else {
        // Player is far away, move randomly
        // Shuffle directions randomly
        for (var i = directions.length - 1; i > 0; i--) {
            var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
            var tmp = directions[i];
            directions[i] = directions[j];
            directions[j] = tmp;
        }
        
        // Try each direction until we find a valid move
        for (var i = 0; i < directions.length; i++) {
            if (this._tryGhostMove(directions[i])) {
                return;
            }
        }
    }
}

Ghost.prototype._tryGhostMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    
    // Check if new position is within map bounds
    if (newX < 0 || newX >= Game.currentLevel.MAP_WIDTH || 
        newY < 0 || newY >= Game.currentLevel.MAP_HEIGHT) {
        return false;
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // If the destination is the player, attack
    if (targetBeing === Game.player) {
        this.playAttackAnimation();
        Game.message("A ghost phases through the wall and attacks you!");
        Game.player.takeDamage(this._strength);
        return true;
    }
    
    // If destination is occupied by another being (not player), move is blocked
    if (targetBeing !== null && targetBeing !== this) {
        return false;
    }
    
    // Ghosts can move anywhere (ignoring terrain), so move there
    this._moveTo(newX, newY);
    return true;
}

// Cobra class inherits from Being
var Cobra = function(x, y) {
    Being.call(this, x, y);
    this._health = 1;
    this._strength = 1;
    this._name = "cobra";
    this._sprite = "cobra";
}
Cobra.prototype = Object.create(Being.prototype);
Cobra.prototype.constructor = Cobra;

Cobra.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Count passable tiles in all 8 surrounding directions
    var allDirections = [
        [-1, -1], // up-left (diagonal)
        [0, -1],  // up
        [1, -1],  // up-right (diagonal)
        [-1, 0],  // left
        [1, 0],   // right
        [-1, 1],  // down-left (diagonal)
        [0, 1],   // down
        [1, 1]    // down-right (diagonal)
    ];
    
    var passableCount = 0;
    for (var i = 0; i < allDirections.length; i++) {
        var dir = allDirections[i];
        var checkX = this._x + dir[0];
        var checkY = this._y + dir[1];
        if (Game.isPassableTile(checkX, checkY)) {
            passableCount++;
        }
    }
    
    // Determine allowed movement directions based on passable tile count
    var directions;
    if (passableCount <= 3) {
        // 3 or fewer passable tiles - can move in any of 8 directions
        directions = allDirections.slice();
    } else {
        // 4 or more passable tiles - can only move diagonally
        directions = [
            [-1, -1], // up-left
            [1, -1],  // up-right
            [1, 1],   // down-right
            [-1, 1]   // down-left
        ];
    }
    
    // Calculate current distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var currentDistance = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Find all directions that reduce distance to player
    var goodDirections = [];
    var bestDistance = currentDistance;
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we move in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        
        // Only consider moves that get us closer or at least don't make us farther
        if (distance < bestDistance) {
            goodDirections = [dir];
            bestDistance = distance;
        } else if (distance === bestDistance) {
            goodDirections.push(dir);
        }
    }
    
    // If no directions reduce distance, try all allowed directions (fallback behavior)
    if (goodDirections.length === 0) {
        goodDirections = directions.slice();
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
        if (this._tryCobraMove(dir)) {
            return;
        }
    }
}

Cobra.prototype._tryCobraMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    
    // Check if the tile is passable
    if (!Game.isPassableTile(newX, newY)) {
        return false;
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // If the destination is the player, attack
    if (targetBeing === Game.player) {
        this.playAttackAnimation();
        Game.message("A cobra strikes at you diagonally!");
        Game.player.takeDamage(this._strength);
        return true;
    }
    
    // If destination is occupied by another being, move is blocked
    if (targetBeing !== null && targetBeing !== this) {
        return false;
    }
    
    // If tile is free, move there
    this._moveTo(newX, newY);
    return true;
}

// Zombie class inherits from Being
var Zombie = function(x, y) {
    Being.call(this, x, y);
    this._health = 2; // Zombies are tougher than scorpions
    this._strength = 1;
    this._name = "zombie";
    this._sprite = "zombie";
}
Zombie.prototype = Object.create(Being.prototype);
Zombie.prototype.constructor = Zombie;

Zombie.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Possible movement directions: up, right, down, left (same as scorpion)
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
    var bestDistance = currentDistance;
    
    for (var i = 0; i < directions.length; i++) {
        var dir = directions[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        
        // Calculate distance to player if we move in this direction
        var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
        
        // Only consider moves that get us closer or at least don't make us farther
        if (distance < bestDistance) {
            goodDirections = [dir];
            bestDistance = distance;
        } else if (distance === bestDistance) {
            goodDirections.push(dir);
        }
    }
    
    // If no directions reduce distance, try all directions (fallback behavior)
    if (goodDirections.length === 0) {
        goodDirections = directions.slice();
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
        if (this._tryZombieMove(dir)) {
            return;
        }
    }
}

Zombie.prototype._tryZombieMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    
    // Check if the tile is passable
    if (!Game.isPassableTile(newX, newY)) {
        return false;
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // If the destination is the player, attack but don't move
    if (targetBeing === Game.player) {
        this.playAttackAnimation();
        Game.message("A zombie lurches forward and bites you!");
        Game.player.takeDamage(this._strength);
        return true;
    }
    
    // If the destination is occupied by anything else, the move is blocked
    if (targetBeing) {
        return false;
    }
    
    // If tile is free, move there
    this._moveTo(newX, newY);
    return true;
} 