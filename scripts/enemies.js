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
    // Initialize properties manually since ghosts can spawn on any tile (including walls)
    this._x = x;
    this._y = y;
    this._health = 1;
    this._strength = 1;
    this._name = "ghost";
    this._sprite = "ghost";
    this._isAttacking = false;
    this._isTakingDamage = false;
    this._isDead = false;
    this._speed = 100;
    this._activationRadius = Ghost.ACTIVATION_RADIUS; // Use class-level parameter
    
    // Place ghost on map regardless of tile passability
    if (x !== undefined && y !== undefined) {
        Game.currentLevel.map[x][y].being = this;
    }
}
Ghost.prototype = Object.create(Being.prototype);
Ghost.prototype.constructor = Ghost;

// Class-level activation radius parameter
Ghost.ACTIVATION_RADIUS = 5; // Default activation radius

// Override _moveTo for ghosts to allow movement to any tile (including walls)
Ghost.prototype._moveTo = function(newX, newY) {
    // Remove from old position
    Game.currentLevel.map[this._x][this._y].being = null;
    
    // Update position
    this._x = newX;
    this._y = newY;
    
    // Add to new position - ghosts can move to any tile, even walls
    Game.currentLevel.map[this._x][this._y].being = this;
}

// Override static factory method for ghosts to spawn on any unoccupied tile
Ghost.createRandom = function(BeingClass, freeCells) {
    // Create list of all unoccupied tiles (passable or impassable)
    var unoccupiedTiles = [];
    
    for (var x = 0; x < Game.currentLevel.MAP_WIDTH; x++) {
        for (var y = 0; y < Game.currentLevel.MAP_HEIGHT; y++) {
            // Check if tile has no being on it
            if (!Game.currentLevel.map[x][y].being) {
                unoccupiedTiles.push({x: x, y: y});
            }
        }
    }
    
    // Pick a random unoccupied tile
    if (unoccupiedTiles.length > 0) {
        var index = Math.floor(ROT.RNG.getUniform() * unoccupiedTiles.length);
        var tile = unoccupiedTiles[index];
        return new BeingClass(tile.x, tile.y);
    } else {
        // Fallback: use standard creation if no unoccupied tiles (shouldn't happen)
        return Being.createRandom(BeingClass, freeCells);
    }
}

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
    
    // If player is within activation radius, move towards player
    if (manhattanDistance <= this._activationRadius) {
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
    this._speed = 50; // Zombies are slower than other beings
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

// Imp class inherits from Being
var Imp = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Standard health
    this._strength = 1; // Standard strength
    this._name = "imp";
    this._sprite = "imp";
    this._speed = 100; // Normal speed
}
Imp.prototype = Object.create(Being.prototype);
Imp.prototype.constructor = Imp;

Imp.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var currentDistance = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Check if player is within attack range (adjacent)
    if (currentDistance === 1) {
        this.playAttackAnimation();
        Game.message("An imp teleports next to you and attacks!");
        Game.player.takeDamage(this._strength);
        return;
    }
    
    // Find all possible teleport locations within radius 3 (7x7 square)
    var viablePositions = [];
    var bestDistance = currentDistance;
    var bestPositions = [];
    
    for (var dx = -3; dx <= 3; dx++) {
        for (var dy = -3; dy <= 3; dy++) {
            // Skip current position
            if (dx === 0 && dy === 0) continue;
            
            var newX = this._x + dx;
            var newY = this._y + dy;
            
            // Check if position is within map bounds and passable
            if (Game.isPassableTile(newX, newY)) {
                // Check if position is free (no other beings)
                var targetBeing = Game.getBeingAt(newX, newY);
                if (!targetBeing || targetBeing === this) {
                    var distance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
                    viablePositions.push({x: newX, y: newY, distance: distance});
                    
                    // Track positions that get us closer to player
                    if (distance < bestDistance) {
                        bestPositions = [{x: newX, y: newY}];
                        bestDistance = distance;
                    } else if (distance === bestDistance) {
                        bestPositions.push({x: newX, y: newY});
                    }
                }
            }
        }
    }
    
    // Choose teleport destination
    var targetPosition = null;
    
    if (bestPositions.length > 0) {
        // Move to a position that gets us closer to player
        var randomIndex = Math.floor(ROT.RNG.getUniform() * bestPositions.length);
        targetPosition = bestPositions[randomIndex];
    } else if (viablePositions.length > 0) {
        // No position gets us closer, teleport to random viable position
        var randomIndex = Math.floor(ROT.RNG.getUniform() * viablePositions.length);
        targetPosition = viablePositions[randomIndex];
    }
    
    // Teleport to chosen position
    if (targetPosition) {
        this._moveTo(targetPosition.x, targetPosition.y);
    }
    // If no viable positions, imp stays in place
}

