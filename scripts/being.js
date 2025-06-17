// Base Being class
var Being = function(x, y) {
    this._x = x;
    this._y = y;
    this._health = 1; // Default health value
    this._strength = 1; // Default strength value
    this._name = "being"; // Default name
    this._sprite = "placeholder";
    this._isAttacking = false;
    this._isTakingDamage = false;
    this._isDead = false; // Ghost flag for mechanically dead beings
    
    // Add this being to the map only if coordinates are valid
    if (x !== undefined && y !== undefined && Game.isPassableTile(x, y)) {
        Game.currentLevel.map[x][y].being = this;
    }
}

Being.prototype.getSpeed = function() { return 100; }
Being.prototype.getX = function() { return this._x; }
Being.prototype.getY = function() { return this._y; }
Being.prototype.getHealth = function() { return this._health; }
Being.prototype.getStrength = function() { return this._strength; }
Being.prototype.getName = function() { return this._name; }
Being.prototype.getChar = function() { return this._char; }
Being.prototype._draw = function() {
    // Drawing is now handled by GameV2, so this method is no longer needed
}

// Method to move a being and update map tracking
Being.prototype._moveTo = function(newX, newY) {
    // Remove from old position
    if (Game.isPassableTile(this._x, this._y)) {
        Game.currentLevel.map[this._x][this._y].being = null;
    }
    
    // Update position
    this._x = newX;
    this._y = newY;
    
    // Add to new position
    if (Game.isPassableTile(this._x, this._y)) {
        Game.currentLevel.map[this._x][this._y].being = this;
    }
}

// Set the position of a being directly (used for level transitions)
Being.prototype.setPosition = function(x, y) {
    // Update coordinates
    this._x = x;
    this._y = y;
    
    // Update the being's position on the map
    Game.currentLevel.map[x][y].being = this;
}

// Take damage from an attacker
Being.prototype.takeDamage = function(damage) {
    // If invulnerable, take no damage
    if (this._isInvulnerable) {
        return false; // Not killed
    }
    
    // Set damage animation flag immediately
    this._isTakingDamage = true;
    
    this._health -= damage;
    
    if (this._health <= 0) {
        // Special handling for player death - use immediate cleanup
        if (this === Game.player) {
            this._isTakingDamage = false; // Clear animation immediately
            this.die(); // Use normal die method for player
            return true;
        }
        
        // For enemies: Mark as dead immediately (becomes a "ghost")
        this._isDead = true;
        
        // Remove from scheduler immediately (dies mechanically)
        Game.engine._scheduler.remove(this);
        
        // Remove from enemies array immediately
        var index = Game.enemies.indexOf(this);
        if (index !== -1) Game.enemies.splice(index, 1);
        
        // Queue visual cleanup after animation
        var self = this;
        Game.queueAnimation(function() {
            // Clear damage animation flag
            self._isTakingDamage = false;
            
            // Remove from map visually
            var tile = Game.currentLevel.map[self._x][self._y];
            if (tile && tile.being === self) {
                tile.being = null;
            }
        });
        
        return true; // Return true if the being died
    } else {
        // Queue clearing damage animation for living beings
        var self = this;
        Game.queueAnimation(function() {
            self._isTakingDamage = false;
        });
    }
    
    return false; // Return false if the being is still alive
}

// Update die method to handle both player and enemy deaths
Being.prototype.die = function() {
    // Remove from map tracking
    var tile = Game.currentLevel.map[this._x][this._y];
    if (tile) {
        tile.being = null;
    }
    
    // Remove from scheduler
    Game.engine._scheduler.remove(this);
    
    // For enemies, remove from enemies array (Player class will override this method)
    if (this !== Game.player) {
        var index = Game.enemies.indexOf(this);
        if (index !== -1) Game.enemies.splice(index, 1);
    }
}

Being.prototype.playAttackAnimation = function() {
    this._isAttacking = true;
    Game._drawAll();

    // Use the global animation system
    var self = this;
    Game.queueAnimation(function() {
        self._isAttacking = false;
    });
}

Being.prototype.playDamageAnimation = function() {
    // This method is now obsolete - damage animation is handled in takeDamage
}

// Visual flash effect for a being
Being.prototype._flash = function(color) {
    // Flash effect is now handled by the attack animation system
    // This method is kept for compatibility but does nothing
} 