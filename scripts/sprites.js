// sprites.js
// Defines the positions of sprites in the spritesheet (tileset)
// Edit these values to match your actual tileset

const SPRITES = {
    transparent: [64, 32],
    purple_background: [0, 0],
    darker_black: [32, 0],
    even_blacker_black: [48, 0],
    darkest_black: [0, 0],
    floor:[16, 0],
    puddle:[32,16],
    blue_halo:[0, 16],
    green_halo:[16, 16],
    explosion: [64, 32],
    blood_splatter: [80, 32],
    dirt1: [64, 144],
    dirt2: [80, 144],
    dirt3: [96, 144],
    dirt4: [112, 144],
    dirt5: [128, 144],
    dirt6: [144, 144],
    dirt7: [160, 144],
    dirt8: [176, 144],
    dirt9: [192, 144],
    dirt10: [208, 144],
    dirt11: [64, 0],
    dirt12: [80, 0],
    dirt13: [96, 0],
    dirt14: [112, 0],
    dirt15: [128, 0],
    dirt16: [144, 0],
    dirt17: [160, 0],
    dirt18: [176, 0],
    dirt19: [192, 0],
    dirt20: [208, 0],

    black_background: [16, 0],
    placeholder: [192, 540],
    wall: [96, 304],

    skeleton_remains: [112, 416],
    bull_skull: [128, 416],
    ribcage: [144, 416],

    player: [144, 528],
    shield: [192, 560],
    health_potion: [64, 576],
    key: [112, 576],
    frog: [192, 432],
    mad_frog: [208, 464],
    rat: [160, 432],
    coin: [96, 592],
    speed_potion: [96, 576],
    scorpion: [160, 464],
    assassin: [112, 528],
    bomb: [1184, 544],
    audrey_2: [96, 480],
    gate: [80, 336],
    NS_wall: [64, 304],
    NW_corner: [80, 304],
    WE_wall: [96, 304],
    NE_corner: [112, 304],
    t_wall: [128, 304],
    reverse_t_wall: [128, 320],
    grate_wall: [64, 320],
    SW_corner: [80, 320],
    torch_wall: [96, 320],
    SE_corner: [112, 320],

    NS_wall_egypt_1: [1232, 304],
    NW_corner_egypt_1: [1248, 304],
    WE_wall_egypt_1: [1264, 304],
    NE_corner_egypt_1: [1280, 304],
    t_wall_egypt_1: [1296, 304],
    reverse_t_wall_egypt_1: [1296, 320],
    grate_wall_egypt_1: [1232, 320],
    SW_corner_egypt_1: [1248, 320],
    torch_wall_egypt_1: [1264, 320],
    SE_corner_egypt_1: [1280, 320],

    NS_wall_green: [848, 304],
    NW_corner_green: [864, 304],
    WE_wall_green: [880, 304],
    NE_corner_green: [896, 304],
    t_wall_green: [912, 304],
    reverse_t_wall_green: [912, 320],
    grate_wall_green: [848, 320],
    SW_corner_green: [864, 320],
    torch_wall_green: [880, 320],
    SE_corner_green: [896, 320],

    NS_wall_prehistoric: [656, 304],
    NW_corner_prehistoric: [672, 304],
    WE_wall_prehistoric: [688, 304],
    NE_corner_prehistoric: [704, 304],
    t_wall_prehistoric: [720, 304],
    reverse_t_wall_prehistoric: [720, 320],
    grate_wall_prehistoric: [656, 320],
    SW_corner_prehistoric: [672, 320],
    torch_wall_prehistoric: [688, 320],
    SE_corner_prehistoric: [704, 320],

    tower: [96, 288],
    diamond: [80, 592],
    sword: [80, 544],
    attack_effect: [80, 544],
    spider: [192, 448],
    ghost: [144, 496],
    snake: [144, 448],
    item_placeholder: [144, 656],
    heart: [64, 640],
    half_heart: [80, 640],
    empty_heart: [96, 640],
    drumstick: [96, 624],
    zombie: [112, 480],
    cobra: [1440, 448],
    orc: [80, 512],
    troll: [96, 512],
    reaper: [192, 480],
    imp: [208, 496],
    grave1: [160, 416],
    grave2: [176, 416],
    grave3: [192, 416],
    grave4: [208, 416],
    belt: [128, 560],
    skeleton: [112, 496],
    unicorn: [80, 464],
    ring_1: [144, 592],
    ring_2: [160, 592],
    ring_3: [176, 592],
    scroll: [144, 576],
    flame: [64, 672],
    flaming_horse: [208, 480],
    ninja: [1456, 512],
    sarcophagus: [1312, 352],
    sphinx: [1312, 368],
    fire_with_pot: [720, 352],
    stalagmite_2: [656, 416], 

    // Wall sprite sets for different level themes
    WALL_SETS: {
        DEFAULT: {
            NS_wall: 'NS_wall',
            WE_wall: 'WE_wall',
            NW_corner: 'NW_corner',
            NE_corner: 'NE_corner',
            SW_corner: 'SW_corner',
            SE_corner: 'SE_corner',
            t_wall: 't_wall',
            reverse_t_wall: 'reverse_t_wall',
            grate_wall: 'grate_wall',
            torch_wall: 'torch_wall'
        },
        
        EGYPT: {
            NS_wall: 'NS_wall_egypt_1',
            WE_wall: 'WE_wall_egypt_1',
            NW_corner: 'NW_corner_egypt_1',
            NE_corner: 'NE_corner_egypt_1',
            SW_corner: 'SW_corner_egypt_1',
            SE_corner: 'SE_corner_egypt_1',
            t_wall: 't_wall_egypt_1',
            reverse_t_wall: 'reverse_t_wall_egypt_1',
            grate_wall: 'grate_wall_egypt_1',
            torch_wall: 'torch_wall_egypt_1'
        },

        GREEN: {
            NS_wall: 'NS_wall_green',
            NW_corner: 'NW_corner_green',
            WE_wall: 'WE_wall_green',
            NE_corner: 'NE_corner_green',
            t_wall: 't_wall_green',
            reverse_t_wall: 'reverse_t_wall_green',
            grate_wall: 'grate_wall_green',
            SW_corner: 'SW_corner_green',
            torch_wall: 'torch_wall_green',
            SE_corner: 'SE_corner_green',
        },

        PREHISTORIC: {
            NS_wall: 'NS_wall_prehistoric',
            NW_corner: 'NW_corner_prehistoric',
            WE_wall: 'WE_wall_prehistoric',
            NE_corner: 'NE_corner_prehistoric',
            t_wall: 't_wall_prehistoric',
            reverse_t_wall: 'reverse_t_wall_prehistoric',
            grate_wall: 'grate_wall_prehistoric',
            SW_corner: 'SW_corner_prehistoric',
            torch_wall: 'torch_wall_prehistoric',
            SE_corner: 'SE_corner_prehistoric',
        }
    }
};

