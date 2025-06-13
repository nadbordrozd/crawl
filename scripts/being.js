// Base Being class
var Being = function(x, y) {
    this._x = x;
    this._y = y;
    this._health = 1; // Default health value
    this._strength = 1; // Default strength value
    this._name = "being"; // Default name
    this._sprite = "placeholder";
    
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
    Game.display.draw(this._x, this._y, this._char, this._color);
}

// Method to move a being and update map tracking
Being.prototype._moveTo = function(newX, newY) {
    // Remove from old position
    if (Game.isPassableTile(this._x, this._y)) {
        Game.currentLevel.map[this._x][this._y].being = null;
    }
    
    // Clear old position on display - redraw terrain and any items
    var oldTile = Game.currentLevel.map[this._x][this._y];
    Game.display.draw(this._x, this._y, oldTile.terrain);
    
    // If there's an item on the old position, redraw it
    if (oldTile.item) {
        oldTile.item._draw();
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
    
    this._health -= damage;
    
    if (this._health <= 0) {
        this.die();
        return true; // Return true if the being died
    }
    
    return false; // Return false if the being is still alive
}

// Add die method to base Being class
Being.prototype.die = function() {
    // Remove from map tracking
    var tile = Game.currentLevel.map[this._x][this._y];
    if (tile) {
        tile.being = null;
    }
    
    // Clear the being from the map display - redraw terrain and any items
    Game.display.draw(this._x, this._y, tile.terrain);
    
    // If there's an item on this position, redraw it
    if (tile && tile.item) {
        tile.item._draw();
    }
    
    // Remove from scheduler
    Game.engine._scheduler.remove(this);
    
    // Generic death logic - remove from enemies array (Player will override this)
    var index = Game.enemies.indexOf(this);
    if (index !== -1) Game.enemies.splice(index, 1);
}

// Visual flash effect for a being
Being.prototype._flash = function(color) {
    var flashColor = color || "red"; // Default to red if no color is provided
    var self = this; // Store 'this' for use in the timeout

    // Defer the initial flash draw to the next event loop tick.
    // This prevents the main game loop's draw call from overwriting it instantly.
    setTimeout(function() {
        Game.display.draw(self._x, self._y, self._char, self._color, flashColor);
    }, 0);

    // After a short delay, redraw just this tile to remove the flash
    setTimeout(function() {
        Game._drawTile(self._x, self._y);
    }, 100);
} 