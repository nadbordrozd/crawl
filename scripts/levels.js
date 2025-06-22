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
    
    // Wall sprite set for this level - can be overridden by subclasses
    this.wallSpriteSet = 'DEFAULT';
    
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
        IMP: Imp,
        REAPER: Reaper,
        SKELETON: Skeleton,
        ORC: Orc,
        UNICORN: Unicorn,
        TROLL: Troll,
        FLAMING_HORSE: FlamingHorse
    };
    
    // Mapping of item type names to their classes
    this.itemClasses = {
        HEALTH_POTIONS: HealthPotion,
        GOLD_KEYS: GoldKey,
        BOMBS: Bomb,
        EXITS: Exit,
        STONESKIN_POTIONS: StoneSkinPotion,
        SPEED_POTIONS: SpeedPotion,
        GOLD_COINS: GoldCoin,
        DRUMSTICKS: Drumstick,
        HEARTS: Heart,
        SUMMONING_RINGS: SummoningRing,
        SCROLLS_OF_REVELATION: ScrollOfRevelation,
        BELTS: Belt
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
                this.prettifyPassableTile(x, y, tile);
            } else {
                this.prettifyWallTile(x, y, tile);
            }
        }
    }
}

// Prettify passable tiles - can be overridden by child classes
Level.prototype.prettifyPassableTile = function(x, y, tile) {
    tile.terrain = 'dirt18';
    if (ROT.RNG.getUniform() < 0.005) {
        tile.decoration = 'ribcage';
    } else if (ROT.RNG.getUniform() < 0.005) {
        tile.decoration = 'bull_skull';
    } else if (ROT.RNG.getUniform() < 0.005) {
        tile.decoration = 'skeleton_remains';
    }
}

