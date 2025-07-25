// Base Item class
var Item = function(x, y, char, name, color, sprite) {
    this._x = x;
    this._y = y;
    this._name = name || "item";
    this._char = char || "?";
    this._color = color || "white";
    this._sprite = sprite || "placeholder";
    this.pickupable = true; // All items are pickupable by default
    
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

// Base pickup method - now adds to inventory
Item.prototype.pickup = function(player) {
    if (!this.pickupable) {
        // Handle non-pickupable items (like exit)
        this.interact(player);
        return;
    }
    
    // Try to add to inventory
    if (player.addToInventory(this)) {
        Game.message("You picked up a " + this._name + "!");
        // Remove from map only if successfully added to inventory
        this._removeFromMap();
    } else {
        Game.message("Your inventory is full! You cannot pick up the " + this._name + ".");
        // Item stays on the map since it wasn't picked up
    }
}

// Base use method - should be overridden by subclasses
Item.prototype.use = function(player) {
    Game.message("You use the " + this._name + ".");
}

// Base interact method for non-pickupable items
Item.prototype.interact = function(player) {
    Game.message("You interact with the " + this._name + ".");
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

// Override use method for health potion
HealthPotion.prototype.use = function(player) {
    if (player._health < player._maxHealth) {
        // Restore health to maximum
        player._health = player._maxHealth;
        
        // Show enhanced message with current health
        Game.message("You drink a healing potion! Health fully restored: " + player._health + "/" + player._maxHealth + " ♥");
    } else {
        Game.message("You're already at full health! You save the potion for later.");
        // Return the item to inventory since it wasn't used
        player.addToInventory(this);
    }
}

// GoldKey class - inherits from Item
var GoldKey = function(x, y) {
    Item.call(this, x, y, "🗝️", "gold key", "gold", "key");
    this.pickupable = false; // Keys are used immediately, not stored
}
GoldKey.prototype = Object.create(Item.prototype);
GoldKey.prototype.constructor = GoldKey;

// Override interact method for gold key
GoldKey.prototype.interact = function(player) {
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

// Override use method for bomb
Bomb.prototype.use = function(player) {
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
                    var killed = enemy.takeDamage(3);
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
    this.pickupable = false; // Exit is not pickupable
}
Exit.prototype = Object.create(Item.prototype);
Exit.prototype.constructor = Exit;

// Override interact method for exit
Exit.prototype.interact = function(player) {
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

StoneSkinPotion.prototype.use = function(player) {
    // Apply the invulnerability effect
    player.applyStoneSkin();
};

// SpeedPotion item: grants temporary speed boost
var SpeedPotion = function(x, y) {
    Item.call(this, x, y, "»", "Speed Potion", "lightgreen", 'speed_potion');
};
SpeedPotion.prototype = Object.create(Item.prototype);
SpeedPotion.prototype.constructor = SpeedPotion;

SpeedPotion.prototype.use = function(player) {
    // Apply the speed boost effect
    player.applySpeedBoost();
};

// GoldCoin item: collectible currency
var GoldCoin = function(x, y) {
    Item.call(this, x, y, "✪", "gold coin", "gold", "coin");
    this.pickupable = false; // Coins are collected immediately, not stored
};
GoldCoin.prototype = Object.create(Item.prototype);
GoldCoin.prototype.constructor = GoldCoin;

GoldCoin.prototype.interact = function(player) {
    // Increment player's coin counter
    player._coinsCollected++;
    
    Game.message("You collected a gold coin! Gold: " + player._coinsCollected);
    Game._drawStats(); // Update status bar
    
    // Remove from map
    this._removeFromMap();
};

// Drumstick item: restores 1 health
var Drumstick = function(x, y) {
    Item.call(this, x, y, "🍗", "drumstick", "brown", "drumstick");
};
Drumstick.prototype = Object.create(Item.prototype);
Drumstick.prototype.constructor = Drumstick;

Drumstick.prototype.use = function(player) {
    // Restore 1 health, but don't exceed max health
    if (player._health < player._maxHealth) {
        player._health += 1;
        Game.message("You eat the drumstick! Health restored: " + player._health + "/" + player._maxHealth);
    } else {
        Game.message("You're already at full health! You save the drumstick for later.");
        // Return the item to inventory since it wasn't used
        player.addToInventory(this);
    }
};

// Heart item: permanently increases max health by 1
var Heart = function(x, y) {
    Item.call(this, x, y, "♥", "heart", "red", "heart");
    this.pickupable = false; // Hearts are used immediately, not stored
};
Heart.prototype = Object.create(Item.prototype);
Heart.prototype.constructor = Heart;

Heart.prototype.interact = function(player) {
    // Increase max health permanently
    player._maxHealth += 1;
    player._health += 1; // Also restore 1 current health
    
    Game.message("You found a heart! Maximum health increased to " + player._maxHealth + "!");
    
    // Remove from map
    this._removeFromMap();
};

// SummoningRing item: summons a friendly Unicorn
var SummoningRing = function(x, y) {
    Item.call(this, x, y, "○", "Summoning Ring", "silver", "ring_2");
};
SummoningRing.prototype = Object.create(Item.prototype);
SummoningRing.prototype.constructor = SummoningRing;

SummoningRing.prototype.use = function(player) {
    // Find the nearest unoccupied, passable tile to the player
    var playerX = player.getX();
    var playerY = player.getY();
    var summonLocation = this._findNearestFreeTile(playerX, playerY);
    
    if (summonLocation) {
        // Create a new Unicorn at the found location
        var unicorn = new Unicorn(summonLocation.x, summonLocation.y);
        
        // Add the unicorn to the game's enemies array (even though it's friendly)
        Game.enemies.push(unicorn);
        
        // Add the unicorn to the scheduler so it can take turns
        Game.engine._scheduler.add(unicorn, true);
        
        Game.message("The ring glows and summons a majestic unicorn to aid you!");
        Game._drawAll(); // Update the display to show the new unicorn
    } else {
        Game.message("The ring flickers but fails to summon - no clear space nearby!");
        // Return the item to inventory since it wasn't used
        player.addToInventory(this);
    }
};

// Find the nearest free (unoccupied, passable) tile to the given position
SummoningRing.prototype._findNearestFreeTile = function(centerX, centerY) {
    // Search in expanding rings around the center position
    for (var radius = 1; radius <= 10; radius++) {
        // Check all tiles at this radius using a square pattern
        for (var dx = -radius; dx <= radius; dx++) {
            for (var dy = -radius; dy <= radius; dy++) {
                // Only check tiles that are exactly at this radius (on the border)
                if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                    var checkX = centerX + dx;
                    var checkY = centerY + dy;
                    
                    // Check if this position is valid, passable, and unoccupied
                    if (Game.isPassableTile(checkX, checkY)) {
                        var occupant = Game.getBeingAt(checkX, checkY);
                        if (!occupant) {
                            return {x: checkX, y: checkY};
                        }
                    }
                }
            }
        }
    }
    
    // No free tile found within reasonable distance
    return null;
};

// ScrollOfRevelation item: reveals the entire map when used
var ScrollOfRevelation = function(x, y) {
    Item.call(this, x, y, "📜", "Scroll of Revelation", "white", "scroll");
};
ScrollOfRevelation.prototype = Object.create(Item.prototype);
ScrollOfRevelation.prototype.constructor = ScrollOfRevelation;

ScrollOfRevelation.prototype.use = function(player) {
    // Mark only passable tiles on the current level as explored
    var tilesRevealed = 0;
    
    for (var x = 0; x < Game.currentLevel.MAP_WIDTH; x++) {
        for (var y = 0; y < Game.currentLevel.MAP_HEIGHT; y++) {
            var tile = Game.currentLevel.map[x][y];
            // Only reveal passable tiles that haven't been explored yet
            if (tile && tile.passable && !tile.explored) {
                tile.explored = true;
                tilesRevealed++;
            }
        }
    }
    
    // Show message and redraw the map to reveal the passable areas
    Game.message("The scroll glows with ancient magic! All accessible areas are revealed to you!");
    Game._drawAll(); // Redraw to show the newly revealed areas
    
    // Optional: Add a visual effect message about how much was revealed
    if (tilesRevealed > 0) {
        Game.message("You can now see " + tilesRevealed + " previously unexplored passable areas!");
    }
};

// Belt item: increases inventory size when picked up
var Belt = function(x, y) {
    Item.call(this, x, y, "🪢", "belt", "brown", "belt");
    this.pickupable = false; // Belts are used immediately when walked over, not stored
};
Belt.prototype = Object.create(Item.prototype);
Belt.prototype.constructor = Belt;

Belt.prototype.interact = function(player) {
    // Check if player already has maximum inventory slots
    if (player.INVENTORY_SIZE >= 9) {
        Game.message("You found a belt, but you already have maximum inventory capacity!");
        return; // Don't remove the belt from the map
    }
    
    // Increase inventory size by 1
    player.INVENTORY_SIZE++;
    
    // Expand the actual inventory array with a new null slot
    player._inventory.push(null);
    
    Game.message("You found a belt! Your inventory capacity increased to " + player.INVENTORY_SIZE + " slots!");
    Game._drawAll(); // Update the display to show the new inventory slot
    
    // Remove from map
    this._removeFromMap();
}; 