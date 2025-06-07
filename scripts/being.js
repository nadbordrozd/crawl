// Base Being class
var Being = function(x, y) {
    this._x = x;
    this._y = y;
    this._health = 1; // Default health value
    this._strength = 1; // Default strength value
    this._name = "being"; // Default name
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
    // Clear the being from the map display
    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y].terrain);
    
    // Remove from scheduler
    Game.engine._scheduler.remove(this);
    
    // Generic death logic - remove from enemies array (Player will override this)
    var index = Game.enemies.indexOf(this);
    if (index !== -1) Game.enemies.splice(index, 1);
} 