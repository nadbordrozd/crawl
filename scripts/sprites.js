// sprites.js
// Defines the positions of sprites in the spritesheet (tileset)
// Edit these values to match your actual tileset

const SPRITES = {
    wall: [96, 304],      // x, y position in the spritesheet (edit as needed)
    floor: [96, 144],    // x, y position in the spritesheet (edit as needed)
    player: [144, 528],   // x, y position in the spritesheet (edit as needed)
    shield: [192, 560]
};

// For CommonJS/Node.js style
// module.exports = SPRITES;

// For browser/global usage
window.SPRITES = SPRITES; 