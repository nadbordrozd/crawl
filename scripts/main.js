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
            return Game.isPassableTile(x, y);
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

        // --- NEW Music Controls ---
        var music = document.getElementById("game-music");
        var musicButton = document.getElementById("music-toggle-button");
        var musicPlaylist = ["music/tavern.mp3", "music/prism.mp3", "departures.mp3", "lifeline.mp3", "footprints.mp3", "sunken_days.mp3", "roadway.mp3"]; // Your playlist
        var currentTrackIndex = 0;
        
        music.volume = 0.3; // Set a reasonable volume

        musicButton.addEventListener("click", function() {
            if (music.paused) {
                music.play();
                musicButton.textContent = "Pause Music";
            } else {
                music.pause();
                musicButton.textContent = "Play Music";
            }
        });

        // Add event listener for when the current track ends
        music.addEventListener("ended", function() {
            // Move to the next track, or loop to the beginning
            currentTrackIndex = (currentTrackIndex + 1) % musicPlaylist.length;
            music.src = musicPlaylist[currentTrackIndex];
            music.play();
        });
        // --- END NEW ---
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
        var enemies = [new Assassin(), new Frog(), new Rat(), new CarnivorousPlant(), new MadFrog(), new Scorpion()];
        enemies.forEach(function(enemy) {
            d.drawText(1, y++, `%c{${enemy._color}}${enemy._char}%c{white} : ${enemy._name}`);
        });
    },
    
    _drawAll: function() {
        this._drawMapAndFov();
        this._drawStats();

        if(GameV2.currentLevel){GameV2._drawMap();}
    },

    _drawMapAndFov: function() {
        this.display.clear();
        var player = this.player;

        // Compute FOV and update the cache
        this.currentLevel.visibleCells = {};
        var self = this;
        this.fov.compute(player.getX(), player.getY(), this.FOV_RADIUS, function(x, y, r, visibility) {
            self.currentLevel.visibleCells[x+","+y] = true;
            if (self.currentLevel.map[x] && self.currentLevel.map[x][y]) {
                self.currentLevel.map[x][y].explored = true;
            }
        });

        // Draw the map by drawing each tile
        for (var x = 0; x < this.currentLevel.MAP_WIDTH; x++) {
            for (var y = 0; y < this.currentLevel.MAP_HEIGHT; y++) {
                this._drawTile(x, y);
            }
        }
    },
    
    _drawTile: function(x, y) {
        var tile = this.currentLevel.map[x][y];
        if (!tile.explored) { return; }

        var isVisible = this.currentLevel.visibleCells[x+","+y];

        // If it's a wall
        if (!tile.passable) {
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
                displayChar = '.';
                displayColor = "#ffffff"; // Bright color for visible terrain
            }
        } else {
            // Not visible, but explored: draw terrain and items in dim color
            var item = tile.item;
            if (item) {
                displayChar = item.getChar();
                displayColor = "#808080"; // Dim gray for memory
            } else {
                displayChar = '.';
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
    
    isValidTile: function(x, y) {
        return this.currentLevel.validTile(x, y);
    },
    
    // NEW: Helper function to check if a tile is passable by delegating to the current level
    isPassableTile: function(x, y) {
        return this.currentLevel.isPassable(x, y);
    },
    
    // Helper function to check if a position is occupied
    _isOccupied: function(x, y) {
        return this.isPassableTile(x, y) && this.currentLevel.map[x][y].being !== null;
    },
    
    // Helper function to get the being at a position
    getBeingAt: function(x, y) {
        return (this.isPassableTile(x, y)) ? this.currentLevel.map[x][y].being : null;
    },
    
    // Helper function to get the item at a position
    getItemAt: function(x, y) {
        return (this.isPassableTile) ? this.currentLevel.map[x][y].item : null;
    },
    
    // Add a method to Game to debug the current state
    _debugState: function() {
        console.log("Enemies in array:", this.enemies.length);
        console.log("Current scheduler:", this.engine._scheduler);
    }
};

var GameV2 = {
    display: null,
    zoomLevel: 1, // Change this value to zoom more or less
    map: {},
    engine: null,
    player: null,
    enemies: [],
    levelNumber: 1,
    currentLevel: null,
    statsDisplay: null,
    messageDisplay: null,
    instructionsDisplay: null,
    messageHistory: [],
    fov: null,
    FOV_RADIUS: 7,
    visibleCells: {},

    init: function() {
        // Copy properties from the initialized Game object
        this.engine = Game.engine;
        this.player = Game.player;
        this.enemies = Game.enemies;
        this.levelNumber = Game.levelNumber;
        this.currentLevel = Game.currentLevel;
        this.statsDisplay = Game.statsDisplay;
        this.messageDisplay = Game.messageDisplay;
        this.instructionsDisplay = Game.instructionsDisplay;
        this.messageHistory = Game.messageHistory;
        this.fov = Game.fov;
        this.FOV_RADIUS = Game.FOV_RADIUS;
        this.visibleCells = Game.visibleCells;

        // Since sprites.js is not provided, we assume it defines a global 'tileMap' variable.
        // You must create sprites.js and ensure it's loaded before this script in your HTML.
        // Example tileMap in sprites.js:
        // var tileMap = { ".": [0,0], "#": [16,0], "@": [32,0] };

        var tileSet = document.createElement("img");
        tileSet.src = "assets/tileset.png"; // Assumes tileset is in an 'assets' directory

        tileSet.onload = function() {
            this.display = new ROT.Display({
                width: this.currentLevel.MAP_WIDTH,
                height: this.currentLevel.MAP_HEIGHT,
                layout: "tile",
                tileWidth: 16,
                tileHeight: 16,
                tileSet: tileSet,
                tileMap: SPRITES // This variable must be defined in sprites.js
            });

            // Add the new display to the main game container
            var container = document.getElementById("game-container");
            var newContainer = this.display.getContainer();
            newContainer.className = "game-v2-display";
            container.appendChild(newContainer);

            // Apply zoom via CSS transform
            newContainer.style.transform = "scale(" + this.zoomLevel + ")";
            newContainer.style.transformOrigin = "top left";

            // Draw the map
            this._drawMap();

        }.bind(this);
    },

    _drawMap: function() {
        // Draw the shield tile over the whole display
        for (var x = 0; x < this.currentLevel.MAP_WIDTH; x++) {
            for (var y = 0; y < this.currentLevel.MAP_HEIGHT; y++) {
                this._drawTile(x, y);
            }
        }
    },

    _drawTile: function(x, y) {
        var tile = Game.currentLevel.map[x][y];
        if (!tile.explored) { return; }

        var isVisible = Game.currentLevel.visibleCells[x+","+y];
        var spritesToDraw = [];

        // Always start with the base terrain
        spritesToDraw.push(tile.terrain);

        if (isVisible) {
            // If visible, draw items and beings on top
            if (tile.item) {
                spritesToDraw.push(tile.item._sprite);
            }
            if (tile.being) {
                spritesToDraw.push(tile.being._sprite);
            }
        } else {
            // If not visible but explored, only draw items...
            if (tile.item) {
                spritesToDraw.push(tile.item._sprite);
            }
            // ...and then the fog of war sprite over everything.
            spritesToDraw.push('black_background');
        }
        
        // Draw all collected sprites for this tile at once
        this.display.draw(x, y, spritesToDraw);
    }
};

Game.init();
GameV2.init();