// Reaper class inherits from Ghost - exactly like Ghost but with higher strength
var Reaper = function(x, y) {
    // Call Ghost constructor to get all ghost behavior
    Ghost.call(this, x, y);
    this._strength = 3; // Override strength - reapers hit harder than ghosts
    this._name = "reaper";
    this._sprite = "reaper";
}
Reaper.prototype = Object.create(Ghost.prototype);
Reaper.prototype.constructor = Reaper;

// Override the attack message to be more thematic for reapers
Reaper.prototype._tryGhostMove = function(dir) {
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
        Game.message("A reaper phases through the wall and attacks you with deadly force!");
        Game.player.takeDamage(this._strength);
        return true;
    }
    
    // If destination is occupied by another being (not player), move is blocked
    if (targetBeing !== null && targetBeing !== this) {
        return false;
    }
    
    // Reapers can move anywhere (ignoring terrain), so move there
    this._moveTo(newX, newY);
    return true;
}

// Skeleton class inherits from Being
var Skeleton = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Standard health
    this._strength = 1; // Standard strength
    this._name = "skeleton";
    this._sprite = "skeleton";
    this._speed = 100; // Normal speed
    this._isFirstTurn = true; // Track if this is the first turn
    this._movementAxis = null; // 'horizontal' or 'vertical'
    this._currentDirection = null; // Current movement direction [dx, dy]
}
Skeleton.prototype = Object.create(Being.prototype);
Skeleton.prototype.constructor = Skeleton;

Skeleton.prototype.act = function() {
    if (!Game.player) return; // No player to attack
    
    // Check if player is adjacent (4 cardinal directions) and attack if so
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var adjacentDirections = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    for (var i = 0; i < adjacentDirections.length; i++) {
        var dir = adjacentDirections[i];
        var checkX = this._x + dir[0];
        var checkY = this._y + dir[1];
        
        if (checkX === playerX && checkY === playerY) {
            // Player is adjacent, attack!
            this.playAttackAnimation();
            Game.message("A skeleton rattles its bones and attacks you!");
            Game.player.takeDamage(this._strength);
            return;
        }
    }
    
    // If this is the first turn, pick a movement axis
    if (this._isFirstTurn) {
        this._chooseMovementAxis();
        this._isFirstTurn = false;
    }
    
    // Try to move in current direction
    if (this._currentDirection) {
        var newX = this._x + this._currentDirection[0];
        var newY = this._y + this._currentDirection[1];
        
        // Check if we can move to the target position
        if (Game.isPassableTile(newX, newY)) {
            var targetBeing = Game.getBeingAt(newX, newY);
            
            if (!targetBeing) {
                // Tile is free, move there
                this._moveTo(newX, newY);
                return;
            } else {
                // Tile is occupied by another creature, just wait
                return;
            }
        } else {
            // Hit a wall, reverse direction
            this._reverseDirection();
            
            // Try moving in the new direction
            newX = this._x + this._currentDirection[0];
            newY = this._y + this._currentDirection[1];
            
            if (Game.isPassableTile(newX, newY)) {
                var targetBeing = Game.getBeingAt(newX, newY);
                
                if (!targetBeing) {
                    // Tile is free, move there
                    this._moveTo(newX, newY);
                    return;
                } else {
                    // Tile is occupied, wait
                    return;
                }
            }
            // If we can't move in either direction, just wait
        }
    }
}