// --- Sprite overrides (runtime atlas) ---
// The tileset image every <img> icon uses. Starts as the plain tileset; once
// the runtime atlas (tileset + override PNGs) is composed it becomes a URL of
// that atlas (see SpriteAtlas below), so icons and the map always agree.
var TILESET_SRC = 'assets/tileset.png';

// Floor themes: each level picks a random variant of its theme per floor tile.
var FLOOR_THEMES = {
    dungeon:   ['floor_dungeon_1', 'floor_dungeon_2', 'floor_dungeon_3'],
    graveyard: ['floor_graveyard_1', 'floor_graveyard_2', 'floor_graveyard_3'],
    egypt:     ['floor_egypt_1', 'floor_egypt_2', 'floor_egypt_3'],
    cave:      ['floor_cave_1', 'floor_cave_2', 'floor_cave_3']
};

// Sprite name -> 16x16 PNG that replaces (or adds) that SPRITES entry.
// A static site cannot list a folder, so every override is named here.
// A file that is missing keeps the entry's tileset cell (the fallback).
var SPRITE_OVERRIDES = {
    flaming_horse: 'assets/sprites/flaming_horse.png',
    ninja: 'assets/sprites/ninja.png',
    ghost: 'assets/sprites/ghost.png',
    troll: 'assets/sprites/troll.png',
    zombie: 'assets/sprites/zombie.png'
};

