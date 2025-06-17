// Base Item class
var Item = function(x, y, char, name, color, sprite) {
    this._x = x;
    this._y = y;
    this._name = name || "item";
    this._char = char || "?";
    this._color = color || "white";
    this._sprite = sprite || "placeholder";
    
    // Add this item to the map only if coordinates are valid
    if (x !== undefined && y !== undefined && Game.isPassableTile(x, y)) {
        Game.currentLevel.map[x][y].item = this;
    }
}

Item.prototype.getX = function() { return this._x; }
Item.prototype.getY = function() { return this._y; }
Item.prototype.getName = function() { return this._name; }
Item.prototype.getChar = function() { return this._char; }
Item.prototype.getColor = function() { return this._color; }

Item.prototype._draw = function() {
    // Drawing is now handled by GameV2, so this method is no longer needed
}

// Base pickup method - should be overridden by subclasses
Item.prototype.pickup = function(player) {
    // Show generic message
    Game.message("You picked up a " + this._name + "!");
    
    // Remove from map
    this._removeFromMap();
}

// Helper method to remove item from map
Item.prototype._removeFromMap = function() {
    var tile = Game.currentLevel.map[this._x][this._y];
    if (tile) {
        tile.item = null;
    }
    
    // The main game loop will handle redrawing, so we don't need any drawing calls here.
}

// HealthPotion class - inherits from Item
var HealthPotion = function(x, y) {
    Item.call(this, x, y, "♥", "health potion", "red", "health_potion");
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
    Item.call(this, x, y, "🗝️", "gold key", "gold", "key");
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
    Item.call(this, x, y, "💣", "bomb", "red", "bomb");
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
    var explosionTiles = []; // Track tiles that will have explosion effects
    
    // Iterate over all positions in blast area (radius tiles in each direction)
    for (var dx = -radius; dx <= radius; dx++) {
        for (var dy = -radius; dy <= radius; dy++) {
            var checkX = playerX + dx;
            var checkY = playerY + dy;
            
            // Check if this position is valid and within map bounds
            if (checkX >= 0 && checkX < Game.currentLevel.MAP_WIDTH && 
                checkY >= 0 && checkY < Game.currentLevel.MAP_HEIGHT) {
                
                // Add explosion effect to this tile
                var tile = Game.currentLevel.map[checkX][checkY];
                if (tile) {
                    tile._isExploding = true;
                    explosionTiles.push({x: checkX, y: checkY});
                }
                
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
    }
    
    // Show explosion message
    if (enemiesHit > 0) {
        Game.message("BOOM! The bomb exploded in a " + area + " area and hit " + enemiesHit + " enemies!");
    } else {
        Game.message("BOOM! The bomb exploded in a " + area + " area but hit no enemies.");
    }
    
    // Remove from map
    this._removeFromMap();
    
    // Redraw immediately to show explosion effects
    Game._drawAll();
    
    // Queue animation to clear explosion effects after a delay
    Game.queueAnimation(function() {
        // Clear explosion effects from all affected tiles
        for (var i = 0; i < explosionTiles.length; i++) {
            var tileCoords = explosionTiles[i];
            var tile = Game.currentLevel.map[tileCoords.x][tileCoords.y];
            if (tile) {
                tile._isExploding = false;
            }
        }
    }, 400); // Show explosion for 400ms
}

// Exit class - inherits from Item
var Exit = function(x, y) {
    Item.call(this, x, y, "🔒", "exit", "yellow", "gate");
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

// StoneSkinPotion item: grants temporary invulnerability
var StoneSkinPotion = function(x, y) {
    Item.call(this, x, y, "🛡️", "StoneSkin Potion", "cyan", "shield");
};
StoneSkinPotion.prototype = Object.create(Item.prototype);
StoneSkinPotion.prototype.constructor = StoneSkinPotion;

StoneSkinPotion.prototype.pickup = function(player) {
    // Remove the item from the map
    this._removeFromMap();
    
    // Apply the invulnerability effect
    player.applyStoneSkin();
    Game.message("You drink the potion and your skin turns to stone!");
};

// SpeedPotion item: grants temporary speed boost
var SpeedPotion = function(x, y) {
    Item.call(this, x, y, "»", "Speed Potion", "lightgreen", 'speed_potion');
};
SpeedPotion.prototype = Object.create(Item.prototype);
SpeedPotion.prototype.constructor = SpeedPotion;

SpeedPotion.prototype.pickup = function(player) {
    // Remove the item from the map
    this._removeFromMap();
    
    // Apply the speed boost effect
    player.applySpeedBoost();
    Game.message("You feel yourself moving faster!");
};

// GoldCoin item: collectible currency
var GoldCoin = function(x, y) {
    Item.call(this, x, y, "✪", "gold coin", "gold", "coin");
};
GoldCoin.prototype = Object.create(Item.prototype);
GoldCoin.prototype.constructor = GoldCoin;

GoldCoin.prototype.pickup = function(player) {
    // Remove the item from the map
    this._removeFromMap();
    
    // Increment player's coin counter
    player._coinsCollected++;
    
    Game.message("You collected a gold coin! Gold: " + player._coinsCollected);
    Game._drawStats(); // Update status bar
}; 