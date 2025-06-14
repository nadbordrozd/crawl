// sprites.js
// Defines the positions of sprites in the spritesheet (tileset)
// Edit these values to match your actual tileset

const SPRITES = {
    placeholder: [192, 540],
    wall: [96, 304],      // x, y position in the spritesheet (edit as needed)
    floor: [96, 144],    // x, y position in the spritesheet (edit as needed)
    player: [144, 528],   // x, y position in the spritesheet (edit as needed)
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
    tower: [96, 288],
    diamond: [80, 592]





};

// For CommonJS/Node.js style
// module.exports = SPRITES;

// For browser/global usage
window.SPRITES = SPRITES; 