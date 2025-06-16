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
    zoomLevel: 1, // Change this value to zoom more or less
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
    
    init: function() {
        // Initialize Level 1
        this.currentLevel = new Level1();
        
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
        
        // Add stats display with CSS class FIRST (so it appears above)
        var statsContainer = this.statsDisplay.getContainer();
        statsContainer.className = "stats-display";
        statsContainer.style.order = "1";
        statsContainer.style.position = "relative";
        statsContainer.style.zIndex = "10";
        container.appendChild(statsContainer);
        
        // Initialize tile-based display
        this._initTileDisplay();
        
        // Add message display with CSS class LAST (so it appears below)
        var messageContainer = this.messageDisplay.getContainer();
        messageContainer.className = "message-display";
        messageContainer.style.order = "3";
        messageContainer.style.position = "relative";
        container.appendChild(messageContainer);
        
        // Ensure the container uses flexbox layout
        container.style.display = "flex";
        container.style.flexDirection = "column";
        
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

    _initTileDisplay: function() {
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

            // Add the new display to the main game container at the correct position
            var container = document.getElementById("game-container");
            var newContainer = this.display.getContainer();
            newContainer.className = "game-v2-display";
            newContainer.style.order = "2";
            newContainer.style.position = "relative";
            
            // Insert after stats display but before message display
            var messageDisplay = container.querySelector('.message-display');
            if (messageDisplay) {
                container.insertBefore(newContainer, messageDisplay);
            } else {
                container.appendChild(newContainer);
            }

            // Apply zoom via CSS transform
            newContainer.style.transform = "scale(" + this.zoomLevel + ")";
            newContainer.style.transformOrigin = "top left";

            // Draw the map
            this._drawMap();

        }.bind(this);
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
        this._drawStats();

        if(this.display){ this._drawMap(); }
    },

    _drawMap: function() {
        if (!this.player) { return; } // Don't draw if the player is dead
        
        // Compute FOV and update the cache
        this.currentLevel.visibleCells = {};
        this.fov.compute(this.player.getX(), this.player.getY(), this.FOV_RADIUS, function(x, y, r, visibility) {
            Game.currentLevel.visibleCells[x+","+y] = true;
            if (Game.currentLevel.map[x] && Game.currentLevel.map[x][y]) {
                Game.currentLevel.map[x][y].explored = true;
            }
        });

        // Draw the shield tile over the whole display
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
        var spritesToDraw = [];

        // Always start with the base terrain
        spritesToDraw.push(tile.terrain);

        if (tile.decoration) {
            spritesToDraw.push(tile.decoration);
        }

        if (isVisible) {
            // If visible, draw items and beings on top
            if (tile.item) {
                spritesToDraw.push(tile.item._sprite);
            }
            if (tile.being) {
                spritesToDraw.push(tile.being._sprite);
                if (tile.being._isAttacking) {
                    spritesToDraw.push('attack_effect');
                }
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
        
        // Clear the display to remove any visual artifacts from the previous level
        if (this.display) {
            this.display.clear();
        }
        
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
        if (this.display) {
            this.display.clear();
            var msg = "CONGRATULATIONS! You have won the game!";
            var x = Math.floor((this.currentLevel.MAP_WIDTH - msg.length) / 2);
            var y = Math.floor(this.currentLevel.MAP_HEIGHT / 2);
            // Note: this uses sprites, so we'll just show the message in the message display
        }
        this.message("CONGRATULATIONS! You have won the game!");
    },
    
    isPassableTile: function(x, y) {
        return this.currentLevel.isPassable(x, y);
    },
    
    // Helper function to get the being at a position
    getBeingAt: function(x, y) {
        return (this.isPassableTile(x, y)) ? this.currentLevel.map[x][y].being : null;
    }
};

Game.init();