// Prettify wall tiles - can be overridden by child classes
Level.prototype.prettifyWallTile = function(x, y, tile) {
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

    // Get the wall sprite set for this level
    var wallSet = SPRITES.WALL_SETS[this.wallSpriteSet];
    var wallType;
    
    if((wall4 || wall6) && passable8 && passable2){
        wallType = "WE_wall";
    } else if((wall8 || wall2) && passable4 && passable6){
        wallType = "NS_wall";
    } else if(wall4 && wall6 && wall8 && passable7 && passable9) {
        wallType = "reverse_t_wall";
    } else if(wall4 && wall6 && wall8 && passable2 && (passable7 || passable9)) {
        wallType = "reverse_t_wall";
    } else if(wall4 && wall6 && wall2 && (passable1 && passable3)){
        wallType = "t_wall";
    } else if(wall4 && wall6 && wall2 && passable8 && (passable1 || passable3)){
        wallType = "t_wall";
    } else if((wall8 && wall6) && ((passable4 && passable2) || passable9)){
        wallType = "SW_corner";
    } else if((wall4 && wall8) && ((passable6 && passable2) || passable7)){
        wallType = "SE_corner";
    } else if((wall4 && wall2) && ((passable8 && passable6) || passable1)){
        wallType = "NE_corner";
    } else if((wall6 && wall2) && ((passable4 && passable8) || passable3)){
        wallType = "NW_corner";
    } else if(wall8 && wall2){
        wallType = "NS_wall";
    } else {
        wallType = "WE_wall";
    }

    // Apply special wall variants for certain conditions
    if(passable2 && wallType == 'WE_wall'){
        // pick a random integer number from 0 to 10
        var randomNumber = Math.floor(ROT.RNG.getUniform() * 10);
        if(randomNumber == 2) {
            wallType = "torch_wall";
        } else if (randomNumber == 1) {
            wallType = "grate_wall";
        }
    }
    
    // Set the terrain using the wall sprite set
    tile.terrain = wallSet[wallType];
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
                // Use class-specific createRandom if available, otherwise use Being.createRandom
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
    // Iterate through all item types defined in itemCounts
    for (var itemType in this.itemCounts) {
        var count = this.itemCounts[itemType];
        var ItemClass = this.itemClasses[itemType];
        
        if (ItemClass && count > 0) {
            // Create the specified number of this item type
            this._generateItems(ItemClass, count, freeCells);
        }
    }
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
        GOLD_COINS: 3,
        DRUMSTICKS: 2,
        HEARTS: 0
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

// ZombieLevel class - a spooky graveyard level with lots of undead
var ZombieLevel = function() {
    Level.call(this);
    
    // Define enemy counts for Zombie Level - undead themed
    this.enemyCounts = {
        SKELETON: 10,
        ZOMBIE: 40,
        GHOST: 5,
        REAPER: 1
        // No other enemies - pure undead level
    };
    
    // Define item counts for Zombie Level - survival focused
    this.itemCounts = {
        HEALTH_POTIONS: 1,  // 1 healing potion
        GOLD_KEYS: 3,       // Still need keys for exit
        BOMBS: 1,           // 1 bomb
        EXITS: 1,           // Need an exit
        STONESKIN_POTIONS: 0, // No defensive potions
        SPEED_POTIONS: 1,   // No speed potions
        GOLD_COINS: 5,      // No coins in this grim place
        DRUMSTICKS: 3,      // 2 drumsticks for healing
        HEARTS: 1,           // 1 heart for permanent health boost
        SCROLLS_OF_REVELATION: 1
    };
}
ZombieLevel.prototype = Object.create(Level.prototype);
ZombieLevel.prototype.constructor = ZombieLevel;

// Override _generateMap to create an open graveyard with some wall structures
ZombieLevel.prototype._generateMap = function() {
    var W = this.MAP_WIDTH;
    var H = this.MAP_HEIGHT;
    
    // Initialize 2D array for map
    this.map = [];
    var freeCells = [];
    
    for (var x = 0; x < W; x++) {
        this.map[x] = [];
        for (var y = 0; y < H; y++) {
            // Make everything passable floor (open graveyard)
            this.map[x][y] = {
                terrain: "floor",
                being: null,
                item: null,
                explored: false,
                passable: true,
                decoration: null
            };
            freeCells.push({x: x, y: y});
        }
    }
    
    // Add random wall structures to break up the open space
    this._addRandomWalls();
    
    // Rebuild freeCells list after adding walls
    freeCells = [];
    for (var x = 0; x < W; x++) {
        for (var y = 0; y < H; y++) {
            if (this.map[x][y].passable) {
                freeCells.push({x: x, y: y});
            }
        }
    }
    
    this.freeCells = freeCells; // Store for population
    this.prettifyTerrain(); // Add grave decorations
}

// Add random wall structures to the zombie level
ZombieLevel.prototype._addRandomWalls = function() {
    var W = this.MAP_WIDTH;
    var H = this.MAP_HEIGHT;
    
    // Add 5 random 4x4 wall regions
    for (var i = 0; i < 5; i++) {
        var attempts = 0;
        var placed = false;
        
        while (!placed && attempts < 50) {
            // Pick random top-left corner for 4x4 region
            var startX = Math.floor(ROT.RNG.getUniform() * (W - 4));
            var startY = Math.floor(ROT.RNG.getUniform() * (H - 4));
            
            // Check if this region overlaps with existing walls
            var canPlace = true;
            for (var x = startX; x < startX + 4 && canPlace; x++) {
                for (var y = startY; y < startY + 4 && canPlace; y++) {
                    if (!this.map[x][y].passable) {
                        canPlace = false;
                    }
                }
            }
            
            if (canPlace) {
                // Place 4x4 wall region
                for (var x = startX; x < startX + 4; x++) {
                    for (var y = startY; y < startY + 4; y++) {
                        this.map[x][y].terrain = "wall";
                        this.map[x][y].passable = false;
                    }
                }
                placed = true;
            }
            attempts++;
        }
    }
    
    // Add 2 random 3x3 wall regions
    for (var i = 0; i < 2; i++) {
        var attempts = 0;
        var placed = false;
        
        while (!placed && attempts < 50) {
            // Pick random top-left corner for 3x3 region
            var startX = Math.floor(ROT.RNG.getUniform() * (W - 3));
            var startY = Math.floor(ROT.RNG.getUniform() * (H - 3));
            
            // Check if this region overlaps with existing walls
            var canPlace = true;
            for (var x = startX; x < startX + 3 && canPlace; x++) {
                for (var y = startY; y < startY + 3 && canPlace; y++) {
                    if (!this.map[x][y].passable) {
                        canPlace = false;
                    }
                }
            }
            
            if (canPlace) {
                // Place 3x3 wall region
                for (var x = startX; x < startX + 3; x++) {
                    for (var y = startY; y < startY + 3; y++) {
                        this.map[x][y].terrain = "wall";
                        this.map[x][y].passable = false;
                    }
                }
                placed = true;
            }
            attempts++;
        }
    }
}

// Override prettifyPassableTile to add graves and bone decorations
ZombieLevel.prototype.prettifyPassableTile = function(x, y, tile) {
    tile.terrain = 'dirt18'; // Keep the same terrain
    
    // Add grave decorations - 3x more common than normal skull decorations
    // Normal skull decorations are 0.005 each, so graves are 0.015 each
    var graveChance = 0.015;
    
    // Add bone decorations - 20% as many as graves (0.003 each)
    var boneChance = graveChance * 0.2;
    
    if (ROT.RNG.getUniform() < graveChance) {
        tile.decoration = 'grave1';
    } else if (ROT.RNG.getUniform() < graveChance) {
        tile.decoration = 'grave2';
    } else if (ROT.RNG.getUniform() < graveChance) {
        tile.decoration = 'grave3';
    } else if (ROT.RNG.getUniform() < graveChance) {
        tile.decoration = 'grave4';
    } else if (ROT.RNG.getUniform() < boneChance) {
        tile.decoration = 'skeleton_remains';
    } else if (ROT.RNG.getUniform() < boneChance) {
        tile.decoration = 'bull_skull';
    } else if (ROT.RNG.getUniform() < boneChance) {
        tile.decoration = 'ribcage';
    }
}

// ImpLevel class - a level focused on teleporting imp enemies
var ImpLevel = function() {
    Level.call(this);
    
    // Define enemy counts for Imp Level - teleportation chaos
    this.enemyCounts = {
        IMP: 10, // Only imps - pure teleportation mayhem
        FLAMING_HORSE: 4
    };
    
    // Define item counts for Imp Level - mobility and survival focused
    this.itemCounts = {
        HEALTH_POTIONS: 1,    // 1 healing potion
        GOLD_KEYS: 3,         // Still need keys for exit
        BOMBS: 1,             // 1 bomb for crowd control
        EXITS: 1,             // Need an exit
        STONESKIN_POTIONS: 1, // No defensive potions
        SPEED_POTIONS: 2,     // 2 speed potions for mobility
        GOLD_COINS: 3,
        DRUMSTICKS: 4,        // 4 drumsticks for healing
        HEARTS: 1,            
    };
}
ImpLevel.prototype = Object.create(Level.prototype);
ImpLevel.prototype.constructor = ImpLevel;

// TrollLevel class - a level with powerful melee enemies
var TrollLevel = function() {
    Level.call(this);
    
    // Define enemy counts for Troll Level - heavy melee combat
    this.enemyCounts = {
        TROLL: 2,       // 2 powerful trolls
        ORC: 5,         // 5 strong orcs
        RAT: 3,         // 3 rats for variety
        FROG: 3         // 3 frogs for variety
    };
    
    // Define item counts for Troll Level - survival and support focused
    this.itemCounts = {
        HEALTH_POTIONS: 1,    // No health potions
        GOLD_KEYS: 3,         // Still need keys for exit
        BOMBS: 1,             // 1 bomb for crowd control
        EXITS: 1,             // Need an exit
        STONESKIN_POTIONS: 1, // 1 stoneskin potion for defense
        SPEED_POTIONS: 0,     // No speed potions
        GOLD_COINS: 0,        // No coins
        DRUMSTICKS: 2,        // 2 drumsticks for healing
        HEARTS: 0,            // No hearts
        SUMMONING_RINGS: 1,   // 1 summoning ring for help
        BELTS: 6              // 1 belt to increase inventory capacity
    };
}
TrollLevel.prototype = Object.create(Level.prototype);
TrollLevel.prototype.constructor = TrollLevel;

// CobraLevel class - a level with venomous snakes and arachnids
var CobraLevel = function() {
    Level.call(this);
    
    // Use Egyptian-themed wall sprites for this desert/snake level
    this.wallSpriteSet = 'EGYPT';
    
    // Define enemy counts for Cobra Level - venomous creatures
    this.enemyCounts = {
        COBRA: 30,      // 30 cobras - lots of venomous snakes
        SCORPION: 10    // 10 scorpions - dangerous arachnids
    };
    
    // Define item counts for Cobra Level - minimal supplies
    this.itemCounts = {
        HEALTH_POTIONS: 1,    // 1 health potion
        GOLD_KEYS: 3,         // Still need keys for exit
        BOMBS: 0,             // No bombs
        EXITS: 1,             // Need an exit
        STONESKIN_POTIONS: 0, // No stoneskin potions
        SPEED_POTIONS: 1,     // 1 speed potion
        GOLD_COINS: 3,        // 3 gold coins
        DRUMSTICKS: 1,        // 1 drumstick for healing
        HEARTS: 0,            // No hearts
        SUMMONING_RINGS: 0,   // No summoning rings
        BELTS: 1,             // 1 belt to increase inventory capacity
        SCROLLS_OF_REVELATION: 1 // 1 scroll of revelation
    };
}
CobraLevel.prototype = Object.create(Level.prototype);
CobraLevel.prototype.constructor = CobraLevel;
