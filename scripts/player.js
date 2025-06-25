// Player class inherits from Being
var Player = function(x, y) {
    Being.call(this, x, y);
    this._health = 5; // Override default health for player
    this._maxHealth = 5; // Maximum health for player
    this._strength = 1; // Player's strength
    this._name = "player";
    this._sprite = "player";
    this._status = "bored"; // Player's current status
    this._isInvulnerable = false;
    this._invulnerabilityTurns = 0;
    this.INVULNERABILITY_DURATION = 30; // Configurable duration
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
    this._inventory = [null, null, null, null]; // 4 inventory slots
    this.INVENTORY_SIZE = 4;
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
    this._speed = 300; // Increase speed when fast
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
Player.prototype.getMaxHealth = function() { return this._maxHealth; }

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
            this._speed = 100; // Reset speed to normal
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
    
    // Handle inventory usage (number keys 1-9)
    if (code >= 49 && code <= 57) { // Key codes for 1-9
        var slotIndex = code - 49; // Convert to 0-8 index
        // Only allow using slots that exist for this player
        if (slotIndex < this.INVENTORY_SIZE) {
            if (this.useInventoryItem(slotIndex)) {
                Game.message("You used the item from slot " + (slotIndex + 1) + "!");
            } else {
                Game.message("No item in slot " + (slotIndex + 1) + " to use.");
                this._turns--; // Don't waste a turn for empty slot
            }
        } else {
            Game.message("You don't have inventory slot " + (slotIndex + 1) + " yet!");
            this._turns--; // Don't waste a turn for invalid slot
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
    
    // Calculate final score
    var finalScore = Leaderboard.calculateScore(this, Game.levelNumber);
    
    // Display comprehensive death statistics with score submission
    this._showDeathStatisticsWithLeaderboard(finalScore);
    
    // Player-specific cleanup
    Game.player = null;
    Game.engine.lock();
    window.removeEventListener("keydown", this);
}

// Show death statistics with leaderboard submission
Player.prototype._showDeathStatisticsWithLeaderboard = function(finalScore) {
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
    overlay.className = 'death-screen-overlay';
    
    // Create the stats content
    var statsContent = document.createElement('div');
    statsContent.className = 'death-screen-content';
    
    // Build the stats HTML
    var statsHTML = '<div style="color: #ff4444; font-size: 24px; font-weight: bold; margin-bottom: 20px;">💀 GAME OVER 💀</div>';
    statsHTML += '<div style="color: #ffff44; font-size: 28px; font-weight: bold; margin-bottom: 15px;">FINAL SCORE: ' + finalScore.toLocaleString() + '</div>';
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
    
    // Add name input and leaderboard submission
    statsHTML += '<div class="name-input-container">';
    statsHTML += '<div style="color: #ffff44; font-weight: bold; margin-bottom: 10px;">🏆 Submit to Leaderboard 🏆</div>';
    statsHTML += '<div style="margin-bottom: 10px;">Enter your name:</div>';
    statsHTML += '<input type="text" id="player-name-input" class="name-input" placeholder="Your Name" maxlength="20">';
    statsHTML += '<div style="margin-top: 15px;">';
    statsHTML += '<button id="submit-score-btn" class="submit-score-btn">Submit Score</button>';
    statsHTML += '<button id="skip-submit-btn" class="skip-submit-btn">Skip</button>';
    statsHTML += '</div>';
    statsHTML += '</div>';
    
    statsHTML += '<div style="color: #44ff44; font-size: 16px; margin-top: 25px; font-weight: bold;">Or press ENTER to start over without submitting</div>';
    
    statsContent.innerHTML = statsHTML;
    overlay.appendChild(statsContent);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Store stats for submission
    this._finalStats = {
        level: Game.levelNumber,
        turns: this.getTurns(),
        steps: this.getSteps(),
        coinsCollected: this.getCoinsCollected(),
        totalEnemiesDefeated: totalEnemiesDefeated
    };
    this._finalScore = finalScore;
    
    // Set up event listeners
    this._setupDeathScreenEventListeners();
}

// Set up event listeners for the death screen
Player.prototype._setupDeathScreenEventListeners = function() {
    var self = this;
    
    // Handle Enter key to restart without submitting
    var keyHandler = function(e) {
        if (e.keyCode === KEY_CODES.ENTER) {
            self._restartGame();
        }
    };
    window.addEventListener("keydown", keyHandler);
    
    // Handle submit button
    var submitBtn = document.getElementById('submit-score-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            self._submitScore();
        });
    }
    
    // Handle skip button
    var skipBtn = document.getElementById('skip-submit-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', function() {
            self._restartGame();
        });
    }
    
    // Handle Enter key in name input to submit
    var nameInput = document.getElementById('player-name-input');
    if (nameInput) {
        nameInput.addEventListener('keypress', function(e) {
            if (e.keyCode === KEY_CODES.ENTER) {
                self._submitScore();
            }
        });
        nameInput.focus(); // Focus the input for immediate typing
    }
    
    // Store reference to cleanup later
    this._deathScreenKeyHandler = keyHandler;
}

