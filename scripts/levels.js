// Base Level class
var Level = function() {
    // Map dimensions - can be overridden by subclasses
    this.MAP_WIDTH = 60;
    this.MAP_HEIGHT = 25;
    
    this.map = [];
    this.visibleCells = {};

    // Enemy counts - to be defined by subclasses
    this.enemyCounts = {};
    
    // Item counts - to be defined by subclasses  
    this.itemCounts = {};
    
    // Mapping of enemy type names to their classes
    this.enemyClasses = {
        ASSASSIN: Assassin,
        FROG: Frog,
        RAT: Rat,
        CARNIVOROUS_PLANT: CarnivorousPlant,
        MADFROG: MadFrog,
        SCORPION: Scorpion,
        GHOST: Ghost,
        COBRA: Cobra,
        ZOMBIE: Zombie,
        IMP: Imp
    };
}

Level.prototype.validTile = function(x, y) {
    return x >= 0 && x < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT;
}

Level.prototype.isPassable = function(x, y) {
    return this.validTile(x, y) && this.map[x][y].passable;
}

Level.prototype.prettifyTerrain = function() {
    for (var x = 0; x < this.MAP_WIDTH; x++) {
        for (var y = 0; y < this.MAP_HEIGHT; y++) {
            var tile = this.map[x][y];
            if(tile.passable){
                tile.terrain = 'dirt18';
                if (ROT.RNG.getUniform() < 0.005) {
                    tile.decoration = 'ribcage';
                } else if (ROT.RNG.getUniform() < 0.005) {
                    tile.decoration = 'bull_skull';
                } else if (ROT.RNG.getUniform() < 0.005) {
                    tile.decoration = 'skeleton_remains';
                }
                continue;
            }
            // 789
            // 456
            // 123

            var passable7 = this.isPassable(x-1, y-1);
            var passable8 = this.isPassable(x, y-1);
            var passable9 = this.isPassable(x+1, y-1);
            var passable4 = this.isPassable(x-1, y);
            var passable5 = this.isPassable(x, y);
            var passable6 = this.isPassable(x+1, y);
            var passable1 = this.isPassable(x-1, y+1);
            var passable2 = this.isPassable(x, y+1);
            var passable3 = this.isPassable(x+1, y+1);

            var wall7 = !this.isPassable(x-1, y-1);
            var wall8 = !this.isPassable(x, y-1);
            var wall9 = !this.isPassable(x+1, y-1);
            var wall4 = !this.isPassable(x-1, y);
            var wall5 = !this.isPassable(x, y);
            var wall6 = !this.isPassable(x+1, y);
            var wall1 = !this.isPassable(x-1, y+1);
            var wall2 = !this.isPassable(x, y+1);
            var wall3 = !this.isPassable(x+1, y+1);
 
            
            if((wall4 || wall6) && passable8 && passable2){
                tile.terrain = "WE_wall";
            } else if((wall8 || wall2) && passable4 && passable6){
                tile.terrain = "NS_wall";
            } else if(wall4 && wall6 && wall8 && passable7 && passable9) {
                tile.terrain = "reverse_t_wall";
            } else if(wall4 && wall6 && wall8 && passable2 && (passable7 || passable9)) {
                tile.terrain = "reverse_t_wall";
            } else if(wall4 && wall6 && wall2 && (passable1 && passable3)){
                tile.terrain = "t_wall";
            } else if(wall4 && wall6 && wall2 && passable8 && (passable1 || passable3)){
                tile.terrain = "t_wall";
            } else if((wall8 && wall6) && ((passable4 && passable2) || passable9)){
                tile.terrain = "SW_corner";
            } else if((wall4 && wall8) && ((passable6 && passable2) || passable7)){
                tile.terrain = "SE_corner";
            } else if((wall4 && wall2) && ((passable8 && passable6) || passable1)){
                tile.terrain = "NE_corner";
            } else if((wall6 && wall2) && ((passable4 && passable8) || passable3)){
                tile.terrain = "NW_corner";
            } else if(wall8 && wall2){
                tile.terrain = "NS_wall";
            } else {
                tile.terrain = "WE_wall";
            }

            if(passable2 && tile.terrain == 'WE_wall'){
                // pick a random integer number from 0 to 10
                    var randomNumber = Math.floor(ROT.RNG.getUniform() * 10);
                if(randomNumber == 2) {
                    tile.terrain = "torch_wall";
                } else if (randomNumber == 1) {
                    tile.terrain = "grate_wall";
                }
            }


        }
    }
}

// Generate the complete level (map + enemies + items)
Level.prototype.generate = function() {
    this._generateMap();
    this._populateLevel();
    return {
        map: this.map,
        player: Game.player,
        enemies: Game.enemies
    };
}

// Generate the basic map structure
Level.prototype._generateMap = function() {
    var W = this.MAP_WIDTH;
    var H = this.MAP_HEIGHT;
    // Initialize 2D array for map
    this.map = [];
    for (var x = 0; x < W; x++) {
        this.map[x] = [];
        for (var y = 0; y < H; y++) {
            // All tiles start as walls
            this.map[x][y] = {
                terrain: 'wall',
                passable: false,
                explored: false,
                being: null,
                item: null,
                decoration: null
            };
        }
    }
    // ROT.RNG.setSeed(1);
    var digger = new ROT.Map.Digger(W, H);
    var freeCells = [];
    
    var digCallback = function(x, y, value) {
        if (value) { return; }
        
        // Carve out a floor tile
        this.map[x][y] = {
            terrain: "floor",
            being: null,
            item: null,
            explored: false,
            passable: true
        };
        freeCells.push({x: x, y: y});
    }
    digger.create(digCallback.bind(this));
    
    this.freeCells = freeCells; // Store for population
    this.prettifyTerrain(); // Prettify the walls
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
        // On subsequent levels, just move the existing player
        Game.player.setPosition(x, y);
    } else {
        // On the first level, create the player
        Game.player = new Player(x, y);
    }
}

