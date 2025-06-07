// Base Being class
var Being = function(x, y) {
    this._x = x;
    this._y = y;
    this._health = 1; // Default health value
    this._strength = 1; // Default strength value
    this._name = "being"; // Default name
    
    // Add this being to the map
    var key = this._x + "," + this._y;
    if (Game.map[key]) {
        Game.map[key].being = this;
    }
}

Being.prototype.getSpeed = function() { return 100; }
Being.prototype.getX = function() { return this._x; }
Being.prototype.getY = function() { return this._y; }
Being.prototype.getHealth = function() { return this._health; }
Being.prototype.getStrength = function() { return this._strength; }
Being.prototype.getName = function() { return this._name; }
Being.prototype._draw = function() {
    Game.display.draw(this._x, this._y, this._char, this._color);
}

// Method to move a being and update map tracking
Being.prototype._moveTo = function(newX, newY) {
    // Remove from old position
    var oldKey = this._x + "," + this._y;
    if (Game.map[oldKey]) {
        Game.map[oldKey].being = null;
    }
    
    // Clear old position on display - redraw terrain and any items
    Game.display.draw(this._x, this._y, Game.map[oldKey].terrain);
    
    // If there's an item on the old position, redraw it
    if (Game.map[oldKey] && Game.map[oldKey].item) {
        Game.map[oldKey].item._draw();
    }
    
    // Update position
    this._x = newX;
    this._y = newY;
    
    // Add to new position
    var newKey = this._x + "," + this._y;
    if (Game.map[newKey]) {
        Game.map[newKey].being = this;
    }
    
    // Draw at new position
    this._draw();
}

// Set the position of a being directly (used for level transitions)
Being.prototype.setPosition = function(x, y) {
    var newKey = x + "," + y;
    
    // Update coordinates
    this._x = x;
    this._y = y;
    
    // Update the being's position on the map
    Game.map[newKey].being = this;
    
    // Redraw the being at its new location
    this._draw();
}

// Add takeDamage method to Being prototype
Being.prototype.takeDamage = function(amount) {
    this._health -= amount;
    // If health drops to 0 or below, the being dies
    if (this._health <= 0) {
        this.die();
        return true; // Return true if the being died
    }
    
    return false; // Return false if the being is still alive
}

// Add die method to base Being class
Being.prototype.die = function() {
    // Remove from map tracking
    var key = this._x + "," + this._y;
    if (Game.map[key]) {
        Game.map[key].being = null;
    }
    
    // Clear the being from the map display - redraw terrain and any items
    Game.display.draw(this._x, this._y, Game.map[key].terrain);
    
    // If there's an item on this position, redraw it
    if (Game.map[key] && Game.map[key].item) {
        Game.map[key].item._draw();
    }
    
    // Remove from scheduler
    Game.engine._scheduler.remove(this);
    
    // Generic death logic - remove from enemies array (Player will override this)
    var index = Game.enemies.indexOf(this);
    if (index !== -1) Game.enemies.splice(index, 1);
} 