// Submit score to leaderboard
Player.prototype._submitScore = async function() {
    var nameInput = document.getElementById('player-name-input');
    var submitBtn = document.getElementById('submit-score-btn');
    
    if (!nameInput || !submitBtn) return;
    
    var playerName = nameInput.value.trim();
    if (!playerName) {
        nameInput.style.borderColor = '#ff4444';
        nameInput.placeholder = 'Name required!';
        return;
    }
    
    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        var success = await Leaderboard.submitScore(playerName, this._finalScore, this._finalStats);
        
        if (success) {
            // Show success message
            submitBtn.textContent = 'Success!';
            submitBtn.style.backgroundColor = '#44ff44';
            setTimeout(() => {
                this._showLeaderboardThenRestart(true); // true = score was submitted
            }, 1000);
        } else {
            throw new Error('Submission failed');
        }
    } catch (error) {
        console.error('Error submitting score:', error);
        submitBtn.textContent = 'Failed - Try Again';
        submitBtn.style.backgroundColor = '#ff4444';
        submitBtn.disabled = false;
    }
}

// Restart the game
Player.prototype._restartGame = function() {
    this._showLeaderboardThenRestart(false); // false = score was not submitted
}

// Show leaderboard then restart the game
Player.prototype._showLeaderboardThenRestart = function(scoreSubmitted) {
    // Remove the death screen overlay
    var overlay = document.getElementById('death-stats-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
    
    // Clean up event listener
    if (this._deathScreenKeyHandler) {
        window.removeEventListener("keydown", this._deathScreenKeyHandler);
    }
    
    // Show leaderboard with a message about the player's performance
    this._showFinalLeaderboard(scoreSubmitted);
}

// Show the final leaderboard with player context
Player.prototype._showFinalLeaderboard = async function(scoreSubmitted) {
    try {
        // Show loading message
        var loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'death-screen-overlay';
        loadingOverlay.innerHTML = '<div style="color: white; font-size: 20px;">Loading leaderboard...</div>';
        document.body.appendChild(loadingOverlay);
        
        // Get leaderboard data
        var scores = await Leaderboard.getTopScores();
        
        // Remove loading message
        document.body.removeChild(loadingOverlay);
        
        // Find player's rank if they submitted
        var playerRank = null;
        if (scoreSubmitted) {
            for (var i = 0; i < scores.length; i++) {
                if (scores[i].score === this._finalScore) {
                    playerRank = i + 1;
                    break;
                }
            }
        }
        
        // Show leaderboard with custom message
        this._renderFinalLeaderboard(scores, scoreSubmitted, playerRank);
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        // If leaderboard fails to load, just restart
        setTimeout(() => location.reload(), 1000);
    }
}

// Render the final leaderboard with restart functionality
Player.prototype._renderFinalLeaderboard = function(scores, scoreSubmitted, playerRank) {
    var overlay = document.createElement('div');
    overlay.className = 'death-screen-overlay';
    
    var content = document.createElement('div');
    content.className = 'leaderboard-content';
    
    // Header with player's result
    var headerMessage = '';
    if (scoreSubmitted && playerRank) {
        headerMessage = '<div style="color: #44ff44; font-size: 20px; margin-bottom: 15px;">🎉 You ranked #' + playerRank + ' with ' + this._finalScore.toLocaleString() + ' points! 🎉</div>';
    } else if (scoreSubmitted) {
        headerMessage = '<div style="color: #ffff44; font-size: 18px; margin-bottom: 15px;">Score submitted: ' + this._finalScore.toLocaleString() + ' points</div>';
    } else {
        headerMessage = '<div style="color: #ffaa44; font-size: 18px; margin-bottom: 15px;">Your score: ' + this._finalScore.toLocaleString() + ' points</div>';
    }
    
    var html = headerMessage;
    html += '<div style="color: #ffff44; font-size: 24px; font-weight: bold; margin-bottom: 20px;">🏆 LEADERBOARD 🏆</div>';
    
    if (scores.length === 0) {
        html += '<div style="color: white; text-align: center; margin: 50px;">No scores yet!</div>';
    } else {
        html += '<div class="leaderboard-list">';
        html += '<div class="leaderboard-header-row">';
        html += '<div class="rank-col">Rank</div>';
        html += '<div class="name-col">Name</div>';
        html += '<div class="score-col">Score</div>';
        html += '<div class="level-col">Level</div>';
        html += '<div class="stats-col">Stats</div>';
        html += '</div>';
        
        // Show top 10 or all scores if fewer than 10
        var displayCount = Math.min(scores.length, 10);
        for (var i = 0; i < displayCount; i++) {
            var scoreEntry = scores[i];
            var rank = i + 1;
            var rankDisplay = rank;
            if (rank === 1) rankDisplay = '🥇';
            else if (rank === 2) rankDisplay = '🥈';
            else if (rank === 3) rankDisplay = '🥉';
            
            // Highlight the player's score if it's in the top 10
            var rowClass = 'leaderboard-row';
            if (scoreSubmitted && scoreEntry.score === this._finalScore) {
                rowClass += '" style="background-color: #4a4a00; border: 2px solid #ffff44;';
            }
            
            html += '<div class="' + rowClass + '">';
            html += '<div class="rank-col">' + rankDisplay + '</div>';
            html += '<div class="name-col">' + (scoreEntry.name || 'Anonymous') + '</div>';
            html += '<div class="score-col">' + scoreEntry.score.toLocaleString() + '</div>';
            html += '<div class="level-col">' + scoreEntry.level + '</div>';
            html += '<div class="stats-col">' + scoreEntry.totalEnemiesDefeated + ' enemies, ' + scoreEntry.coinsCollected + ' coins</div>';
            html += '</div>';
        }
        
        if (scores.length > 10) {
            html += '<div style="text-align: center; margin: 10px; color: #999;">... and ' + (scores.length - 10) + ' more scores</div>';
        }
        
        html += '</div>';
    }
    
    html += '<div style="margin-top: 30px; text-align: center;">';
    html += '<div style="color: #cccccc; margin-bottom: 15px;">Game will restart automatically in <span id="countdown">10</span> seconds</div>';
    html += '<button id="restart-now-btn" style="background: #44ff44; color: black; border: none; padding: 15px 30px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: \'Courier New\', Courier, monospace; font-size: 16px;">🎮 Play Again Now</button>';
    html += '</div>';
    
    content.innerHTML = html;
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Set up restart button
    document.getElementById('restart-now-btn').addEventListener('click', function() {
        location.reload();
    });
    
    // Set up 10-second countdown
    var countdown = 10;
    var countdownElement = document.getElementById('countdown');
    var countdownInterval = setInterval(function() {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            location.reload();
        }
    }, 1000);
} 