Skeleton.prototype._chooseMovementAxis = function() {
    // Check which directions are passable
    var canMoveUp = Game.isPassableTile(this._x, this._y - 1);
    var canMoveDown = Game.isPassableTile(this._x, this._y + 1);
    var canMoveLeft = Game.isPassableTile(this._x - 1, this._y);
    var canMoveRight = Game.isPassableTile(this._x + 1, this._y);
    
    var canMoveVertical = canMoveUp || canMoveDown;
    var canMoveHorizontal = canMoveLeft || canMoveRight;
    
    // Prefer the axis that has more movement options
    if (canMoveVertical && canMoveHorizontal) {
        // Both axes are available, choose randomly
        if (ROT.RNG.getUniform() < 0.5) {
            this._movementAxis = 'vertical';
        } else {
            this._movementAxis = 'horizontal';
        }
    } else if (canMoveVertical) {
        this._movementAxis = 'vertical';
    } else if (canMoveHorizontal) {
        this._movementAxis = 'horizontal';
    } else {
        // Can't move in any direction, default to horizontal
        this._movementAxis = 'horizontal';
    }
    
    // Set initial direction based on chosen axis
    if (this._movementAxis === 'vertical') {
        // Choose up or down based on what's available
        if (canMoveUp && canMoveDown) {
            // Both available, choose randomly
            this._currentDirection = ROT.RNG.getUniform() < 0.5 ? [0, -1] : [0, 1];
        } else if (canMoveUp) {
            this._currentDirection = [0, -1]; // up
        } else if (canMoveDown) {
            this._currentDirection = [0, 1]; // down
        } else {
            this._currentDirection = [0, 1]; // default down
        }
    } else {
        // Horizontal movement
        if (canMoveLeft && canMoveRight) {
            // Both available, choose randomly
            this._currentDirection = ROT.RNG.getUniform() < 0.5 ? [-1, 0] : [1, 0];
        } else if (canMoveLeft) {
            this._currentDirection = [-1, 0]; // left
        } else if (canMoveRight) {
            this._currentDirection = [1, 0]; // right
        } else {
            this._currentDirection = [1, 0]; // default right
        }
    }
}

Skeleton.prototype._reverseDirection = function() {
    if (this._currentDirection) {
        // Reverse the current direction
        this._currentDirection[0] = -this._currentDirection[0];
        this._currentDirection[1] = -this._currentDirection[1];
    }
}

// Orc class inherits from Being
var Orc = function(x, y) {
    Being.call(this, x, y);
    this._health = 2; // Higher health than most enemies
    this._strength = 2; // Higher strength than most enemies
    this._name = "orc";
    this._sprite = "orc";
    this._speed = 100; // Normal speed
}
Orc.prototype = Object.create(Being.prototype);
Orc.prototype.constructor = Orc;

Orc.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Calculate distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var distance = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    if (distance <= 4) {
        // Player is close (within 4 tiles), move towards them
        var bestDistance = distance;
        var bestDirections = [];
        
        // Find all directions that get us closer to the player
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var newX = this._x + dir[0];
            var newY = this._y + dir[1];
            var newDistance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
            
            if (newDistance < bestDistance) {
                bestDirections = [dir];
                bestDistance = newDistance;
            } else if (newDistance === bestDistance) {
                bestDirections.push(dir);
            }
        }
        
        // If we found directions that get us closer, use them; otherwise try all directions
        var directionsToTry = bestDirections.length > 0 ? bestDirections : directions;
        
        // Shuffle the directions to avoid bias
        for (var i = directionsToTry.length - 1; i > 0; i--) {
            var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
            var tmp = directionsToTry[i];
            directionsToTry[i] = directionsToTry[j];
            directionsToTry[j] = tmp;
        }
        
        // Try each direction until we find a valid move or attack
        for (var i = 0; i < directionsToTry.length; i++) {
            if (this._tryOrcMove(directionsToTry[i])) {
                return;
            }
        }
    } else {
        // Player is far away (distance > 4), wander aimlessly
        // Shuffle directions randomly
        for (var i = directions.length - 1; i > 0; i--) {
            var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
            var tmp = directions[i];
            directions[i] = directions[j];
            directions[j] = tmp;
        }
        
        // Try each direction until we find a valid move
        for (var i = 0; i < directions.length; i++) {
            if (this._tryOrcMove(directions[i])) {
                return;
            }
        }
    }
}