// Create all enemies based on this level's configuration
Level.prototype._createEnemies = function(freeCells) {
    // Iterate through all enemy types defined in enemyCounts
    for (var enemyType in this.enemyCounts) {
        var count = this.enemyCounts[enemyType];
        var EnemyClass = this.enemyClasses[enemyType];
        
        if (EnemyClass && count > 0) {
            // Create the specified number of this enemy type
            for (var i = 0; i < count; i++) {
                // Use the class's own createRandom method if it exists, otherwise use Being.createRandom
                if (EnemyClass.createRandom) {
                    Game.enemies.push(EnemyClass.createRandom(EnemyClass, freeCells));
                } else {
                    Game.enemies.push(Being.createRandom(EnemyClass, freeCells));
                }
            }
        }
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
    this._generateItems(Drumstick, this.itemCounts.DRUMSTICKS, freeCells);
    this._generateItems(Heart, this.itemCounts.HEARTS, freeCells);
}



// Generic item generation function
Level.prototype._generateItems = function(ItemClass, count, freeCells) {
    for (var i = 0; i < count; i++) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var cell = freeCells.splice(index, 1)[0];
        var x = cell.x;
        var y = cell.y;
        var item = new ItemClass(x, y);
        // NO DRAW CALL HERE
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
        CARNIVOROUS_PLANT: 1,
        MADFROG: 4,
        SCORPION: 4,
        GHOST: 1,
        COBRA: 2,
        ZOMBIE: 2
    };
    
    // Define item counts for Level 1
    this.itemCounts = {
        HEALTH_POTIONS: 2,
        GOLD_KEYS: 3,
        BOMBS: 1,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5,
        DRUMSTICKS: 2,
        HEARTS: 1
    };
}
Level1.prototype = Object.create(Level.prototype);
Level1.prototype.constructor = Level1;

// Level2 class for variety
var Level2 = function() {
    Level.call(this);
    
    // Define enemy counts for Level 2
    this.enemyCounts = {
        ASSASSIN: 4,
        FROG: 5,
        RAT: 5,
        CARNIVOROUS_PLANT: 1,
        MADFROG: 6,
        SCORPION: 6,
        GHOST: 2,
        COBRA: 3,
        ZOMBIE: 3
    };
    
    // Define item counts for Level 2
    this.itemCounts = {
        HEALTH_POTIONS: 2,
        GOLD_KEYS: 3,
        BOMBS: 2,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5,
        DRUMSTICKS: 3,
        HEARTS: 1
    };
}
Level2.prototype = Object.create(Level.prototype);
Level2.prototype.constructor = Level2;


var Level3 = function() {
    Level.call(this);
    
    // Define enemy counts for Level 3
    this.enemyCounts = {
        ASSASSIN: 8,
        FROG: 5,
        RAT: 5,
        CARNIVOROUS_PLANT: 1,
        MADFROG: 8,
        SCORPION: 8,
        GHOST: 3,
        COBRA: 4,
        ZOMBIE: 4
    };
    
    // Define item counts for Level 1
    this.itemCounts = {
        HEALTH_POTIONS: 3,
        GOLD_KEYS: 3,
        BOMBS: 3,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5,
        DRUMSTICKS: 3,
        HEARTS: 1
    };
}
Level3.prototype = Object.create(Level.prototype);
Level3.prototype.constructor = Level3;




var Level4 = function() {
    Level.call(this);
    
    // Define enemy counts for Level 4
    this.enemyCounts = {
        ASSASSIN: 16,
        FROG: 5,
        RAT: 5,
        CARNIVOROUS_PLANT: 1,
        MADFROG: 8,
        SCORPION: 8,
        GHOST: 4,
        COBRA: 6,
        ZOMBIE: 5
    };
    
    // Define item counts for Level 4
    this.itemCounts = {
        HEALTH_POTIONS: 3,
        GOLD_KEYS: 3,
        BOMBS: 3,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5,
        DRUMSTICKS: 4,
        HEARTS: 1
    };
}
Level4.prototype = Object.create(Level.prototype);
Level4.prototype.constructor = Level4;



var Level5 = function() {
    Level.call(this);
    
    // Define enemy counts for Level 5
    this.enemyCounts = {
        ASSASSIN: 32,
        FROG: 5,
        RAT: 5,
        CARNIVOROUS_PLANT: 1,
        MADFROG: 8,
        SCORPION: 8,
        GHOST: 5,
        COBRA: 8,
        ZOMBIE: 6
    };
    
    // Define item counts for Level 5
    this.itemCounts = {
        HEALTH_POTIONS: 3,
        GOLD_KEYS: 3,
        BOMBS: 3,
        EXITS: 1,
        STONESKIN_POTIONS: 1,
        SPEED_POTIONS: 1,
        GOLD_COINS: 5,
        DRUMSTICKS: 5,
        HEARTS: 1
    };
}
Level5.prototype = Object.create(Level.prototype);
Level5.prototype.constructor = Level5;
