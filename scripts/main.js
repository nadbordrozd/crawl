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
    instructionsDisplay: null,
    messageHistory: [],
    fov: null, // NEW: Field of Vision object
    explored: [], // NEW: 2D array to track explored tiles
    FOV_RADIUS: 7,
    visibleCells: {}, // NEW: Cache for visible cells, updated each turn
    
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
        
        // Create instructions display
        var instructionsHeight = 1 + this.currentLevel.MAP_HEIGHT + 10;
        this.instructionsDisplay = new ROT.Display({
            width: 30,
            height: instructionsHeight,
            spacing: 1.1
        });
        var instructionsContainer = document.getElementById("instructions-container");
        var instructionsCanvas = this.instructionsDisplay.getContainer();
        instructionsCanvas.className = "game-display"; // Apply the same class as the main game
        instructionsContainer.appendChild(instructionsCanvas);

        // Generate the level (map + enemies + items)
        this.currentLevel.generate();
        
        // --- NEW FOV Initialization ---
        var fovPassableCallback = function(x, y) {
            return Game.isValidTile(x, y);
        }
        this.fov = new ROT.FOV.PreciseShadowcasting(fovPassableCallback);
        // --- END NEW ---

        this._drawInstructions();

        // Create a new scheduler and engine
        var scheduler = new ROT.Scheduler.Speed();
        
        // Add player to scheduler
        scheduler.add(this.player, true);
        
        // Add all enemies to scheduler
        for (var i = 0; i < this.enemies.length; i++) {
            scheduler.add(this.enemies[i], true);
        }

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
        
        // Initial draw
        this._drawAll();
        
        // Initial welcome message
        this.message("Welcome to the dungeon! Survive and explore!");
    },
    
    _drawInstructions: function() {
        var d = this.instructionsDisplay;
        d.clear();
        var y = 1;

        d.drawText(0, y++, "%c{white}--- Controls ---");
        d.drawText(0, y++, "%c{yellow}Arrow Keys:");
        d.drawText(2, y++, "%c{white}Move / Attack");
        d.drawText(0, y++, "%c{yellow}Spacebar:");
        d.drawText(2, y++, "%c{white}Wait a turn");
        y++;

        d.drawText(0, y++, "%c{white}--- Player ---");
        d.drawText(1, y++, `%c{${this.player._color}}${this.player._char}%c{white} : this is you`);
        y++;
        
        d.drawText(0, y++, "%c{white}--- Goal ---");
        var exit = new Exit();
        var key = new GoldKey();
        d.draw(1, y, exit._char, exit._color);
        d.drawText(3, y++, `%c{white} : Reach the exit`);
        d.draw(4, y++, `with 3 ${key._char}`);
        y++;

        d.drawText(0, y++, "%c{white}--- Items (Good!) ---");
        var items = [new HealthPotion(), new GoldKey(), new Bomb(), new StoneSkinPotion(), new SpeedPotion(), new GoldCoin()];
        items.forEach(function(item) {
            d.draw(1, y, item._char, item._color);
            d.drawText(3, y++, `%c{white} : ${item._name}`);
        });
        y++;

        d.drawText(0, y++, "%c{white}--- Enemies (Bad!) ---");
        var enemies = [new Assassin(), new Frog(), new Rat(), new Snail(), new MadFrog(), new MadRat()];
        enemies.forEach(function(enemy) {
            d.drawText(1, y++, `%c{${enemy._color}}${enemy._char}%c{white} : ${enemy._name}`);
        });
    },
    
    _drawAll: function() {
        this._drawMapAndFov();
        this._drawStats();
    },

    _drawMapAndFov: function() {
        this.display.clear();
        var player = this.player;

        // Compute FOV and update the cache
        this.visibleCells = {};
        var self = this;
        this.fov.compute(player.getX(), player.getY(), this.FOV_RADIUS, function(x, y, r, visibility) {
            self.visibleCells[x+","+y] = true;
            // Ensure the explored array is initialized for this coordinate
            if (!self.explored[x]) { self.explored[x] = []; }
            self.explored[x][y] = true;
        });

        // Draw the map by drawing each tile
        for (var x = 0; x < this.currentLevel.MAP_WIDTH; x++) {
            for (var y = 0; y < this.currentLevel.MAP_HEIGHT; y++) {
                this._drawTile(x, y);
            }
        }
    },
    
    _drawTile: function(x, y) {
        if (!this.explored[x] || !this.explored[x][y]) { return; }

        var tile = this.map[x][y];
        var isVisible = this.visibleCells[x+","+y];

        // If it's a wall
        if (!tile) {
            if (isVisible) {
                this.display.draw(x, y, "#", "#ffffff"); // Bright wall
            } else {
                this.display.draw(x, y, "#", "#808080"); // Dim wall
            }
            return;
        }

        // If it's a floor tile
        var displayChar, displayColor;

        if (isVisible) {
            // Currently visible: draw everything in full color
            var being = tile.being;
            var item = tile.item;

            if (being) {
                displayChar = being.getChar();
                displayColor = being._color;
            } else if (item) {
                displayChar = item.getChar();
                displayColor = item._color;
            } else {
                displayChar = tile.terrain;
                displayColor = "#ffffff"; // Bright color for visible terrain
            }
        } else {
            // Not visible, but explored: draw terrain and items in dim color
            var item = tile.item;
            if (item) {
                displayChar = item.getChar();
                displayColor = "#808080"; // Dim gray for memory
            } else {
                displayChar = tile.terrain;
                displayColor = "#808080"; // Dim gray for memory
            }
        }
        this.display.draw(x, y, displayChar, displayColor);
    },
    
    _drawStats: function() {
        this.statsDisplay.clear();
        if (this.player) {
            var keys = this.player.getKeysCollected();
            var coins = this.player.getCoinsCollected();
            var status = this.player.getStatus(); // Default status

            // Status effects override the default status display
            if (this.player._isInvulnerable) {
                status = "Invulnerable (" + this.player._invulnerabilityTurns + ")";
            } else if (this.player._isFast) {
                status = "Fast (" + this.player._speedBoostTurns + ")";
            }
            
            this.statsDisplay.drawText(0, 0, "Health: " + this.player.getHealth() + " | Status: " + status + " | Level: " + this.levelNumber + " | Keys: " + keys + "/3 | Gold: " + coins);
        } else {
            this.statsDisplay.drawText(0, 0, "Health: 0 (DEAD) | Status: dead | Level: " + this.levelNumber);
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

        // --- Correctly reset the game state for the new level ---

        // Clear all beings (except player) from the scheduler
        var scheduler = this.engine._scheduler;
        for (var i = 0; i < this.enemies.length; i++) {
            scheduler.remove(this.enemies[i]);
        }
        
        // Clear data from the previous level
        this.map = [];       // Use array for map
        this.explored = [];  // Use array for explored tiles
        this.enemies = [];
        
        // Reset player's keys for the new level
        this.player._keysCollected = 0;
        
        // Create the new level instance
        this.currentLevel = new levelClass();

        // Regenerate the world (this will also reposition the player)
        this.currentLevel.generate();
        
        // Add all new enemies to the scheduler
        for (var i = 0; i < this.enemies.length; i++) {
            scheduler.add(this.enemies[i], true);
        }
        
        // --- End of state reset ---

        this.message("You have advanced to level " + this.levelNumber + "!");
        this._drawAll();
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
    
    // NEW: Helper function to check if a tile is valid (i.e., within map bounds and not a wall)
    isValidTile: function(x, y) {
        return this.map[x] && this.map[x][y];
    },
    
    // Helper function to check if a position is occupied
    _isOccupied: function(x, y) {
        return this.isValidTile(x, y) && this.map[x][y].being !== null;
    },
    
    // Helper function to get the being at a position
    getBeingAt: function(x, y) {
        return this.isValidTile(x, y) ? this.map[x][y].being : null;
    },
    
    // Helper function to get the item at a position
    getItemAt: function(x, y) {
        return this.isValidTile(x, y) ? this.map[x][y].item : null;
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
    this._status = "bored"; // Player's current status
    this._isInvulnerable = false;
    this._invulnerabilityTurns = 0;
    this.INVULNERABILITY_DURATION = 30; // Configurable duration
    this._isFast = false;
    this._speedBoostTurns = 0;
    this.SPEED_BOOST_DURATION = 40; // Configurable duration
    
    // Statistics tracking
    this._turns = 0;
    this._steps = 0;
    this._enemiesDefeated = {}; // Key-value store: enemy name -> count
    this._keysCollected = 0; // Track number of keys collected
    this._coinsCollected = 0; // Track number of coins collected
}
Player.prototype = Object.create(Being.prototype);
Player.prototype.constructor = Player;

// Handle player appearance changes for status effects
Player.prototype._updateAppearance = function() {
    if (this._isInvulnerable) {
        this._color = "cyan";
    } else if (this._isFast) {
        this._color = "lightgreen";
    } else {
        this._color = "#ff0"; // Default yellow
    }
}

// Override getSpeed for Player to work with the ROT.js speed scheduler
Player.prototype.getSpeed = function() {
    return this._isFast ? 300 : 100;
};

// Apply the StoneSkin effect to the player
Player.prototype.applyStoneSkin = function() {
    this._isInvulnerable = true;
    this._invulnerabilityTurns = this.INVULNERABILITY_DURATION;
    this._updateAppearance();
    Game.message("You drink the potion and your skin turns to stone!");
    Game._drawAll(); // Update status bar
};

// Apply the SpeedBoost effect to the player
Player.prototype.applySpeedBoost = function() {
    this._isFast = true;
    this._speedBoostTurns = this.SPEED_BOOST_DURATION;
    this._updateAppearance();
    Game.message("You feel yourself moving faster!");
    Game._drawAll(); // Update status bar
};

// Add methods to access statistics
Player.prototype.getTurns = function() { return this._turns; }
Player.prototype.getSteps = function() { return this._steps; }
Player.prototype.getEnemiesDefeated = function() { return this._enemiesDefeated; }
Player.prototype.getStatus = function() { return this._status; }
Player.prototype.getKeysCollected = function() { return this._keysCollected; }
Player.prototype.getCoinsCollected = function() { return this._coinsCollected; }

Player.prototype.act = function() {
    var statusChanged = false;

    // Handle invulnerability countdown
    if (this._isInvulnerable) {
        this._invulnerabilityTurns--;
        if (this._invulnerabilityTurns <= 0) {
            this._isInvulnerable = false;
            Game.message("Your skin returns to normal.");
            statusChanged = true;
        }
    }

    // Handle speed boost countdown
    if (this._isFast) {
        this._speedBoostTurns--;
        if (this._speedBoostTurns <= 0) {
            this._isFast = false;
            Game.message("You feel yourself slowing down.");
            statusChanged = true;
        }
    }

    // Update appearance when any status changes
    if (statusChanged) {
        this._updateAppearance();
    }

    Game._drawAll();
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    
    // Increment turn counter for any action
    this._turns++;
    
    // --- NEW CHEAT CODE ---
    if (code == KEY_CODES.PAGE_UP) {
        this._health = 500;
        Game.message("%c{lime}Cheat activated: Health set to 500!");
        Game._drawAll();
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
        return;
    }
    // --- END CHEAT CODE ---
    
    if (code == KEY_CODES.SPACE) {
        // Check surroundings and skip turn
        this._checkSurroundings(this._x, this._y);
        Game.message("You look around carefully...");
        Game._drawAll();
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
        return;
    }

    var keyMap = {};
    keyMap[KEY_CODES.UP] = 0;
    keyMap[KEY_CODES.RIGHT] = 2;
    keyMap[KEY_CODES.PAGE_DOWN] = 3;
    keyMap[KEY_CODES.DOWN] = 4;
    keyMap[KEY_CODES.END] = 5;
    keyMap[KEY_CODES.LEFT] = 6;
    keyMap[KEY_CODES.HOME] = 7;

    /* one of numpad directions? */
    if (!(code in keyMap)) { 
        this._turns--; // Not a valid key, so don't waste a turn
        return; 
    }

    /* is there a free space? */
    var dir = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    if (!Game.isValidTile(newX, newY)) { return; }

    // Check for enemies at the target position
    var targetEnemy = Game.getBeingAt(newX, newY);
    // Make sure it's not the player themselves
    if (targetEnemy === this) {
        targetEnemy = null;
    }

    // If there's an enemy, attack it instead of moving
    if (targetEnemy) {
        this._flash(); // NEW: Player flashes red when attacking
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
    
    Game._drawAll();
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
    var item = Game.map[this._x][this._y].item;
    
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


