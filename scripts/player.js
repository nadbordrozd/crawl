// Player class inherits from Being
var Player = function(x, y) {
    Being.call(this, x, y);
    this._health = 5; // Override default health for player
    this._strength = 1; // Player's strength
    this._name = "player";
    this._sprite = "player";
    this._status = "bored"; // Player's current status
    this._isInvulnerable = false;
    this._invulnerabilityTurns = 0;
    this.INVULNERABILITY_DURATION = 50; // Configurable duration
    this._isFast = false;
    this._speedBoostTurns = 0;
    this.SPEED_BOOST_DURATION = 60; // Configurable duration
    
    // Statistics tracking
    this._turns = 0;
    this._steps = 0;
    this._enemiesDefeated = {}; // Key-value store: enemy name -> count
    this._keysCollected = 0; // Track number of keys collected
    this._coinsCollected = 0; // Track number of coins collected
    
    // Inventory system
    this._inventory = [null, null, null, null, null, null]; // 6 inventory slots
    this.INVENTORY_SIZE = 6;
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

// Inventory management methods
Player.prototype.addToInventory = function(item) {
    // Find first empty slot
    for (var i = 0; i < this.INVENTORY_SIZE; i++) {
        if (this._inventory[i] === null) {
            this._inventory[i] = item;
            return true; // Successfully added
        }
    }
    return false; // Inventory full
}

Player.prototype.useInventoryItem = function(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.INVENTORY_SIZE) {
        return false; // Invalid slot
    }
    
    var item = this._inventory[slotIndex];
    if (item === null) {
        return false; // Empty slot
    }
    
    // Use the item on the player
    item.use(this);
    
    // Remove from inventory
    this._inventory[slotIndex] = null;
    
    return true; // Successfully used
}

Player.prototype.getInventory = function() {
    return this._inventory;
}

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
    
    // Handle inventory usage (number keys 1-6)
    if (code >= 49 && code <= 54) { // Key codes for 1-6
        var slotIndex = code - 49; // Convert to 0-5 index
        if (this.useInventoryItem(slotIndex)) {
            Game.message("You used the item from slot " + (slotIndex + 1) + "!");
        } else {
            Game.message("No item in slot " + (slotIndex + 1) + " to use.");
            this._turns--; // Don't waste a turn for empty slot
        }
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
    if (!Game.isPassableTile(newX, newY)) { return; }

    // Check for enemies at the target position
    var targetEnemy = Game.getBeingAt(newX, newY);
    // Make sure it's not the player themselves
    if (targetEnemy === this) {
        targetEnemy = null;
    }

    // If there's an enemy, attack it instead of moving
    if (targetEnemy) {
        this._flash(); // NEW: Player flashes red when attacking
        this.playAttackAnimation();
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
    var item = Game.currentLevel.map[this._x][this._y].item;
    
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
        statsMessage += "- None\\n";
    }
    
    statsMessage += "\\nTotal enemies defeated: " + totalEnemiesDefeated;
    statsMessage += "\\n\\n%c{lime}To start again, press ENTER";
    
    // Display comprehensive death statistics on the main game display
    this._showDeathStatistics();
    
    // Player-specific cleanup
    Game.player = null;
    Game.engine.lock();
    window.removeEventListener("keydown", this);

    // Listen for Enter key to restart
    window.addEventListener("keydown", this._handleDeathScreenInput.bind(this));
}

// Show death statistics using a custom HTML overlay
Player.prototype._showDeathStatistics = function() {
    // Clear the tile display
    if (Game.display) {
        Game.display.clear();
    }
    
    // Build comprehensive statistics
    var enemiesDefeated = this.getEnemiesDefeated();
    var totalEnemiesDefeated = 0;
    
    for (var enemyType in enemiesDefeated) {
        totalEnemiesDefeated += enemiesDefeated[enemyType];
    }
    
    // Create the overlay HTML
    var overlay = document.createElement('div');
    overlay.id = 'death-stats-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '18px';
    
    // Create the stats content
    var statsContent = document.createElement('div');
    statsContent.style.backgroundColor = '#2a2a2a';
    statsContent.style.border = '3px solid #555';
    statsContent.style.borderRadius = '10px';
    statsContent.style.padding = '30px';
    statsContent.style.textAlign = 'center';
    statsContent.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.8)';
    statsContent.style.maxWidth = '500px';
    
    // Build the stats HTML
    var statsHTML = '<div style="color: #ff4444; font-size: 24px; font-weight: bold; margin-bottom: 20px;">GAME OVER - You have died!</div>';
    statsHTML += '<div style="color: #ffff44; font-size: 20px; font-weight: bold; margin-bottom: 15px;">FINAL STATISTICS</div>';
    statsHTML += '<div style="color: #ffffff; text-align: left; margin-bottom: 20px;">';
    statsHTML += '<div style="margin: 5px 0;">Level reached: <span style="color: #44ff44;">' + Game.levelNumber + '</span></div>';
    statsHTML += '<div style="margin: 5px 0;">Rounds survived: <span style="color: #44ff44;">' + this.getTurns() + '</span></div>';
    statsHTML += '<div style="margin: 5px 0;">Steps traveled: <span style="color: #44ff44;">' + this.getSteps() + '</span></div>';
    statsHTML += '<div style="margin: 5px 0;">Gold collected: <span style="color: #44ff44;">' + this.getCoinsCollected() + '</span></div>';
    statsHTML += '</div>';
    
    // Add monster statistics
    statsHTML += '<div style="color: #cccccc; margin: 15px 0; font-weight: bold;">Monsters defeated:</div>';
    statsHTML += '<div style="color: #ffffff; text-align: left;">';
    
    if (totalEnemiesDefeated === 0) {
        statsHTML += '<div style="margin: 5px 0; text-align: center; color: #888;">None</div>';
    } else {
        for (var enemyType in enemiesDefeated) {
            var count = enemiesDefeated[enemyType];
            statsHTML += '<div style="margin: 5px 0;">• ' + enemyType + ': <span style="color: #44ff44;">' + count + '</span></div>';
        }
    }
    
    statsHTML += '</div>';
    statsHTML += '<div style="color: #ffaa44; margin: 15px 0; font-weight: bold;">Total monsters defeated: ' + totalEnemiesDefeated + '</div>';
    statsHTML += '<div style="color: #44ff44; font-size: 16px; margin-top: 25px; font-weight: bold;">Press ENTER to start over</div>';
    
    statsContent.innerHTML = statsHTML;
    overlay.appendChild(statsContent);
    
    // Add to document
    document.body.appendChild(overlay);
}

// Handle input on the death screen
Player.prototype._handleDeathScreenInput = function(e) {
    if (e.keyCode === KEY_CODES.ENTER) {
        // Remove the overlay
        var overlay = document.getElementById('death-stats-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        
        window.removeEventListener("keydown", this);
        location.reload();
    }
} 