Orc.prototype._tryOrcMove = function(dir) {
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
        Game.message("An orc swings its weapon at you with brutal force!");
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

// Unicorn class inherits from Being - friendly to player, hostile to other creatures
var Unicorn = function(x, y) {
    Being.call(this, x, y);
    this._health = 5; // High health - unicorns are tough
    this._strength = 2; // Strong enough to help player effectively
    this._name = "unicorn";
    this._sprite = "unicorn";
    this._speed = 100; // Normal speed
}
Unicorn.prototype = Object.create(Being.prototype);
Unicorn.prototype.constructor = Unicorn;

Unicorn.prototype.act = function() {
    if (!Game.player) return; // No player to help
    
    // Calculate distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var distanceToPlayer = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    if (distanceToPlayer > 4) {
        // Player is far away, move towards player (attack any creatures in the way)
        var bestDistance = distanceToPlayer;
        var bestDirections = [];
        
        // Find all directions that get us closer to the player
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var newX = this._x + dir[0];
            var newY = this._y + dir[1];
            var newDistance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
            
            if (newDistance < bestDistance) {
                bestDirections = [dir];
                bestDistance = newDistance;
            } else if (newDistance === bestDistance) {
                bestDirections.push(dir);
            }
        }
        
        // Try the best directions first
        var directionsToTry = bestDirections.length > 0 ? bestDirections : directions;
        
        // Shuffle to avoid bias
        for (var i = directionsToTry.length - 1; i > 0; i--) {
            var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
            var tmp = directionsToTry[i];
            directionsToTry[i] = directionsToTry[j];
            directionsToTry[j] = tmp;
        }
        
        // Try each direction
        for (var i = 0; i < directionsToTry.length; i++) {
            if (this._tryUnicornMove(directionsToTry[i])) {
                return;
            }
        }
    } else {
        // Player is close (≤4 tiles), look for nearby enemies to attack
        var nearbyEnemy = this._findNearbyEnemy();
        
        if (nearbyEnemy) {
            // Found an enemy within 4 tiles, move towards it
            var enemyX = nearbyEnemy.getX();
            var enemyY = nearbyEnemy.getY();
            var bestDistance = Math.abs(this._x - enemyX) + Math.abs(this._y - enemyY);
            var bestDirections = [];
            
            // Find directions that get us closer to the enemy
            for (var i = 0; i < directions.length; i++) {
                var dir = directions[i];
                var newX = this._x + dir[0];
                var newY = this._y + dir[1];
                var newDistance = Math.abs(newX - enemyX) + Math.abs(newY - enemyY);
                
                if (newDistance < bestDistance) {
                    bestDirections = [dir];
                    bestDistance = newDistance;
                } else if (newDistance === bestDistance) {
                    bestDirections.push(dir);
                }
            }
            
            // Try the best directions
            var directionsToTry = bestDirections.length > 0 ? bestDirections : directions;
            
            // Shuffle to avoid bias
            for (var i = directionsToTry.length - 1; i > 0; i--) {
                var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
                var tmp = directionsToTry[i];
                directionsToTry[i] = directionsToTry[j];
                directionsToTry[j] = tmp;
            }
            
            // Try each direction
            for (var i = 0; i < directionsToTry.length; i++) {
                if (this._tryUnicornMove(directionsToTry[i])) {
                    return;
                }
            }
        } else {
            // No enemies nearby, move randomly
            // Shuffle directions randomly
            for (var i = directions.length - 1; i > 0; i--) {
                var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
                var tmp = directions[i];
                directions[i] = directions[j];
                directions[j] = tmp;
            }
            
            // Try each direction
            for (var i = 0; i < directions.length; i++) {
                if (this._tryUnicornMove(directions[i])) {
                    return;
                }
            }
        }
    }
}

// Find nearby enemies within 4 tiles (excluding player)
Unicorn.prototype._findNearbyEnemy = function() {
    var nearestEnemy = null;
    var nearestDistance = Infinity;
    
    // Check all enemies in the game
    for (var i = 0; i < Game.enemies.length; i++) {
        var enemy = Game.enemies[i];
        
        // Skip if this is the unicorn itself
        if (enemy === this) continue;
        
        // Skip if enemy is dead
        if (enemy._isDead) continue;
        
        var distance = Math.abs(this._x - enemy.getX()) + Math.abs(this._y - enemy.getY());
        
        // Check if within 4 tiles and closer than previous candidates
        if (distance <= 4 && distance < nearestDistance) {
            nearestEnemy = enemy;
            nearestDistance = distance;
        }
    }
    
    return nearestEnemy;
}

Unicorn.prototype._tryUnicornMove = function(dir) {
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    
    // Check if the tile is passable
    if (!Game.isPassableTile(newX, newY)) {
        return false;
    }
    
    // Check what's at the destination tile
    var targetBeing = Game.getBeingAt(newX, newY);
    
    // If the destination is the player, DON'T attack - just block the move
    if (targetBeing === Game.player) {
        return false; // Unicorns never attack the player
    }
    
    // If the destination has another creature (enemy), attack it
    if (targetBeing && targetBeing !== this) {
        this.playAttackAnimation();
        Game.message("A unicorn charges at the " + targetBeing.getName() + " to defend you!");
        var killed = targetBeing.takeDamage(this._strength);
        if (killed) {
            Game.message("The unicorn defeated the " + targetBeing.getName() + "!");
        }
        return true;
    }
    
    // If tile is free, move there
    this._moveTo(newX, newY);
    return true;
}

