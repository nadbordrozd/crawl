// sprites.js
// Defines the positions of sprites in the spritesheet (tileset)
// Edit these values to match your actual tileset

const SPRITES = {
    transparent: [64, 32],
    purple_background: [0, 0],
    floor:[16, 0],
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
    tower: [96, 288],
    diamond: [80, 592],
    sword: [80, 544],
    attack_effect: [80, 544]





};

// For CommonJS/Node.js style
// module.exports = SPRITES;

// For browser/global usage
window.SPRITES = SPRITES; 