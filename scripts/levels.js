// Base Level class
var Level = function() {
    // Map dimensions - can be overridden by subclasses
    this.MAP_WIDTH = 80;
    this.MAP_HEIGHT = 25;
    
    // Enemy counts - to be defined by subclasses
    this.enemyCounts = {};
    
    // Item counts - to be defined by subclasses  
    this.itemCounts = {};
}

// Generate the complete level (map + enemies + items)
Level.prototype.generate = function() {
    this._generateMap();
    this._populateLevel();
    return {
        map: Game.map,
        player: Game.player,
        enemies: Game.enemies
    };
}

// Generate the basic map structure
Level.prototype._generateMap = function() {
    var W = this.MAP_WIDTH;
    var H = this.MAP_HEIGHT;
    // NEW: Initialize 2D array
    Game.map = [];
    for (var x = 0; x < W; x++) {
        Game.map[x] = [];
        for (var y = 0; y < H; y++) {
            Game.map[x][y] = null; // Represents a wall
        }
    }
    
    var digger = new ROT.Map.Digger(W, H);
    var freeCells = [];
    
    var digCallback = function(x, y, value) {
        if (value) { return; }
        
        // NEW: 2D array access
        Game.map[x][y] = {
            terrain: ".",
            being: null,
            item: null
        };
        // NEW: Store coordinate objects
        freeCells.push({x: x, y: y});
    }
    digger.create(digCallback.bind(this));
    
    this._drawWholeMap();
    this.freeCells = freeCells; // Store for population
}

// Populate the level with player, enemies, and items
Level.prototype._populateLevel = function() {
    var freeCells = this.freeCells.slice(); // Copy array
    
    // Create or place player
    this._placePlayer(freeCells);
    
    // Create enemies
    this._createEnemies(freeCells);
    
    // Create items
    this._createItems(freeCells);
}

// Place the player in a free cell, creating them if they don't exist
Level.prototype._placePlayer = function(freeCells) {
    var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    var cell = freeCells.splice(index, 1)[0];
    var x = cell.x;
    var y = cell.y;

    if (Game.player) {
        Game.player.setPosition(x, y);
    } else {
        Game.player = new Player(x, y);
    }
}

// Create all enemies based on this level's configuration
Level.prototype._createEnemies = function(freeCells) {
    // Create Assassin(s)
    for (var i = 0; i < this.enemyCounts.ASSASSIN; i++) {
        Game.enemies.push(this._createBeing(Assassin, freeCells));
    }
    
    // Create frogs
    for (var i = 0; i < this.enemyCounts.FROG; i++) {
        Game.enemies.push(this._createBeing(Frog, freeCells));
    }
    
    // Create rats
    for (var i = 0; i < this.enemyCounts.RAT; i++) {
        Game.enemies.push(this._createBeing(Rat, freeCells));
    }
    
    // Create snails
    for (var i = 0; i < this.enemyCounts.SNAIL; i++) {
        Game.enemies.push(this._createBeing(Snail, freeCells));
    }
    
    // Create mad frogs
    for (var i = 0; i < this.enemyCounts.MADFROG; i++) {
        Game.enemies.push(this._createBeing(MadFrog, freeCells));
    }
    
    // Create mad rats
    for (var i = 0; i < this.enemyCounts.MADRAT; i++) {
        Game.enemies.push(this._createBeing(MadRat, freeCells));
    }
}

// Create all items based on this level's configuration
Level.prototype._createItems = function(freeCells) {
    this._generateItems(HealthPotion, this.itemCounts.HEALTH_POTIONS, freeCells);
    this._generateItems(GoldKey, this.itemCounts.GOLD_KEYS, freeCells);
    this._generateItems(Bomb, this.itemCounts.BOMBS, freeCells);
    this._generateItems(Exit, this.itemCounts.EXITS, freeCells);
    this._generateItems(StoneSkinPotion, this.itemCounts.STONESKIN_POTIONS, freeCells);
    this._generateItems(SpeedPotion, this.itemCounts.SPEED_POTIONS, freeCells);
    this._generateItems(GoldCoin, this.itemCounts.GOLD_COINS, freeCells);
}

// Helper method to create a being at a random free location
Level.prototype._createBeing = function(what, freeCells) {
    var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    var cell = freeCells.splice(index, 1)[0];
    var x = cell.x;
    var y = cell.y;
    return new what(x, y);
}

// Generic item generation function
Level.prototype._generateItems = function(ItemClass, count, freeCells) {
    for (var i = 0; i < count; i++) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var cell = freeCells.splice(index, 1)[0];
        var x = cell.x;
        var y = cell.y;
        var item = new ItemClass(x, y);
        // Draw the item immediately since _drawWholeMap was called earlier
        item._draw();
    }
}

// Draw the complete map (terrain and items)
Level.prototype._drawWholeMap = function() {
    for (var x = 0; x < this.MAP_WIDTH; x++) {
        for (var y = 0; y < this.MAP_HEIGHT; y++) {
            var tile = Game.map[x][y];
            if (tile) { // If it's not a wall
                // Draw terrain first
                Game.display.draw(x, y, tile.terrain);
                // Draw item if present
                if (tile.item) {
                    tile.item._draw();
                }
            }
        }
    }
}

// Level1 class - inherits from Level
var Level1 = function() {
    Level.call(this);
    
    // Define enemy counts for Level 1
    this.enemyCounts = {
        ASSASSIN: 2,
        FROG: 5,
        RAT: 5,
        SNAIL: 1,
        MADFROG: 2,
        MADRAT: 2
    };
    
    // Define item counts for Level 1
    this.itemCounts = {
        HEALTH_POTIONS: 2,
        GOLD_KEYS: 3,
        BOMBS: 1,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5
    };
}
Level1.prototype = Object.create(Level.prototype);
Level1.prototype.constructor = Level1;




// Level1 class - inherits from Level
var Level1 = function() {
    Level.call(this);
    
    // Define enemy counts for Level 1
    this.enemyCounts = {
        ASSASSIN: 4,
        FROG: 5,
        RAT: 5,
        SNAIL: 1,
        MADFROG: 4,
        MADRAT: 4
    };
    
    // Define item counts for Level 1
    this.itemCounts = {
        HEALTH_POTIONS: 2,
        GOLD_KEYS: 3,
        BOMBS: 1,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5
    };
}
Level1.prototype = Object.create(Level.prototype);
Level1.prototype.constructor = Level1;