// Troll class inherits from Being - slow, strong creature that wanders until player is close
var Troll = function(x, y) {
    Being.call(this, x, y);
    this._health = 5; // High health - trolls are very tough
    this._strength = 3; // High strength - trolls hit hard
    this._name = "troll";
    this._sprite = "troll";
    this._speed = 50; // Slow speed - half normal speed
}
Troll.prototype = Object.create(Being.prototype);
Troll.prototype.constructor = Troll;

Troll.prototype.act = function() {
    if (!Game.player) return; // No player to chase
    
    // Calculate distance to player
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var distanceToPlayer = Math.abs(this._x - playerX) + Math.abs(this._y - playerY);
    
    // Possible movement directions: up, right, down, left
    var directions = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    if (distanceToPlayer <= 4) {
        // Player is within 4 tiles, move towards player aggressively
        var bestDistance = distanceToPlayer;
        var bestDirections = [];
        
        // Find all directions that get us closer to the player
        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var newX = this._x + dir[0];
            var newY = this._y + dir[1];
            var newDistance = Math.abs(newX - playerX) + Math.abs(newY - playerY);
            
            if (newDistance < bestDistance) {
                bestDirections = [dir];
                bestDistance = newDistance;
            } else if (newDistance === bestDistance) {
                bestDirections.push(dir);
            }
        }
        
        // Try the best directions first
        var directionsToTry = bestDirections.length > 0 ? bestDirections : directions;
        
        // Shuffle to avoid bias
        for (var i = directionsToTry.length - 1; i > 0; i--) {
            var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
            var tmp = directionsToTry[i];
            directionsToTry[i] = directionsToTry[j];
            directionsToTry[j] = tmp;
        }
        
        // Try each direction until we find a valid move or attack
        for (var i = 0; i < directionsToTry.length; i++) {
            if (this._tryTrollMove(directionsToTry[i])) {
                return;
            }
        }
    } else {
        // Player is far away (distance > 4), wander aimlessly
        // Shuffle directions randomly
        for (var i = directions.length - 1; i > 0; i--) {
            var j = Math.floor(ROT.RNG.getUniform() * (i + 1));
            var tmp = directions[i];
            directions[i] = directions[j];
            directions[j] = tmp;
        }
        
        // Try each direction until we find a valid move
        for (var i = 0; i < directions.length; i++) {
            if (this._tryTrollMove(directions[i])) {
                return;
            }
        }
    }
}

Troll.prototype._tryTrollMove = function(dir) {
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
        Game.message("A massive troll pounds you with its giant fists!");
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

// FlamingHorse class inherits from Being - fast enemy that moves randomly and attacks when adjacent
var FlamingHorse = function(x, y) {
    Being.call(this, x, y);
    this._health = 1; // Standard health
    this._strength = 1; // Standard strength
    this._name = "flaming horse";
    this._sprite = "flaming_horse";
    this._speed = 300; // Very fast - 3x normal speed
}
FlamingHorse.prototype = Object.create(Being.prototype);
FlamingHorse.prototype.constructor = FlamingHorse;

FlamingHorse.prototype.act = function() {
    if (!Game.player) return; // No player to potentially attack
    
    // Check if player is adjacent (4 cardinal directions) and attack if so
    var playerX = Game.player.getX();
    var playerY = Game.player.getY();
    var adjacentDirections = [
        [0, -1], // up
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0]  // left
    ];
    
    for (var i = 0; i < adjacentDirections.length; i++) {
        var dir = adjacentDirections[i];
        var checkX = this._x + dir[0];
        var checkY = this._y + dir[1];
        
        if (checkX === playerX && checkY === playerY) {
            // Player is adjacent, attack!
            this.playAttackAnimation();
            Game.message("A flaming horse rears up and strikes you with blazing hooves!");
            Game.player.takeDamage(this._strength);
            return;
        }
    }
    
    // Player is not adjacent, move randomly
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
        if (this._tryFlamingHorseMove(directions[i])) {
            return;
        }
    }
}

FlamingHorse.prototype._tryFlamingHorseMove = function(dir) {
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
        Game.message("A flaming horse rears up and strikes you with blazing hooves!");
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