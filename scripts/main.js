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
    zoomLevel: 1.6, // Change this value to zoom more or less
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
    MESSAGE_LINES: 5, // Configurable number of message lines
    
    // Global animation system
    animationTimeout: null,
    animationDelay: 200,
    animationCallbacks: [],
    
    init: function() {
        // Initialize ImpLevel as first level
        // this.currentLevel = this.levelSequence[this.levelNumber];
        this.currentLevel = new Level1()
        
        // Create HTML-based stats display instead of canvas
        this._createHtmlStatsDisplay();
        
        // Create HTML-based message display instead of canvas
        this._createHtmlMessageDisplay();
        
        // Add all displays to the existing container with proper CSS classes
        var container = document.getElementById("game-container");
        
        // Add HTML stats display with CSS class FIRST (so it appears above)
        this.statsDisplayHtml.style.order = "1";
        container.appendChild(this.statsDisplayHtml);
        
        // Initialize tile-based display
        this._initTileDisplay();
        
        // Add HTML message display with CSS class LAST (so it appears below)
        this.messageDisplayHtml.style.order = "3";
        container.appendChild(this.messageDisplayHtml);
        
        // Ensure the container uses flexbox layout
        container.style.display = "flex";
        container.style.flexDirection = "column";
        
        // Create instructions display as HTML div
        this._createInstructionsDisplay();
        
        // Create about display as HTML div
        this._createAboutDisplay();

        // Generate the level (map + enemies + items)
        this.currentLevel.generate();
        
        // --- NEW FOV Initialization ---
        var fovPassableCallback = function(x, y) {
            return Game.isPassableTile(x, y);
        }
        this.fov = new ROT.FOV.PreciseShadowcasting(fovPassableCallback);
        // --- END NEW ---

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
        
        // Initial welcome messages with controls and objective
        this.message("Welcome to the dungeon! Survive and explore!");
        this.message("CONTROLS: Arrow Keys = Move/Attack, Spacebar = Wait, 1-6 = Use inventory items");
        this.message("OBJECTIVE: Collect 3 gold keys and reach the exit to advance to the next level");
        this.message("INVENTORY: Walk over items to pick up, keys and coins are used instantly");
        this.message("TIP: Press the Instructions button above for detailed help!");

        // --- NEW Music Controls ---
        var music = document.getElementById("game-music");
        var musicButton = document.getElementById("music-toggle-button");
        var musicPlaylist = ["music/tavern.mp3", "music/prism.mp3", "departures.mp3", "lifeline.mp3", "footprints.mp3", "sunken_days.mp3", "roadway.mp3"]; // Your playlist
        var currentTrackIndex = 0;
        
        music.volume = 0.3; // Set a reasonable volume

        // Set initial button text
        musicButton.innerHTML = "Music ON/<b><u>OFF</u></b>";

        musicButton.addEventListener("click", function() {
            if (music.paused) {
                music.play();
                musicButton.innerHTML = "Music <b><u>ON</u></b>/OFF";
            } else {
                music.pause();
                musicButton.innerHTML = "Music ON/<b><u>OFF</u></b>";
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
                tileWidth: 16, // Keep original tile size for sprite mapping
                tileHeight: 16, // Keep original tile size for sprite mapping
                tileSet: tileSet,
                tileMap: SPRITES // This variable must be defined in sprites.js
            });

            // Add the new display to the main game container at the correct position
            var container = document.getElementById("game-container");
            
            // Create a wrapper div to handle the scaling layout properly
            var wrapperDiv = document.createElement('div');
            wrapperDiv.className = "game-v2-wrapper";
            wrapperDiv.style.order = "2";
            wrapperDiv.style.position = "relative";
            
            var newContainer = this.display.getContainer();
            newContainer.className = "game-v2-display";
            
            // Calculate dimensions
            var originalWidth = this.currentLevel.MAP_WIDTH * 16;
            var originalHeight = this.currentLevel.MAP_HEIGHT * 16;
            var scaledWidth = originalWidth * this.zoomLevel;
            var scaledHeight = originalHeight * this.zoomLevel;
            
            // Set wrapper size to the scaled dimensions (reserves layout space)
            wrapperDiv.style.width = scaledWidth + "px";
            wrapperDiv.style.height = scaledHeight + "px";
            
            // Apply transform to the canvas container
            newContainer.style.transform = "scale(" + this.zoomLevel + ")";
            newContainer.style.transformOrigin = "top left";
            newContainer.style.position = "absolute";
            newContainer.style.top = "0";
            newContainer.style.left = "0";
            
            // Add canvas to wrapper, then wrapper to main container
            wrapperDiv.appendChild(newContainer);
            
            // Set the HTML stats and message display widths to match the game display
            if (this.statsDisplayHtml) {
                this.statsDisplayHtml.style.width = scaledWidth + "px";
            }
            if (this.messageDisplayHtml) {
                this.messageDisplayHtml.style.width = scaledWidth + "px";
            }
            
            // Insert game display after stats display but before message display
            var messageDisplay = container.querySelector('.html-message-display');
            if (messageDisplay) {
                container.insertBefore(wrapperDiv, messageDisplay);
            } else {
                container.appendChild(wrapperDiv);
            }
            
            // Draw the map
            this._drawMap();

        }.bind(this);
    },
    
    _createInstructionsDisplay: function() {
        var instructionsContainer = document.getElementById("instructions-overlay");
        
        // Create the main instructions div
        var instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'instructions-display';
        instructionsDiv.style.fontFamily = 'monospace';
        instructionsDiv.style.fontSize = '14px';
        instructionsDiv.style.color = '#ffffff';
        instructionsDiv.style.backgroundColor = '#000000';
        instructionsDiv.style.padding = '20px';
        instructionsDiv.style.border = '2px solid #333';
        instructionsDiv.style.borderRadius = '8px';
        instructionsDiv.style.maxWidth = '400px';
        instructionsDiv.style.maxHeight = '80vh';
        instructionsDiv.style.overflowY = 'auto';
        instructionsDiv.style.textAlign = 'left';
        instructionsDiv.style.position = 'absolute';
        instructionsDiv.style.top = '20px';
        instructionsDiv.style.left = '20px';
        instructionsDiv.style.zIndex = '1000';
        instructionsDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.7)';
        
        // Build the instructions HTML
        var html = '<div style="color: #ffffff; font-weight: bold; margin-bottom: 10px;">--- Controls ---</div>';
        html += '<div style="color: #ffff00; margin: 5px 0;">Arrow Keys:</div>';
        html += '<div style="margin-left: 20px; margin-bottom: 5px;">Move / Attack</div>';
        html += '<div style="color: #ffff00; margin: 5px 0;">Spacebar:</div>';
        html += '<div style="margin-left: 20px; margin-bottom: 10px;">Wait a turn</div>';
        
        html += '<div style="color: #ffffff; font-weight: bold; margin: 15px 0 10px 0;">--- Using Items ---</div>';
        html += '<div style="color: #ffff00; margin: 5px 0;">Walking over items:</div>';
        html += '<div style="margin-left: 20px; margin-bottom: 5px;">Automatically picks up to inventory</div>';
        html += '<div style="color: #ffff00; margin: 5px 0;">Number Keys 1-6:</div>';
        html += '<div style="margin-left: 20px; margin-bottom: 5px;">Use items from inventory slots</div>';
        html += '<div style="color: #ffff00; margin: 5px 0;">Inventory Full:</div>';
        html += '<div style="margin-left: 20px; margin-bottom: 10px;">Items stay on ground until space available</div>';
        
        html += '<div style="color: #ffffff; font-weight: bold; margin: 15px 0 10px 0;">--- Player ---</div>';
        html += '<div style="margin: 5px 0;"><img src="assets/tileset.png" style="width: 16px; height: 16px; object-fit: none; object-position: -' + SPRITES['player'][0] + 'px -' + SPRITES['player'][1] + 'px; vertical-align: middle;"> : this is you</div>';
        
        html += '<div style="color: #ffffff; font-weight: bold; margin: 15px 0 10px 0;">--- Goal ---</div>';
        html += '<div style="margin: 5px 0;"><img src="assets/tileset.png" style="width: 16px; height: 16px; object-fit: none; object-position: -' + SPRITES['gate'][0] + 'px -' + SPRITES['gate'][1] + 'px; vertical-align: middle;"> : Reach the exit</div>';
        html += '<div style="margin-left: 20px;">with 3 <img src="assets/tileset.png" style="width: 16px; height: 16px; object-fit: none; object-position: -' + SPRITES['key'][0] + 'px -' + SPRITES['key'][1] + 'px; vertical-align: middle;"></div>';
        
        html += '<div style="color: #ffffff; font-weight: bold; margin: 15px 0 10px 0;">--- Items (Good!) ---</div>';
        var itemSprites = ['health_potion', 'key', 'bomb', 'gate', 'shield', 'speed_potion', 'coin', 'drumstick', 'heart', 'ring_2', 'scroll', 'belt'];
        
        html += '<div style="margin: 5px 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">';
        itemSprites.forEach(function(sprite) {
            html += '<img src="assets/tileset.png" style="width: 16px; height: 16px; object-fit: none; object-position: -' + SPRITES[sprite][0] + 'px -' + SPRITES[sprite][1] + 'px;">';
        });
        html += '</div>';
        
        html += '<div style="color: #ffffff; font-weight: bold; margin: 15px 0 10px 0;">--- Enemies (Bad!) ---</div>';
        var enemySprites = ['assassin', 'frog', 'rat', 'audrey_2', 'mad_frog', 'scorpion', 'ghost', 'cobra', 'zombie', 'imp', 'reaper', 'skeleton', 'orc', 'troll', 'flaming_horse', 'ninja'];
        
        html += '<div style="margin: 5px 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">';
        enemySprites.forEach(function(sprite) {
            html += '<img src="assets/tileset.png" style="width: 16px; height: 16px; object-fit: none; object-position: -' + SPRITES[sprite][0] + 'px -' + SPRITES[sprite][1] + 'px;">';
        });
        html += '</div>';
        
        html += '<div style="color: #ffffff; font-weight: bold; margin: 15px 0 10px 0;">--- Allies (Good!) ---</div>';
        var allySprites = ['unicorn'];
        
        html += '<div style="margin: 5px 0; display: flex; align-items: center; gap: 4px;">';
        allySprites.forEach(function(sprite) {
            html += '<img src="assets/tileset.png" style="width: 16px; height: 16px; object-fit: none; object-position: -' + SPRITES[sprite][0] + 'px -' + SPRITES[sprite][1] + 'px;">';
        });
        html += '</div>';
        
        // Add a close button
        html += '<div style="margin-top: 20px; text-align: center;"><button onclick="Game.toggleInstructions()" style="padding: 8px 16px; background: #333; color: #fff; border: 1px solid #666; border-radius: 4px; cursor: pointer;">Close</button></div>';
        
        instructionsDiv.innerHTML = html;
        instructionsContainer.appendChild(instructionsDiv);
        
        // Add instructions toggle functionality
        var instructionsButton = document.getElementById("instructions-toggle-button");
        instructionsButton.addEventListener("click", function() {
            Game.toggleInstructions();
        });
    },
    
    toggleInstructions: function() {
        var overlay = document.getElementById("instructions-overlay");
        if (overlay.style.display === "none") {
            overlay.style.display = "block";
        } else {
            overlay.style.display = "none";
        }
    },
    
    _createAboutDisplay: function() {
        var aboutContainer = document.getElementById("about-overlay");
        
        // Create the main about div
        var aboutDiv = document.createElement('div');
        aboutDiv.className = 'about-display';
        aboutDiv.style.fontFamily = 'monospace';
        aboutDiv.style.fontSize = '14px';
        aboutDiv.style.color = '#ffffff';
        aboutDiv.style.backgroundColor = '#000000';
        aboutDiv.style.padding = '20px';
        aboutDiv.style.border = '2px solid #333';
        aboutDiv.style.borderRadius = '8px';
        aboutDiv.style.maxWidth = '400px';
        aboutDiv.style.maxHeight = '80vh';
        aboutDiv.style.overflowY = 'auto';
        aboutDiv.style.textAlign = 'left';
        aboutDiv.style.position = 'absolute';
        aboutDiv.style.top = '20px';
        aboutDiv.style.left = '20px';
        aboutDiv.style.zIndex = '1000';
        aboutDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.7)';
        
        // Build the about HTML
        var html = '<div style="text-align: center; margin-bottom: 20px; color: #ffaa00; font-size: 18px; font-weight: bold;">About Vibe Crawler</div>';
        
        html += '<div style="line-height: 1.6; margin-bottom: 20px;">';
        html += 'I vibe coded this game in June 2025 using Cursor with Claude 4 Sonnet - just to see if I can.';
        html += '</div>';
        
        html += '<div style="line-height: 1.6; margin-bottom: 20px;">';
        html += 'If you have any comments or requests regarding the game you can email me at ';
        html += '<span style="color: #44ff44;">nadbordrozd@gmail.com</span>';
        html += '</div>';
        
        html += '<div style="line-height: 1.6; margin-bottom: 20px;">';
        html += 'The music in the game is by Ardie Son, licensed at artist.io. The spritesheet is by backterria licensed at itch.io.';
        html += '</div>';
        
        html += '<div style="margin-top: 20px; text-align: center;"><button onclick="Game.toggleAbout()" style="padding: 8px 16px; background: #333; color: #fff; border: 1px solid #666; border-radius: 4px; cursor: pointer;">Close</button></div>';
        
        aboutDiv.innerHTML = html;
        aboutContainer.appendChild(aboutDiv);
        
        // Add about toggle functionality
        var aboutButton = document.getElementById("about-toggle-button");
        aboutButton.addEventListener("click", function() {
            Game.toggleAbout();
        });
        
        // Add leaderboard toggle functionality
        var leaderboardButton = document.getElementById("leaderboard-button");
        if (leaderboardButton) {
            leaderboardButton.addEventListener("click", function() {
                Leaderboard.showLeaderboard();
            });
        }
    },
    
    toggleAbout: function() {
        var overlay = document.getElementById("about-overlay");
        if (overlay.style.display === "none") {
            overlay.style.display = "block";
        } else {
            overlay.style.display = "none";
        }
    },
    
    _drawInstructions: function() {
        // This method is now obsolete but kept for compatibility
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
                // Special case for player status effects - draw halos first
                if (tile.being === Game.player) {
                    if (Game.player._isInvulnerable) {
                        spritesToDraw.push('blue_halo');
                    }
                    if (Game.player._isFast) {
                        spritesToDraw.push('green_halo');
                    }
                }
                
                spritesToDraw.push(tile.being._sprite);
                
                if (tile.being._isAttacking) {
                    spritesToDraw.push('attack_effect');
                }
                if (tile.being._isTakingDamage) {
                    spritesToDraw.push('blood_splatter');
                }
            }
        } else {
            // If not visible but explored, only draw items...
            if (tile.item) {
                spritesToDraw.push(tile.item._sprite);
            }
            // ...and then the fog of war sprite over everything.
            spritesToDraw.push('darker_black');
        }
        
        // Add explosion effect on top of everything if this tile is exploding
        if (tile._isExploding) {
            spritesToDraw.push('explosion');
        }
        
        // Draw all collected sprites for this tile at once
        this.display.draw(x, y, spritesToDraw);
    },
    
    _drawStats: function() {
        if (!this.statsDisplayHtml) return;
        
        // Clear existing content
        this.statsDisplayHtml.innerHTML = '';
        
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
            
            // Create main container with flexbox for left/right alignment
            var mainContainer = document.createElement('div');
            mainContainer.style.display = 'flex';
            mainContainer.style.justifyContent = 'space-between';
            mainContainer.style.alignItems = 'center';
            mainContainer.style.width = '100%';
            mainContainer.style.height = '100%';
            
            // Create left side with stats
            var leftSide = document.createElement('div');
            leftSide.style.whiteSpace = 'nowrap';
            leftSide.style.display = 'flex';
            leftSide.style.alignItems = 'center';
            leftSide.style.gap = '4px';
            
            // Create health hearts
            var currentHealth = this.player.getHealth();
            var maxHealth = this.player.getMaxHealth();
            
            for (var h = 0; h < maxHealth; h++) {
                var heartIcon = document.createElement('img');
                heartIcon.src = 'assets/tileset.png';
                heartIcon.style.width = '16px';
                heartIcon.style.height = '16px';
                heartIcon.style.imageRendering = 'pixelated';
                
                // Use full heart if we have health, empty heart if not
                var heartSprite = (h < currentHealth) ? 'heart' : 'empty_heart';
                var heartCoords = SPRITES[heartSprite];
                heartIcon.style.objectFit = 'none';
                heartIcon.style.objectPosition = '-' + heartCoords[0] + 'px -' + heartCoords[1] + 'px';
                
                leftSide.appendChild(heartIcon);
            }
            
            // Create stats text after hearts
            var statsTextPart1 = " | Status: " + status + " | Level: " + this.levelNumber + " | ";
            var textSpan1 = document.createElement('span');
            textSpan1.textContent = statsTextPart1;
            
            // Create key icon
            var keyIcon = document.createElement('img');
            keyIcon.src = 'assets/tileset.png';
            keyIcon.style.width = '16px';
            keyIcon.style.height = '16px';
            keyIcon.style.imageRendering = 'pixelated';
            var keyCoords = SPRITES['key'];
            keyIcon.style.objectFit = 'none';
            keyIcon.style.objectPosition = '-' + keyCoords[0] + 'px -' + keyCoords[1] + 'px';
            
            // Create key count text
            var keysSpan = document.createElement('span');
            keysSpan.textContent = ": " + keys + "/3 | ";
            
            // Create coin icon
            var coinIcon = document.createElement('img');
            coinIcon.src = 'assets/tileset.png';
            coinIcon.style.width = '16px';
            coinIcon.style.height = '16px';
            coinIcon.style.imageRendering = 'pixelated';
            var coinCoords = SPRITES['coin'];
            coinIcon.style.objectFit = 'none';
            coinIcon.style.objectPosition = '-' + coinCoords[0] + 'px -' + coinCoords[1] + 'px';
            
            // Create coin count text
            var coinsSpan = document.createElement('span');
            coinsSpan.textContent = ": " + coins;
            
            leftSide.appendChild(textSpan1);
            leftSide.appendChild(keyIcon);
            leftSide.appendChild(keysSpan);
            leftSide.appendChild(coinIcon);
            leftSide.appendChild(coinsSpan);
            
            // Create inventory line with icons (right side)
            var inventoryLine = document.createElement('div');
            inventoryLine.style.display = 'flex';
            inventoryLine.style.alignItems = 'center';
            inventoryLine.style.gap = '6px';
            inventoryLine.style.flexShrink = '0';
            
            var inventory = this.player.getInventory();
            for (var i = 0; i < this.player.INVENTORY_SIZE; i++) {
                var slotDiv = document.createElement('span');
                slotDiv.style.display = 'inline-flex';
                slotDiv.style.alignItems = 'center';
                slotDiv.style.gap = '2px';
                
                // Slot number
                var slotNumber = document.createElement('span');
                slotNumber.textContent = (i + 1) + ':';
                slotNumber.style.minWidth = '15px';
                slotDiv.appendChild(slotNumber);
                
                // Item icon
                var icon = document.createElement('img');
                icon.src = 'assets/tileset.png';
                icon.style.width = '16px';
                icon.style.height = '16px';
                icon.style.imageRendering = 'pixelated';
                
                var item = inventory[i];
                var spriteName = item ? item._sprite : 'item_placeholder';
                var spriteCoords = SPRITES[spriteName];
                
                icon.style.objectFit = 'none';
                icon.style.objectPosition = '-' + spriteCoords[0] + 'px -' + spriteCoords[1] + 'px';
                
                slotDiv.appendChild(icon);
                inventoryLine.appendChild(slotDiv);
                
                // Add vertical separator after each slot (except the last one)
                if (i < this.player.INVENTORY_SIZE - 1) {
                    var separator = document.createElement('span');
                    separator.textContent = '|';
                    separator.style.color = '#666';
                    separator.style.margin = '0 3px';
                    separator.style.fontWeight = 'bold';
                    inventoryLine.appendChild(separator);
                }
            }
            
            // Add both sides to the main container
            mainContainer.appendChild(leftSide);
            mainContainer.appendChild(inventoryLine);
            
            this.statsDisplayHtml.appendChild(mainContainer);
        } else {
            var statsText = "Health: 0 (DEAD) | Status: dead | Level: " + this.levelNumber;
            this.statsDisplayHtml.textContent = statsText;
        }
    },
    
    // Add a message to the message display
    message: function(text) {
        // Add the new message to the history
        this.messageHistory.unshift(text);
        
        // Create a new message element
        var messageElement = document.createElement('div');
        messageElement.textContent = text;
        messageElement.style.margin = '2px 0';
        messageElement.style.lineHeight = '16px';
        
        // Add to the HTML display (if it exists)
        if (this.messageDisplayHtml) {
            // Insert at the top (most recent first)
            this.messageDisplayHtml.insertBefore(messageElement, this.messageDisplayHtml.firstChild);
            
            // Auto-scroll to top to show newest message
            this.messageDisplayHtml.scrollTop = 0;
        }
    },
    
    nextLevel: function() {
        // Define the custom level order
        var levelSequence = [
            'Level1', 'ZombieLevel', 'Level2', 'CobraLevel', 'Level3', 
            'ImpLevel', 'TrollLevel', 'Level4', 'Level5', 'Level6'
        ];
        
        this.levelNumber++;
        
        // Get the level class name from the sequence (levelNumber-1 because array is 0-indexed)
        var levelClassName = levelSequence[this.levelNumber - 1];
        var levelClass = window[levelClassName];

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
        
        // Clear the tile display
        if (this.display) {
            this.display.clear();
        }
        
        // Calculate final win score with bonus
        var finalScore = Leaderboard.calculateScore(this.player, this.levelNumber, true); // true = game won
        
        // Show comprehensive win statistics with leaderboard submission
        this._showWinStatisticsWithLeaderboard(finalScore);
        
        // Player-specific cleanup
        this.engine.lock();
    },
    
    // Show win statistics with leaderboard submission
    _showWinStatisticsWithLeaderboard: function(finalScore) {
        // Build comprehensive statistics
        var enemiesDefeated = this.player.getEnemiesDefeated();
        var totalEnemiesDefeated = 0;
        
        for (var enemyType in enemiesDefeated) {
            totalEnemiesDefeated += enemiesDefeated[enemyType];
        }
        
        // Create the overlay HTML
        var overlay = document.createElement('div');
        overlay.id = 'win-stats-overlay';
        overlay.className = 'death-screen-overlay';
        
        // Create the stats content
        var statsContent = document.createElement('div');
        statsContent.className = 'death-screen-content';
        statsContent.style.border = '3px solid #44aa44'; // Green border for win
        
        // Build the stats HTML
        var statsHTML = '<div style="color: #44ff44; font-size: 32px; font-weight: bold; margin-bottom: 10px;">🎉 CONGRATULATIONS! 🎉</div>';
        statsHTML += '<div style="color: #44ff44; font-size: 24px; font-weight: bold; margin-bottom: 15px;">YOU HAVE WON THE GAME!</div>';
        statsHTML += '<div style="color: #ffff44; font-size: 28px; font-weight: bold; margin-bottom: 15px;">FINAL SCORE: ' + finalScore.toLocaleString() + '</div>';
        statsHTML += '<div style="color: #aaffaa; font-size: 16px; margin-bottom: 15px;">🏆 Winner Bonus Applied! 🏆</div>';
        
        statsHTML += '<div style="color: #ffff44; font-size: 20px; font-weight: bold; margin-bottom: 15px;">FINAL STATISTICS</div>';
        statsHTML += '<div style="color: #ffffff; text-align: left; margin-bottom: 20px;">';
        statsHTML += '<div style="margin: 5px 0;">Levels completed: <span style="color: #44ff44;">' + this.levelNumber + '</span></div>';
        statsHTML += '<div style="margin: 5px 0;">Rounds survived: <span style="color: #44ff44;">' + this.player.getTurns() + '</span></div>';
        statsHTML += '<div style="margin: 5px 0;">Steps traveled: <span style="color: #44ff44;">' + this.player.getSteps() + '</span></div>';
        statsHTML += '<div style="margin: 5px 0;">Gold collected: <span style="color: #44ff44;">' + this.player.getCoinsCollected() + '</span></div>';
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
        statsHTML += '<div style="color: #44ff44; font-weight: bold; margin-bottom: 10px;">🏆 CHAMPION LEADERBOARD 🏆</div>';
        statsHTML += '<div style="margin-bottom: 10px;">Enter your name to claim victory:</div>';
        statsHTML += '<input type="text" id="winner-name-input" class="name-input" placeholder="Champion Name" maxlength="20">';
        statsHTML += '<div style="margin-top: 15px;">';
        statsHTML += '<button id="submit-win-score-btn" class="submit-score-btn">Claim Victory</button>';
        statsHTML += '<button id="skip-win-submit-btn" class="skip-submit-btn">Skip</button>';
        statsHTML += '</div>';
        statsHTML += '</div>';
        
        statsHTML += '<div style="color: #44ff44; font-size: 16px; margin-top: 25px; font-weight: bold;">Or press ENTER to start over without submitting</div>';
        
        statsContent.innerHTML = statsHTML;
        overlay.appendChild(statsContent);
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Store stats for submission
        this._finalWinStats = {
            level: this.levelNumber,
            turns: this.player.getTurns(),
            steps: this.player.getSteps(),
            coinsCollected: this.player.getCoinsCollected(),
            totalEnemiesDefeated: totalEnemiesDefeated
        };
        this._finalWinScore = finalScore;
        
        // Set up event listeners
        this._setupWinScreenEventListeners();
    },
    
    // Set up event listeners for the win screen
    _setupWinScreenEventListeners: function() {
        var self = this;
        
        // Handle Enter key to restart without submitting
        var keyHandler = function(e) {
            if (e.keyCode === KEY_CODES.ENTER) {
                self._restartGameFromWin();
            }
        };
        window.addEventListener("keydown", keyHandler);
        
        // Handle submit button
        var submitBtn = document.getElementById('submit-win-score-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                self._submitWinScore();
            });
        }
        
        // Handle skip button
        var skipBtn = document.getElementById('skip-win-submit-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', function() {
                self._restartGameFromWin();
            });
        }
        
        // Handle Enter key in name input to submit
        var nameInput = document.getElementById('winner-name-input');
        if (nameInput) {
            nameInput.addEventListener('keypress', function(e) {
                if (e.keyCode === KEY_CODES.ENTER) {
                    self._submitWinScore();
                }
            });
            nameInput.focus(); // Focus the input for immediate typing
        }
        
        // Store reference to cleanup later
        this._winScreenKeyHandler = keyHandler;
    },
    
    // Submit win score to leaderboard
    _submitWinScore: async function() {
        var nameInput = document.getElementById('winner-name-input');
        var submitBtn = document.getElementById('submit-win-score-btn');
        
        if (!nameInput || !submitBtn) return;
        
        var playerName = nameInput.value.trim();
        if (!playerName) {
            nameInput.style.borderColor = '#ff4444';
            nameInput.placeholder = 'Champion name required!';
            return;
        }
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            var success = await Leaderboard.submitScore(playerName, this._finalWinScore, this._finalWinStats);
            
            if (success) {
                // Show success message
                submitBtn.textContent = 'Victory Claimed!';
                submitBtn.style.backgroundColor = '#44ff44';
                setTimeout(() => {
                    this._showWinLeaderboardThenRestart(true); // true = score was submitted
                }, 1000);
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            console.error('Error submitting win score:', error);
            submitBtn.textContent = 'Failed - Try Again';
            submitBtn.style.backgroundColor = '#ff4444';
            submitBtn.disabled = false;
        }
    },
    
    // Restart the game from win screen
    _restartGameFromWin: function() {
        this._showWinLeaderboardThenRestart(false); // false = score was not submitted
    },
    
    // Show leaderboard then restart the game (win version)
    _showWinLeaderboardThenRestart: function(scoreSubmitted) {
        // Remove the win screen overlay
        var overlay = document.getElementById('win-stats-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        
        // Clean up event listener
        if (this._winScreenKeyHandler) {
            window.removeEventListener("keydown", this._winScreenKeyHandler);
        }
        
        // Show leaderboard with a message about the player's victory
        this._showFinalWinLeaderboard(scoreSubmitted);
    },
    
    // Show the final leaderboard with winner context
    _showFinalWinLeaderboard: async function(scoreSubmitted) {
        try {
            // Show loading message
            var loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'death-screen-overlay';
            loadingOverlay.innerHTML = '<div style="color: white; font-size: 20px;">Loading champion leaderboard...</div>';
            document.body.appendChild(loadingOverlay);
            
            // Get leaderboard data
            var scores = await Leaderboard.getTopScores();
            
            // Remove loading message
            document.body.removeChild(loadingOverlay);
            
            // Find player's rank if they submitted
            var playerRank = null;
            if (scoreSubmitted) {
                for (var i = 0; i < scores.length; i++) {
                    if (scores[i].score === this._finalWinScore) {
                        playerRank = i + 1;
                        break;
                    }
                }
            }
            
            // Show leaderboard with custom message
            this._renderFinalWinLeaderboard(scores, scoreSubmitted, playerRank);
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            // If leaderboard fails to load, just restart
            setTimeout(() => location.reload(), 1000);
        }
    },
    
    // Render the final win leaderboard with restart functionality
    _renderFinalWinLeaderboard: function(scores, scoreSubmitted, playerRank) {
        var overlay = document.createElement('div');
        overlay.className = 'death-screen-overlay';
        
        var content = document.createElement('div');
        content.className = 'leaderboard-content';
        content.style.border = '3px solid #44aa44'; // Green border for winners
        
        // Header with player's result
        var headerMessage = '';
        if (scoreSubmitted && playerRank) {
            headerMessage = '<div style="color: #44ff44; font-size: 24px; margin-bottom: 15px;">🏆 CHAMPION RANK #' + playerRank + ' 🏆</div>';
            headerMessage += '<div style="color: #aaffaa; font-size: 18px; margin-bottom: 15px;">Victory Score: ' + this._finalWinScore.toLocaleString() + ' points</div>';
        } else if (scoreSubmitted) {
            headerMessage = '<div style="color: #44ff44; font-size: 20px; margin-bottom: 15px;">🏆 VICTORY CLAIMED! 🏆</div>';
            headerMessage += '<div style="color: #aaffaa; font-size: 18px; margin-bottom: 15px;">Victory Score: ' + this._finalWinScore.toLocaleString() + ' points</div>';
        } else {
            headerMessage = '<div style="color: #44ff44; font-size: 20px; margin-bottom: 15px;">🎉 GAME COMPLETED! 🎉</div>';
            headerMessage += '<div style="color: #aaffaa; font-size: 18px; margin-bottom: 15px;">Final Score: ' + this._finalWinScore.toLocaleString() + ' points</div>';
        }
        
        var html = headerMessage;
        html += '<div style="color: #ffff44; font-size: 24px; font-weight: bold; margin-bottom: 20px;">🏆 CHAMPION LEADERBOARD 🏆</div>';
        
        if (scores.length === 0) {
            html += '<div style="color: white; text-align: center; margin: 50px;">No scores yet!</div>';
        } else {
            html += '<div class="leaderboard-list">';
            html += '<div class="leaderboard-header-row">';
            html += '<div class="rank-col">Rank</div>';
            html += '<div class="name-col">Champion</div>';
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
                if (rank === 1) rankDisplay = '👑';
                else if (rank === 2) rankDisplay = '🥈';
                else if (rank === 3) rankDisplay = '🥉';
                
                // Highlight the player's score if it's in the top 10
                var rowClass = 'leaderboard-row';
                if (scoreSubmitted && scoreEntry.score === this._finalWinScore) {
                    rowClass += '" style="background-color: #004400; border: 2px solid #44ff44;';
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
                html += '<div style="text-align: center; margin: 10px; color: #999;">... and ' + (scores.length - 10) + ' more champions</div>';
            }
            
            html += '</div>';
        }
        
        html += '<div style="margin-top: 30px; text-align: center;">';
        html += '<div style="color: #cccccc; margin-bottom: 15px;">Game will restart automatically in <span id="win-countdown">15</span> seconds</div>';
        html += '<button id="restart-now-from-win-btn" style="background: #44ff44; color: black; border: none; padding: 15px 30px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: \'Courier New\', Courier, monospace; font-size: 16px;">🎮 Play Again</button>';
        html += '</div>';
        
        content.innerHTML = html;
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Set up restart button
        document.getElementById('restart-now-from-win-btn').addEventListener('click', function() {
            location.reload();
        });
        
        // Set up 15-second countdown (longer for winners to savor the moment)
        var countdown = 15;
        var countdownElement = document.getElementById('win-countdown');
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
    },
    
    isPassableTile: function(x, y) {
        return this.currentLevel.isPassable(x, y);
    },
    
    // Helper function to get the living being at a position (filters out dead beings)
    getBeingAt: function(x, y) {
        if (!this.isPassableTile(x, y)) return null;
        var being = this.currentLevel.map[x][y].being;
        return (being && !being._isDead) ? being : null;
    },
    
    // Helper function to get any being at a position (including dead beings for visual purposes)
    getVisualBeingAt: function(x, y) {
        return this.isPassableTile(x, y) ? this.currentLevel.map[x][y].being : null;
    },

    // Global animation system methods
    queueAnimation: function(callback, delay) {
        delay = delay || 200; // Default animation duration
        this.animationCallbacks.push(callback);
        
        // Clear existing timeout and set a new one
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }
        
        this.animationTimeout = setTimeout(() => {
            this.processAnimationQueue();
        }, delay);
    },
    
    processAnimationQueue: function() {
        // Execute all queued callbacks
        for (var i = 0; i < this.animationCallbacks.length; i++) {
            this.animationCallbacks[i]();
        }
        
        // Clear the queue
        this.animationCallbacks = [];
        this.animationTimeout = null;
        
        // Redraw everything
        this._drawAll();
    },
    
    _createHtmlStatsDisplay: function() {
        // Create the HTML stats display container
        var statsDiv = document.createElement('div');
        statsDiv.id = 'html-stats-display';
        statsDiv.className = 'html-stats-display';
        
        // Style the stats display
        statsDiv.style.fontFamily = 'monospace';
        statsDiv.style.fontSize = '14px';
        statsDiv.style.color = '#ffffff';
        statsDiv.style.backgroundColor = '#333';
        statsDiv.style.border = '2px solid #666';
        statsDiv.style.borderRadius = '4px';
        statsDiv.style.padding = '8px';
        statsDiv.style.height = '40px'; // Single line height for horizontal layout
        statsDiv.style.position = 'relative';
        statsDiv.style.boxSizing = 'border-box';
        statsDiv.style.display = 'flex';
        statsDiv.style.alignItems = 'center';
        statsDiv.style.width = '100%';
        
        // Store reference for easy access
        this.statsDisplayHtml = statsDiv;
    },
    
    _createHtmlMessageDisplay: function() {
        // Create the HTML message display container
        var messageDiv = document.createElement('div');
        messageDiv.id = 'html-message-display';
        messageDiv.className = 'html-message-display';
        
        // Style the message display
        messageDiv.style.fontFamily = 'monospace';
        messageDiv.style.fontSize = '14px';
        messageDiv.style.color = '#ffffff';
        messageDiv.style.backgroundColor = '#2a2a2a';
        messageDiv.style.border = '2px solid #666';
        messageDiv.style.borderRadius = '4px';
        messageDiv.style.padding = '8px';
        messageDiv.style.overflowY = 'auto'; // Enable scrolling
        messageDiv.style.height = (this.MESSAGE_LINES * 20) + 'px'; // ~20px per line
        messageDiv.style.position = 'relative';
        messageDiv.style.boxSizing = 'border-box';
        messageDiv.style.textAlign = 'left'; // Align text to the left
        
        // Store reference for easy access
        this.messageDisplayHtml = messageDiv;
    }
};

Game.init();