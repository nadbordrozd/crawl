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
    enemies: [], // Single array for all enemies
    levelNumber: 1, // Start at level 1
    currentLevel: null, // Current level instance
    statsDisplay: null,
    messageDisplay: null,
    messageHistory: [],
    
    init: function() {
        // Initialize Level 1
        this.currentLevel = new Level1();
        
        // Create the main game display with level dimensions
        this.display = new ROT.Display({width: this.currentLevel.MAP_WIDTH, height: this.currentLevel.MAP_HEIGHT, spacing:1.1});
        
        // Create the stats display with the same width as main display
        this.statsDisplay = new ROT.Display({width: this.currentLevel.MAP_WIDTH, height: 1, spacing: 1.1});
        
        // Create the message display with the same width as main display  
        this.messageDisplay = new ROT.Display({
            width: this.currentLevel.MAP_WIDTH,
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
        
        // Generate the level (map + enemies + items)
        this.currentLevel.generate();
        
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
        this.message("Welcome to the dungeon! Survive and explore!");
    },
    
    _drawStats: function() {
        this.statsDisplay.clear();
        if (this.player) {
            this.statsDisplay.drawText(0, 0, "Health: " + this.player.getHealth() + " | Status: " + this.player.getStatus());
        } else {
            this.statsDisplay.drawText(0, 0, "Health: 0 (DEAD) | Status: dead");
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
    
    nextLevel: function() {
        this.levelNumber++;
        var levelClass = window["Level" + this.levelNumber];

        if (!levelClass) {
            this._gameWon();
            return;
        }

        this.engine.lock(); // Stop the current game loop

        // Clear the entire display
        this.display.clear();

        // Clear data from the previous level
        this.map = {};
        this.enemies = [];
        
        // Create the new level
        this.currentLevel = new levelClass();
        
        // Regenerate the world
        this.currentLevel.generate();

        // Re-create scheduler and engine
        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        for (var i = 0; i < this.enemies.length; i++) {
            scheduler.add(this.enemies[i], true);
        }
        this.engine = new ROT.Engine(scheduler);

        this.message("You have advanced to level " + this.levelNumber + "!");
        this._drawStats();
        this.engine.unlock();
    },

    _gameWon: function() {
        this.engine.lock();
        Game.display.clear();
        var msg = "%c{lime}CONGRATULATIONS! You have won the game!";
        var x = Math.floor((this.currentLevel.MAP_WIDTH - (msg.length - 9)) / 2);
        var y = Math.floor(this.currentLevel.MAP_HEIGHT / 2);
        Game.display.drawText(x, y, msg);
    },
    
    // Helper function to check if a position is occupied
    _isOccupied: function(x, y) {
        var key = x + "," + y;
        return this.map[key] && this.map[key].being !== null;
    },
    
    // Helper function to get the being at a position
    getBeingAt: function(x, y) {
        var key = x + "," + y;
        return this.map[key] ? this.map[key].being : null;
    },
    
    // Helper function to get the item at a position
    getItemAt: function(x, y) {
        var key = x + "," + y;
        return this.map[key] ? this.map[key].item : null;
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
    this._health = 500; // Override default health for player
    this._strength = 1; // Player's strength
    this._name = "player";
    this._char = "@";
    this._color = "#ff0";
    this._status = "bored"; // Player's current status
    
    // Statistics tracking
    this._turns = 0;
    this._steps = 0;
    this._enemiesDefeated = {}; // Key-value store: enemy name -> count
    this._keysCollected = 0; // Track number of keys collected
    
    this._draw();
}
Player.prototype = Object.create(Being.prototype);
Player.prototype.constructor = Player;

// Add methods to access statistics
Player.prototype.getTurns = function() { return this._turns; }
Player.prototype.getSteps = function() { return this._steps; }
Player.prototype.getEnemiesDefeated = function() { return this._enemiesDefeated; }
Player.prototype.getStatus = function() { return this._status; }
Player.prototype.getKeysCollected = function() { return this._keysCollected; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    
    // Increment turn counter for any action
    this._turns++;
    

    
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
    var targetEnemy = Game.getBeingAt(newX, newY);
    // Make sure it's not the player themselves
    if (targetEnemy === this) {
        targetEnemy = null;
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
        this._moveTo(newX, newY);
        this._steps++; // Increment step counter when actually moving
        
        // Check for items to pick up at the new position
        this._checkForItems();
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
            } else if (enemy instanceof Assassin) {
                Game.message("You sense the Assassin's presence nearby!");
            }
            return;
        }
    }
}

// Method to check for items at the player's current position
Player.prototype._checkForItems = function() {
    var key = this._x + "," + this._y;
    var item = Game.map[key].item;
    
    if (item) {
        // Pick up the item
        item.pickup(this);
    }
}



// Override die method for Player-specific behavior
Player.prototype.die = function() {
    // Call parent die method for basic cleanup (clear display, remove from scheduler)
    Being.prototype.die.call(this);
    
    // Player-specific death logic
    // Create death statistics message
    var statsMessage = "GAME OVER - You have died!\\n\\n";
    statsMessage += "Statistics:\\n";
    statsMessage += "Turns elapsed: " + this.getTurns() + "\\n";
    statsMessage += "Total distance traveled: " + this.getSteps() + " steps\\n\\n";
    
    var enemiesDefeated = this.getEnemiesDefeated();
    var totalEnemiesDefeated = 0;
    statsMessage += "Enemies defeated:\\n";
    
    for (var enemyType in enemiesDefeated) {
        var count = enemiesDefeated[enemyType];
        totalEnemiesDefeated += count;
        statsMessage += "- " + enemyType + ": " + count + "\\n";
    }
    
    if (totalEnemiesDefeated === 0) {
        statsMessage += "- None defeated\\n";
    }
    
    statsMessage += "\\nTotal enemies defeated: " + totalEnemiesDefeated;
    statsMessage += "\\n\\n%c{lime}To start again, press ENTER";
    
    // Clear the main display and show the game over message
    Game.display.clear();
    var lines = statsMessage.split('\\n');
    var y_start = Math.floor((Game.currentLevel.MAP_HEIGHT - lines.length) / 2);

    for (var i = 0; i < lines.length; i++) {
        var x_start = Math.floor((Game.currentLevel.MAP_WIDTH - lines[i].length) / 2);
        // Add ROT.js color formatting
        Game.display.drawText(x_start, y_start + i, "%c{#fff}%b{#000}" + lines[i]);
    }
    
    // Player-specific cleanup
    Game.player = null;
    Game.engine.lock();
    Game.message("Game over - you have died!");
    window.removeEventListener("keydown", this);

    // Listen for Enter key to restart
    window.addEventListener("keydown", this._handleDeathScreenInput.bind(this));
}

// Handle input on the death screen
Player.prototype._handleDeathScreenInput = function(e) {
    if (e.keyCode === KEY_CODES.ENTER) {
        window.removeEventListener("keydown", this);
        location.reload();
    }
}

Game.init();