// Every floor variant defaults to the old floor cell (dirt18) and is an override.
Object.keys(FLOOR_THEMES).forEach(function(theme) {
    FLOOR_THEMES[theme].forEach(function(name) {
        SPRITES[name] = SPRITES.dirt18.slice();
        SPRITE_OVERRIDES[name] = 'assets/sprites/' + name + '.png';
    });
});

// Random floor variant name for a theme (unknown theme -> dungeon).
function randomFloorVariant(theme) {
    var variants = FLOOR_THEMES[theme] || FLOOR_THEMES.dungeon;
    return variants[Math.floor(ROT.RNG.getUniform() * variants.length)];
}

// Composes assets/tileset.png and the override PNGs into one canvas atlas:
// the tileset is copied unchanged and the loaded overrides are appended in
// extra 16 px rows below it. Resolves with the image to give ROT.Display.
var SpriteAtlas = {
    TILE: 16,

    _loadImage: function(src) {
        return new Promise(function(resolve) {
            var img = new Image();
            img.onload = function() { resolve(img); };
            img.onerror = function() { resolve(null); }; // missing file = keep fallback
            img.src = src;
        });
    },

    _canvasUrl: function(canvas) {
        return new Promise(function(resolve, reject) {
            try {
                if (canvas.toBlob) {
                    canvas.toBlob(function(blob) {
                        if (blob) { resolve(URL.createObjectURL(blob)); }
                        else { reject(new Error('empty atlas blob')); }
                    }, 'image/png');
                } else {
                    resolve(canvas.toDataURL('image/png'));
                }
            } catch (e) {
                reject(e); // e.g. a tainted canvas when opened from file://
            }
        });
    },

    // Optional manifest: a JSON array of the sprite names whose PNG exists in
    // assets/sprites/. When present only those files are requested (no 404s
    // for absent overrides); when absent every SPRITE_OVERRIDES file is tried.
    MANIFEST: 'assets/sprites/manifest.json',

    _overrideNames: function() {
        var all = Object.keys(SPRITE_OVERRIDES);
        if (!window.fetch) { return Promise.resolve(all); }
        return fetch(this.MANIFEST).then(function(res) {
            if (!res.ok) { return all; }
            return res.json().then(function(listed) {
                if (!Array.isArray(listed)) { return all; }
                return all.filter(function(name) { return listed.indexOf(name) !== -1; });
            });
        }).catch(function() { return all; });
    },

    build: function() {
        var self = this;
        var T = this.TILE;
        var names;
        var tilesetLoad = this._loadImage('assets/tileset.png'); // in parallel with the manifest

        return this._overrideNames().then(function(found) {
            names = found;
            return Promise.all([tilesetLoad].concat(names.map(function(name) {
                return self._loadImage(SPRITE_OVERRIDES[name]);
            })));
        }).then(function(images) {
            var tileset = images[0];
            if (!tileset) { throw new Error('assets/tileset.png failed to load'); }

            var loaded = [];
            names.forEach(function(name, i) {
                var img = images[i + 1];
                if (img) { loaded.push({ name: name, img: img }); }
            });
            if (loaded.length === 0) { return tileset; } // nothing to compose

            var cols = Math.max(1, Math.floor(tileset.width / T));
            var extraRows = Math.ceil(loaded.length / cols);
            var canvas = document.createElement('canvas');
            canvas.width = tileset.width;
            canvas.height = tileset.height + extraRows * T;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tileset, 0, 0);

            var coords = {};
            loaded.forEach(function(entry, i) {
                var x = (i % cols) * T;
                var y = tileset.height + Math.floor(i / cols) * T;
                ctx.drawImage(entry.img, 0, 0, T, T, x, y, T, T);
                coords[entry.name] = [x, y];
            });

            return self._canvasUrl(canvas).then(function(url) {
                // Commit coordinates and icon source together so <img> icons
                // never pair new coordinates with the old image.
                Object.keys(coords).forEach(function(name) { SPRITES[name] = coords[name]; });
                TILESET_SRC = url;
                return canvas;
            }, function(err) {
                console.warn('Sprite overrides disabled (atlas cannot be exported):', err);
                return tileset;
            });
        });
    }
};

// For CommonJS/Node.js style
// module.exports = SPRITES;

// For browser/global usage
window.SPRITES = SPRITES; 