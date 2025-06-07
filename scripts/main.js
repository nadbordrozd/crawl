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
    // Map dimensions - configurable parameters
    MAP_WIDTH: 80,
    MAP_HEIGHT: 25,
    
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
        // Create the main game display with map dimensions
        this.display = new ROT.Display({width: this.MAP_WIDTH, height: this.MAP_HEIGHT, spacing:1.1});
        
        // Create the stats display with the same width as main display
        this.statsDisplay = new ROT.Display({width: this.MAP_WIDTH, height: 1, spacing: 1.1});
        
        // Create the message display with the same width as main display  
        this.messageDisplay = new ROT.Display({
            width: this.MAP_WIDTH,
            height: 10, 
            spacing: 1.1,
            fg: "#fff",
            bg: "#000",
            textAlign: "left"
        });
        
        // Add all displays to the existing container with proper CSS classes
        var container = document.getElementById("game-container");
        
        // Add stats display with CSS class
        var statsContainer = this.statsDisplay.getContainer();
        statsContainer.className = "stats-display";
        container.appendChild(statsContainer);
        
        // Add main game display with CSS class
        var gameContainer = this.display.getContainer();
        gameContainer.className = "game-display";
        container.appendChild(gameContainer);
        
        // Add message display with CSS class
        var messageContainer = this.messageDisplay.getContainer();
        messageContainer.className = "message-display";
        container.appendChild(messageContainer);
        
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
        var W = this.MAP_WIDTH;
        var H = this.MAP_HEIGHT;
        var digger = new ROT.Map.Digger(W, H);
        var freeCells = [];
        
        var digCallback = function(x, y, value) {
            if (value) { return; }
            
            var key = x+","+y;
            this.map[key] = {
                terrain: ".",
                being: null,
                item: null
            };
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
            this.map[key] = {
                terrain: "*",
                being: null,
                item: null
            };
            if (!i) { this.ananas = key; } /* first box contains an ananas */
        }
    },
    
    _drawWholeMap: function() {
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            this.display.draw(x, y, this.map[key].terrain);
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



// Player class inherits from Being
var Player = function(x, y) {
    Being.call(this, x, y);
    this._health = 5; // Override default health for player
    this._strength = 1; // Player's strength
    this._name = "player";
    this._char = "@";
    this._color = "#ff0";
    
    // Statistics tracking
    this._turns = 0;
    this._steps = 0;
    this._enemiesDefeated = {}; // Key-value store: enemy name -> count
    
    this._draw();
}
Player.prototype = Object.create(Being.prototype);
Player.prototype.constructor = Player;

// Add methods to access statistics
Player.prototype.getTurns = function() { return this._turns; }
Player.prototype.getSteps = function() { return this._steps; }
Player.prototype.getEnemiesDefeated = function() { return this._enemiesDefeated; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    
    // Increment turn counter for any action
    this._turns++;
    
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
            // Track defeated enemy
            this._trackEnemyDefeat(targetEnemy);
            Game.message("You defeated the " + targetEnemy.getName() + "!");
        } else {
            Game.message("You hit the " + targetEnemy.getName() + "!");
        }
        // Player stays in place
    } else {
        // Check for nearby creatures and provide messages
        this._checkSurroundings(newX, newY);

        // Move player and increment step counter
        Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y].terrain);
        this._x = newX;
        this._y = newY;
        this._steps++; // Increment step counter when actually moving
        this._draw();
    }
    
    Game._drawStats();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

// Method to track defeated enemies
Player.prototype._trackEnemyDefeat = function(enemy) {
    var enemyName = enemy.getName();
    if (this._enemiesDefeated[enemyName]) {
        this._enemiesDefeated[enemyName]++;
    } else {
        this._enemiesDefeated[enemyName] = 1;
    }
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
    if (Game.map[key].terrain != "*") {
        Game.message("There is no box here!");
    } else if (key == Game.ananas) {
        Game.message("Hooray! You found an ananas and won this game.");
        Game.engine.lock();
        window.removeEventListener("keydown", this);
    } else {
        Game.message("This box is empty :-(");
    }
}

// Override die method for Player-specific behavior
Player.prototype.die = function() {
    // Call parent die method for basic cleanup (clear display, remove from scheduler)
    Being.prototype.die.call(this);
    
    // Player-specific death logic
    // Create death statistics message
    var statsMessage = "GAME OVER - You have died!\n\n";
    statsMessage += "Statistics:\n";
    statsMessage += "Turns elapsed: " + this.getTurns() + "\n";
    statsMessage += "Total distance traveled: " + this.getSteps() + " steps\n\n";
    
    var enemiesDefeated = this.getEnemiesDefeated();
    var totalEnemiesDefeated = 0;
    statsMessage += "Enemies defeated:\n";
    
    for (var enemyType in enemiesDefeated) {
        var count = enemiesDefeated[enemyType];
        totalEnemiesDefeated += count;
        statsMessage += "- " + enemyType + ": " + count + "\n";
    }
    
    if (totalEnemiesDefeated === 0) {
        statsMessage += "- None defeated\n";
    }
    
    statsMessage += "\nTotal enemies defeated: " + totalEnemiesDefeated;
    
    // Show the alert with statistics
    alert(statsMessage);
    
    // Player-specific cleanup
    Game.player = null;
    Game.engine.lock();
    Game.message("Game over - you have died!");
    window.removeEventListener("keydown", this);
}

Game.init();

