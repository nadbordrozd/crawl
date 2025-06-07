// Base Item class
var Item = function(x, y) {
    this._x = x;
    this._y = y;
    this._name = "item";
    this._char = "?";
    this._color = "white";
    
    // Add this item to the map
    var key = this._x + "," + this._y;
    if (Game.map[key]) {
        Game.map[key].item = this;
    }
}

Item.prototype.getX = function() { return this._x; }
Item.prototype.getY = function() { return this._y; }
Item.prototype.getName = function() { return this._name; }
Item.prototype.getChar = function() { return this._char; }
Item.prototype.getColor = function() { return this._color; }

Item.prototype._draw = function() {
    Game.display.draw(this._x, this._y, this._char, this._color);
}

// Base pickup method - should be overridden by subclasses
Item.prototype.pickup = function(player) {
    // Show generic message
    Game.message("You picked up a " + this._name + "!");
    
    // Remove from map
    this._removeFromMap();
}

// Helper method to remove item from map and redraw tile
Item.prototype._removeFromMap = function() {
    var key = this._x + "," + this._y;
    if (Game.map[key]) {
        Game.map[key].item = null;
    }
    
    // Redraw the tile to remove the item visual
    Game.display.draw(this._x, this._y, Game.map[key].terrain);
    
    // Add any beings back on top if they exist
    if (Game.map[key].being) {
        Game.map[key].being._draw();
    }
}

// HealthPotion class - inherits from Item
var HealthPotion = function(x, y) {
    Item.call(this, x, y);
    this._name = "health potion";
    this._char = "♥"; // Red heart symbol
    this._color = "red";
}
HealthPotion.prototype = Object.create(Item.prototype);
HealthPotion.prototype.constructor = HealthPotion;

// Override pickup method for health potion
HealthPotion.prototype.pickup = function(player) {
    // Heal the player
    player._health += 1;
    
    // Show enhanced message with current health
    Game.message("You drink a healing potion! Health restored: " + player._health + " ♥");
    
    // Remove from map
    this._removeFromMap();
}

// GoldKey class - inherits from Item
var GoldKey = function(x, y) {
    Item.call(this, x, y);
    this._name = "gold key";
    this._char = "🗝️"; // Old timey key emoji
    this._color = "gold";
}
GoldKey.prototype = Object.create(Item.prototype);
GoldKey.prototype.constructor = GoldKey;

// Override pickup method for gold key
GoldKey.prototype.pickup = function(player) {
    // Increment player's key counter
    player._keysCollected++;
    
    // Show message with current key count
    Game.message("You picked up a gold key! Keys collected: " + player._keysCollected + "/3");
    
    // Remove from map
    this._removeFromMap();
}

// Bomb class - inherits from Item
var Bomb = function(x, y) {
    Item.call(this, x, y);
    this._name = "bomb";
    this._char = "💣"; // Bomb emoji
    this._color = "red";
    this._blastRadius = 3; // Blast radius (3 = 7x7 square)
}
Bomb.prototype = Object.create(Item.prototype);
Bomb.prototype.constructor = Bomb;

// Override pickup method for bomb
Bomb.prototype.pickup = function(player) {
    // Explode! Deal damage to all enemies in blast area centered on player
    var playerX = player.getX();
    var playerY = player.getY();
    var enemiesHit = 0;
    var radius = this._blastRadius;
    var area = (radius * 2 + 1) + "x" + (radius * 2 + 1);
    
    // Iterate over all positions in blast area (radius tiles in each direction)
    for (var dx = -radius; dx <= radius; dx++) {
        for (var dy = -radius; dy <= radius; dy++) {
            var checkX = playerX + dx;
            var checkY = playerY + dy;
            
            // Check if this position has an enemy
            var enemy = Game.getBeingAt(checkX, checkY);
            
            // If there's an enemy (and it's not the player), damage it
            if (enemy && enemy !== player) {
                var killed = enemy.takeDamage(1);
                enemiesHit++;
                
                if (killed) {
                    Game.message("The explosion killed the " + enemy.getName() + "!");
                }
            }
        }
    }
    
    // Show explosion message
    if (enemiesHit > 0) {
        Game.message("BOOM! The bomb exploded in a " + area + " area and hit " + enemiesHit + " enemies!");
    } else {
        Game.message("BOOM! The bomb exploded in a " + area + " area but hit no enemies.");
    }
    
    // Remove from map
    this._removeFromMap();
}

// Exit class - inherits from Item
var Exit = function(x, y) {
    Item.call(this, x, y);
    this._name = "exit";
    this._char = "🔒"; // Locked padlock symbol
    this._color = "yellow";
}
Exit.prototype = Object.create(Item.prototype);
Exit.prototype.constructor = Exit;

// Override pickup method for exit - this is actually an interaction, not a pickup
Exit.prototype.pickup = function(player) {
    if (player.getKeysCollected() >= 3) {
        Game.nextLevel();
    } else {
        Game.message("You need to collect all 3 keys to unlock the exit!");
    }
    
    // Important: Do NOT remove the exit from the map!
    // The exit should remain on the map for future attempts
} 