// effects.js
// Procedural pixel-art effects drawn on a canvas stacked over the ROT map.
// The canvas uses the same 16 px tile space and CSS scale as the map, so every
// fillRect lands on a whole map pixel. Pure presentation: nothing here reads
// input, changes game state or delays a turn. One requestAnimationFrame loop
// runs while an effect or a status aura is live and stops otherwise.

var Effects = {
    T: 16,
    canvas: null,
    ctx: null,
    tileSet: null,
    display: null,     // the ROT canvas (shaken together with ours)
    effects: [],       // timed effects: {start, life, clip, render(ctx, age, now)}
    particles: [],     // square/plus/line/disc particles
    afterimages: [],   // speed trail ghosts
    running: false,
    lastFrame: 0,
    reduced: false,
    shakeUntil: 0,
    shakeStart: 0,
    shakeAmp: 0,
    _shaking: false,
    _clipCells: null,
    _clipPath: null,
    _spriteData: {},
    _silhouettes: {},
    _nextGlint: 0,
    _nextStreak: 0,
    _moveDir: [1, 0],
    disabled: false,

    PAL: {
        fire: ['#fff3b0', '#ffd34e', '#ff8a1f', '#e0401c', '#6b1f1f'],
        smoke: ['#8a8a96', '#6a6a76', '#4a4a56', '#34343e'],
        stone: ['#a8b8c8', '#e8f4ff'],
        speed: ['#7dff9a', '#2bd46a'],
        heal: ['#ff5a6e', '#7dff9a'],
        gold: ['#ffe066', '#ffb31a'],
        outline: '#1b1424',
        white: '#ffffff'
    },

    // 3x5 pixel font for floating numbers
    GLYPHS: {
        '0': ['111', '101', '101', '101', '111'],
        '1': ['010', '110', '010', '010', '111'],
        '2': ['111', '001', '111', '100', '111'],
        '3': ['111', '001', '011', '001', '111'],
        '4': ['101', '101', '111', '001', '001'],
        '5': ['111', '100', '111', '001', '111'],
        '6': ['111', '100', '111', '101', '111'],
        '7': ['111', '001', '010', '010', '010'],
        '8': ['111', '101', '111', '101', '111'],
        '9': ['111', '101', '111', '001', '111'],
        '+': ['000', '010', '111', '010', '000'],
        '-': ['000', '000', '111', '000', '000']
    },

    HEART: ['.11.11.', '1111111', '1111111', '.11111.', '..111..', '...1...'],

    // ---------------------------------------------------------------- setup

    // Called once the ROT display exists. displayCanvas is its canvas; the
    // effects canvas is inserted right after it in the same wrapper.
    init: function(displayCanvas, tileSet) {
        this.display = displayCanvas;
        this.tileSet = tileSet;
        try {
            this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { this.reduced = false; }

        var c = document.createElement('canvas');
        c.className = 'effects-layer';
        c.width = displayCanvas.width;
        c.height = displayCanvas.height;
        c.style.position = 'absolute';
        c.style.top = '0';
        c.style.left = '0';
        c.style.pointerEvents = 'none';
        c.style.transformOrigin = 'top left';
        c.style.transform = displayCanvas.style.transform;
        c.style.imageRendering = 'pixelated';
        displayCanvas.parentNode.insertBefore(c, displayCanvas.nextSibling);
        this.canvas = c;
        this.ctx = c.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.kick();
    },

    ready: function() {
        return !!(this.ctx && !this.disabled && Game.currentLevel && Game.player);
    },

    // Stop for good (win screen): nothing more is drawn.
    stop: function() {
        this.disabled = true;
        this.clear();
    },

    _now: function() {
        return (window.performance && performance.now) ? performance.now() : Date.now();
    },

    // Start the loop if anything needs drawing (effects or an active aura).
    kick: function() {
        if (this.running || !this.ctx) { return; }
        if (!this._hasWork()) { return; }
        this.running = true;
        this.lastFrame = this._now();
        var self = this;
        requestAnimationFrame(function(t) { self._frame(t); });
    },

    _auraActive: function() {
        var p = Game.player;
        return !!(p && (p._isInvulnerable || p._isFast));
    },

    _hasWork: function() {
        return this.effects.length > 0 || this.particles.length > 0 ||
            this.afterimages.length > 0 || this._shaking || this._auraActive();
    },

    clear: function() {
        this.effects = [];
        this.particles = [];
        this.afterimages = [];
        this.shakeUntil = 0;
        this._applyShake(0, 0);
        if (this.ctx) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    },

    _add: function(fx) {
        if (!this.ctx) { return; }
        fx.start = this._now() + (fx.delay || 0);
        if (fx.clip === undefined) { fx.clip = true; }
        this.effects.push(fx);
        this.kick();
    },

    _addParticle: function(p) {
        p.age = -(p.delay || 0);
        p.vx = p.vx || 0; p.vy = p.vy || 0;
        p.ax = p.ax || 0; p.ay = p.ay || 0;
        p.drag = p.drag || 0;
        p.size = p.size || 1;
        if (p.clip === undefined) { p.clip = true; }
        this.particles.push(p);
    },

    _count: function(n) {
        return this.reduced ? Math.max(1, Math.round(n / 2)) : n;
    },

    _rand: function(a, b) { return a + Math.random() * (b - a); },

    // Alpha in steps of 1/4 keeps fades chunky instead of smooth.
    _stepAlpha: function(a) {
        return Math.max(0, Math.min(1, Math.ceil(a * 4) / 4));
    },

    _visible: function(x, y) {
        var lvl = Game.currentLevel;
        return !!(lvl && lvl.visibleCells && lvl.visibleCells[x + ',' + y]);
    },

    // ---------------------------------------------------------------- sprite data

    _spriteInfo: function(name) {
        if (this._spriteData[name] !== undefined) { return this._spriteData[name]; }
        var info = null;
        var coords = SPRITES[name];
        if (coords && this.tileSet) {
            try {
                var c = document.createElement('canvas');
                c.width = 16; c.height = 16;
                var cx = c.getContext('2d');
                cx.drawImage(this.tileSet, coords[0], coords[1], 16, 16, 0, 0, 16, 16);
                var data = cx.getImageData(0, 0, 16, 16).data;
                var opaque = [];
                var solid = {};
                for (var y = 0; y < 16; y++) {
                    for (var x = 0; x < 16; x++) {
                        var i = (y * 16 + x) * 4;
                        if (data[i + 3] > 127) {
                            solid[x + ',' + y] = true;
                            opaque.push({x: x, y: y, c: 'rgb(' + data[i] + ',' + data[i + 1] + ',' + data[i + 2] + ')'});
                        }
                    }
                }
                var outline = [];
                for (var oy = -1; oy <= 16; oy++) {
                    for (var ox = -1; ox <= 16; ox++) {
                        if (solid[ox + ',' + oy]) { continue; }
                        if (solid[(ox - 1) + ',' + oy] || solid[(ox + 1) + ',' + oy] ||
                            solid[ox + ',' + (oy - 1)] || solid[ox + ',' + (oy + 1)]) {
                            outline.push({x: ox, y: oy});
                        }
                    }
                }
                info = {opaque: opaque, outline: outline, canvas: c};
            } catch (e) {
                info = null; // tainted canvas (file://): effects fall back to plain shapes
            }
        }
        this._spriteData[name] = info;
        return info;
    },

    // A flat one-colour silhouette of a sprite (cached).
    _silhouette: function(name, color) {
        var key = name + '|' + color;
        if (this._silhouettes[key] !== undefined) { return this._silhouettes[key]; }
        var info = this._spriteInfo(name);
        var out = null;
        if (info) {
            out = document.createElement('canvas');
            out.width = 16; out.height = 16;
            var cx = out.getContext('2d');
            cx.drawImage(info.canvas, 0, 0);
            cx.globalCompositeOperation = 'source-in';
            cx.fillStyle = color;
            cx.fillRect(0, 0, 16, 16);
        }
        this._silhouettes[key] = out;
        return out;
    },

    // ---------------------------------------------------------------- pixel helpers

    _px: function(ctx, x, y, s, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), s, s);
    },

    _disc: function(ctx, cx, cy, r, color) {
        if (r < 0.5) { return; }
        cx = Math.round(cx); cy = Math.round(cy);
        ctx.fillStyle = color;
        var ri = Math.ceil(r);
        for (var dy = -ri; dy <= ri; dy++) {
            var w2 = r * r - dy * dy;
            if (w2 < 0) { continue; }
            var w = Math.floor(Math.sqrt(w2) + 0.25);
            ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
        }
    },

    _ring: function(ctx, cx, cy, ro, ri, color) {
        if (ro < 0.5) { return; }
        cx = Math.round(cx); cy = Math.round(cy);
        ctx.fillStyle = color;
        var rr = Math.ceil(ro);
        for (var dy = -rr; dy <= rr; dy++) {
            var o2 = ro * ro - dy * dy;
            if (o2 < 0) { continue; }
            var wo = Math.floor(Math.sqrt(o2) + 0.25);
            var i2 = ri * ri - dy * dy;
            if (ri <= 0 || i2 < 0) {
                ctx.fillRect(cx - wo, cy + dy, 2 * wo + 1, 1);
            } else {
                var wi = Math.floor(Math.sqrt(i2) + 0.25);
                if (wo > wi) {
                    ctx.fillRect(cx - wo, cy + dy, wo - wi, 1);
                    ctx.fillRect(cx + wi + 1, cy + dy, wo - wi, 1);
                }
            }
        }
    },

    _plus: function(ctx, x, y, color, core) {
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = color;
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillStyle = core || color;
        ctx.fillRect(x, y, 1, 1);
    },

    _text: function(ctx, str, x, y, color) {
        x = Math.round(x); y = Math.round(y);
        var glyphs = [];
        for (var i = 0; i < str.length; i++) {
            if (this.GLYPHS[str[i]]) { glyphs.push(this.GLYPHS[str[i]]); }
        }
        // dark outline first, then the colour
        for (var pass = 0; pass < 2; pass++) {
            ctx.fillStyle = pass === 0 ? this.PAL.outline : color;
            for (var g = 0; g < glyphs.length; g++) {
                var gx = x + g * 4;
                for (var row = 0; row < 5; row++) {
                    for (var col = 0; col < 3; col++) {
                        if (glyphs[g][row][col] !== '1') { continue; }
                        if (pass === 0) {
                            ctx.fillRect(gx + col - 1, y + row - 1, 3, 3);
                        } else {
                            ctx.fillRect(gx + col, y + row, 1, 1);
                        }
                    }
                }
            }
        }
    },

    _textWidth: function(str) { return str.length * 4 - 1; },

    _tileCenter: function(x, y) {
        return [x * this.T + 8, y * this.T + 8];
    },

    // ---------------------------------------------------------------- shake

    shake: function(ms, amp) {
        if (this.reduced || !this.display) { return; }
        var now = this._now();
        this.shakeStart = now;
        this.shakeUntil = now + ms;
        this.shakeAmp = amp;
        this._shaking = true;
        this.kick();
    },

    _applyShake: function(dx, dy) {
        if (!this.display) { return; }
        var t = 'scale(' + Game.zoomLevel + ')' + ((dx || dy) ? ' translate(' + dx + 'px,' + dy + 'px)' : '');
        this.display.style.transform = t;
        if (this.canvas) { this.canvas.style.transform = t; }
    },

    // ---------------------------------------------------------------- loop

    _buildClip: function() {
        var lvl = Game.currentLevel;
        var cells = lvl && lvl.visibleCells;
        if (cells === this._clipCells && this._clipPath) { return this._clipPath; }
        var path = new Path2D();
        for (var key in cells) {
            var parts = key.split(',');
            path.rect(parts[0] * this.T, parts[1] * this.T, this.T, this.T);
        }
        this._clipCells = cells;
        this._clipPath = path;
        return path;
    },

    _frame: function(now) {
        now = this._now();
        var dt = Math.min(0.05, (now - this.lastFrame) / 1000);
        this.lastFrame = now;
        var ctx = this.ctx;

        if (!this.ready()) {
            this.clear();
            this.running = false;
            return;
        }
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // screen shake: whole tile-space pixels, decaying
        if (this._shaking) {
            if (now >= this.shakeUntil) {
                this._shaking = false;
                this._applyShake(0, 0);
            } else if (Math.floor(now / 33) !== this._lastShakeStep) {
                this._lastShakeStep = Math.floor(now / 33);
                var k = 1 - (now - this.shakeStart) / (this.shakeUntil - this.shakeStart);
                var a = Math.max(1, Math.round(this.shakeAmp * k));
                this._applyShake(Math.round(this._rand(-a, a)), Math.round(this._rand(-a, a)));
            }
        }

        var clip = this._buildClip();
        var i, fx, age;

        // clipped layer: everything that sits on map tiles
        ctx.save();
        ctx.clip(clip);
        this._drawAuras(ctx, now, dt);
        this._drawParticles(ctx, dt, true, true); // smoke sits under the fire
        for (i = 0; i < this.effects.length; i++) {
            fx = this.effects[i];
            age = now - fx.start;
            if (fx.clip && age >= 0 && age < fx.life) { fx.render(ctx, age, now); }
        }
        this._drawParticles(ctx, dt, true, false);
        ctx.restore();

        // unclipped layer: floating numbers, reveal wave, fades
        this._drawParticles(ctx, dt, false, false);
        for (i = 0; i < this.effects.length; i++) {
            fx = this.effects[i];
            age = now - fx.start;
            if (!fx.clip && age >= 0 && age < fx.life) { fx.render(ctx, age, now); }
        }

        // drop finished effects
        var alive = [];
        for (i = 0; i < this.effects.length; i++) {
            fx = this.effects[i];
            if (now - fx.start < fx.life) { alive.push(fx); }
            else if (fx.onEnd) { fx.onEnd(); }
        }
        this.effects = alive;

        if (this._hasWork()) {
            var self = this;
            requestAnimationFrame(function(t) { self._frame(t); });
        } else {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.running = false;
        }
    },

    _drawParticles: function(ctx, dt, clipped, under) {
        var ms = dt * 1000;
        var keep = [];
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (p.clip !== clipped || !!p.under !== under) { keep.push(p); continue; }
            p.age += ms;
            if (p.age < 0) { keep.push(p); continue; }
            if (p.age >= p.life) { continue; }
            var t = p.age / p.life;
            p.vx += p.ax * dt; p.vy += p.ay * dt;
            if (p.drag) { var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            // pixel-art fade: particles blink out near the end instead of fading
            if (t > 0.7 && Math.floor(p.age / 50) % 2 === 1 && !p.noBlink) { keep.push(p); continue; }
            var color = p.colors ? p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))] : p.color;
            if (p.alpha) { ctx.globalAlpha = this._stepAlpha(p.alpha * (1 - t * 0.6)); }
            if (p.shape === 'plus') {
                this._plus(ctx, p.x, p.y, color, p.core);
            } else if (p.shape === 'disc') {
                this._disc(ctx, p.x, p.y, p.r + (p.grow || 0) * t, color);
            } else if (p.shape === 'line') {
                var len = Math.max(1, Math.round(p.len * (1 - t)));
                ctx.fillStyle = color;
                if (p.horizontal) { ctx.fillRect(Math.round(p.x), Math.round(p.y), len, 1); }
                else { ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, len); }
            } else {
                this._px(ctx, p.x, p.y, p.size, color);
            }
            ctx.globalAlpha = 1;
            keep.push(p);
        }
        this.particles = keep;
    },

    // ---------------------------------------------------------------- auras

    _drawAuras: function(ctx, now, dt) {
        var p = Game.player;
        if (!p) { return; }
        var ox = p._x * this.T, oy = p._y * this.T;
        var blinkOff = Math.floor(now / (this.reduced ? 250 : 120)) % 2 === 1;

        // speed afterimages (drawn first so the aura sits on top)
        var keep = [];
        for (var i = 0; i < this.afterimages.length; i++) {
            var a = this.afterimages[i];
            var age = now - a.start;
            if (age >= a.life) { continue; }
            var sil = this._silhouette(p._sprite, a.color);
            if (sil) {
                ctx.globalAlpha = this._stepAlpha(a.alpha * (1 - age / a.life));
                ctx.drawImage(sil, a.px, a.py);
                ctx.globalAlpha = 1;
            }
            keep.push(a);
        }
        this.afterimages = keep;

        var info = this._spriteInfo(p._sprite);

        if (p._isInvulnerable && !(p._invulnerabilityTurns <= 5 && blinkOff)) {
            if (info) {
                var phase = Math.floor(now / 45) % 28;
                // stone-grey wash over the body with a light band sweeping across it
                var wash = this._silhouette(p._sprite, this.PAL.stone[0]);
                if (wash) {
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(wash, ox, oy);
                    ctx.globalAlpha = 1;
                }
                ctx.fillStyle = this.PAL.stone[1];
                for (var q = 0; q < info.opaque.length; q++) {
                    var b = info.opaque[q];
                    var bb = ((b.x + b.y) - phase + 56) % 28;
                    if (bb < 2) { ctx.fillRect(ox + b.x, oy + b.y, 1, 1); }
                }
                for (var j = 0; j < info.outline.length; j++) {
                    var o = info.outline[j];
                    var band = ((o.x + o.y) - phase + 56) % 28;
                    ctx.fillStyle = band < 4 ? this.PAL.stone[1] : this.PAL.stone[0];
                    ctx.fillRect(ox + o.x, oy + o.y, 1, 1);
                }
                if (now >= this._nextGlint) {
                    this._nextGlint = now + this._rand(250, 550);
                    var g = info.outline[Math.floor(Math.random() * info.outline.length)];
                    this._addParticle({x: ox + g.x, y: oy + g.y, life: 300, shape: 'plus',
                        color: this.PAL.stone[1], core: this.PAL.white, noBlink: true});
                }
            } else {
                ctx.strokeStyle = this.PAL.stone[0];
                ctx.strokeRect(ox + 0.5, oy + 0.5, 15, 15);
            }
        }

        if (p._isFast && !(p._speedBoostTurns <= 5 && blinkOff)) {
            if (now >= this._nextStreak) {
                this._nextStreak = now + (this.reduced ? 220 : 110);
                var md = this._moveDir;
                var horizontal = md[0] !== 0 || md[1] === 0;
                var back = horizontal ? (md[0] >= 0 ? -1 : 1) : (md[1] >= 0 ? -1 : 1);
                var sx, sy;
                if (horizontal) {
                    sx = ox + (back < 0 ? -1 : 13) + Math.round(this._rand(-1, 2));
                    sy = oy + 3 + Math.floor(Math.random() * 10);
                } else {
                    sx = ox + 3 + Math.floor(Math.random() * 10);
                    sy = oy + (back < 0 ? -1 : 13) + Math.round(this._rand(-1, 2));
                }
                this._addParticle({x: sx, y: sy, life: 240, shape: 'line', len: 4,
                    horizontal: horizontal,
                    vx: horizontal ? back * 30 : 0, vy: horizontal ? 0 : back * 30,
                    colors: [this.PAL.speed[0], this.PAL.speed[1]]});
            }
        }
    },

    // ---------------------------------------------------------------- public effects

    // Melee: a directional slash arc from the attacker toward its target.
    slash: function(attacker, target) {
        if (!this.ctx || !attacker || !target) { return; }
        var dx = Math.sign(target._x - attacker._x), dy = Math.sign(target._y - attacker._y);
        if (dx === 0 && dy === 0) { return; }
        if (!this._visible(attacker._x, attacker._y) && !this._visible(target._x, target._y)) { return; }
        var len = Math.sqrt(dx * dx + dy * dy);
        var c = this._tileCenter(attacker._x, attacker._y);
        var cx = c[0] + dx / len * 5, cy = c[1] + dy / len * 5;
        var base = Math.atan2(dy, dx);
        var isPlayer = attacker === Game.player;
        var core = this.PAL.white;
        var edge = isPlayer ? this.PAL.gold[0] : (attacker._isAlly ? this.PAL.stone[1] : this.PAL.fire[3]);
        var R = 10, span = 2.3, sweep = 90, life = 190;
        var self = this;
        this._add({life: life, render: function(ctx, age) {
            var head = Math.min(1, age / sweep);
            var tail = Math.max(0, (age - sweep) / (life - sweep));
            var a0 = base - span / 2 + span * tail;
            var a1 = base - span / 2 + span * head;
            var steps = Math.ceil((a1 - a0) * R * 1.5);
            for (var s = 0; s <= steps; s++) {
                var a = a0 + (a1 - a0) * (steps ? s / steps : 0);
                var u = (a - (base - span / 2)) / span; // 0..1 along the arc
                var thick = u > 0.25 && u < 0.75 ? 3 : 2;
                var cos = Math.cos(a), sin = Math.sin(a);
                for (var k = 0; k < thick; k++) {
                    var r = R - k;
                    ctx.fillStyle = k === 0 ? edge : core;
                    ctx.fillRect(Math.round(cx + cos * r - 0.5), Math.round(cy + sin * r - 0.5), 1, 1);
                }
            }
            // bright head pixel
            if (head < 1) {
                self._px(ctx, cx + Math.cos(a1) * (R - 1) - 0.5, cy + Math.sin(a1) * (R - 1) - 0.5, 2, core);
            }
        }});
    },

    // Damage: the victim flashes white and a number rises.
    hit: function(victim, damage, killed) {
        if (!this.ctx || !victim) { return; }
        var x = victim._x, y = victim._y;
        if (!this._visible(x, y)) { return; }
        var sprite = victim._sprite;
        var self = this;
        this._add({life: 90, render: function(ctx, age) {
            var sil = self._silhouette(sprite, self.PAL.white);
            var px = (killed ? x : victim._x) * self.T, py = (killed ? y : victim._y) * self.T;
            ctx.globalAlpha = age < 50 ? 1 : 0.5;
            if (sil) { ctx.drawImage(sil, px, py); }
            else { ctx.fillStyle = self.PAL.white; ctx.fillRect(px + 3, py + 3, 10, 10); }
            ctx.globalAlpha = 1;
        }});
        var color = victim === Game.player ? this.PAL.heal[0] : this.PAL.gold[0];
        this.number(x, y, String(damage), color);
    },

    // A floating pixel number above tile (x, y).
    number: function(x, y, str, color) {
        if (!this.ctx) { return; }
        var now = this._now();
        // stagger numbers that land on the same tile close together (speed potion)
        var stack = 0;
        for (var i = 0; i < this.effects.length; i++) {
            var e = this.effects[i];
            if (e.numberAt === x + ',' + y && now - e.start < 400) { stack++; }
        }
        var w = this._textWidth(str);
        var bx = x * this.T + 8 - Math.floor(w / 2) + (stack % 3) * 4 - (stack % 3 ? 2 : 0);
        var by = y * this.T - 1 - (stack % 3) * 3;
        var self = this;
        this._add({life: 750, clip: false, numberAt: x + ',' + y, render: function(ctx, age) {
            var t = age / 750;
            var rise = Math.round(9 * (1 - Math.pow(1 - Math.min(1, t * 1.6), 2)));
            var pop = age < 60 ? 2 : 0;
            if (t > 0.75 && Math.floor(age / 50) % 2 === 1) { return; }
            self._text(ctx, str, bx, by + pop - rise, color);
        }});
    },

    // Damage absorbed by StoneSkin: a few stone chips.
    blocked: function(victim) {
        if (!this.ctx || !victim || !this._visible(victim._x, victim._y)) { return; }
        var c = this._tileCenter(victim._x, victim._y);
        for (var i = 0; i < this._count(6); i++) {
            var a = Math.random() * Math.PI * 2, s = this._rand(30, 60);
            this._addParticle({x: c[0], y: c[1] - 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 15, ay: 80,
                life: this._rand(200, 320), colors: [this.PAL.stone[1], this.PAL.stone[0]]});
        }
        this.number(victim._x, victim._y, '0', this.PAL.stone[0]);
        this.kick();
    },

    // Death: the sprite pops into a puff of its own pixels.
    death: function(being) {
        if (!this.ctx || !being || !this._visible(being._x, being._y)) { return; }
        var x = being._x, y = being._y;
        var ox = x * this.T, oy = y * this.T;
        var info = this._spriteInfo(being._sprite);
        var pixels = info && info.opaque.length ? info.opaque : null;
        var n = this._count(22);
        var delay = 70;
        for (var i = 0; i < n; i++) {
            var src = pixels ? pixels[Math.floor(Math.random() * pixels.length)] :
                {x: 4 + Math.random() * 8, y: 4 + Math.random() * 8, c: this.PAL.smoke[i % 4]};
            var dx = src.x - 7.5, dy = src.y - 7.5;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            var s = this._rand(25, 65);
            this._addParticle({x: ox + src.x, y: oy + src.y, delay: delay,
                vx: dx / d * s + this._rand(-8, 8), vy: dy / d * s - this._rand(10, 30), ay: 90, drag: 1.5,
                life: this._rand(320, 620), size: Math.random() < 0.3 ? 2 : 1, color: src.c});
        }
        for (var k = 0; k < this._count(5); k++) {
            this._addParticle({x: ox + this._rand(4, 12), y: oy + this._rand(5, 12), delay: delay + 30,
                vy: -this._rand(8, 16), vx: this._rand(-6, 6), life: this._rand(380, 520), shape: 'disc',
                r: 1, grow: 1.5, colors: [this.PAL.smoke[0], this.PAL.smoke[1], this.PAL.smoke[2]]});
        }
        var self = this, c = this._tileCenter(x, y);
        this._add({life: 140, delay: delay, render: function(ctx, age) {
            var r = 3 + age / 140 * 6;
            self._ring(ctx, c[0], c[1], r, r - 1, age < 70 ? self.PAL.white : self.PAL.smoke[0]);
        }});
    },

    // Bomb: fireball, shockwave, embers, debris, smoke, tile flash, shake.
    explosion: function(tx, ty, radius) {
        if (!this.ctx) { return; }
        var self = this, T = this.T, P = this.PAL;
        var c = this._tileCenter(tx, ty);
        var cx = c[0], cy = c[1];
        var x0 = (tx - radius) * T, y0 = (ty - radius) * T, side = (radius * 2 + 1) * T;

        this.shake(250, 2);

        // blast tiles flash outward in a wave (by ring distance)
        this._add({life: 120 + radius * 35, render: function(ctx, age) {
            for (var dx = -radius; dx <= radius; dx++) {
                for (var dy = -radius; dy <= radius; dy++) {
                    var d = Math.max(Math.abs(dx), Math.abs(dy));
                    var a = age - d * 35;
                    if (a < 0 || a >= 120) { continue; }
                    ctx.globalAlpha = a < 40 ? 0.375 : (a < 80 ? 0.25 : 0.125);
                    ctx.fillStyle = a < 40 ? P.fire[0] : (a < 80 ? P.fire[1] : P.fire[2]);
                    ctx.fillRect((tx + dx) * T, (ty + dy) * T, T, T);
                }
            }
            ctx.globalAlpha = 1;
        }});

        // shockwave ring, kept inside the blast square
        this._add({life: 330, render: function(ctx, age) {
            var t = age / 330;
            var r = 5 + (side * 0.62) * (1 - Math.pow(1 - t, 2));
            var th = t < 0.4 ? 3 : (t < 0.75 ? 2 : 1);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x0, y0, side, side);
            ctx.clip();
            self._ring(ctx, cx, cy, r, r - th, t < 0.35 ? P.fire[0] : (t < 0.7 ? P.fire[1] : P.fire[2]));
            if (t < 0.6) { self._ring(ctx, cx, cy, r - th, r - th - 1, P.fire[2]); }
            ctx.restore();
        }});

        // fireball: overlapping discs (a pixel "cauliflower") that bloom and cool
        var blobs = [{x: 0, y: 0, r: 1}];
        for (var b = 0; b < 6; b++) {
            var ang = b * Math.PI / 3 + this._rand(-0.4, 0.4);
            var dist = this._rand(5, 8);
            blobs.push({x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, r: this._rand(0.5, 0.7)});
        }
        var FB = 560;
        this._add({life: FB, render: function(ctx, age) {
            var grow = Math.min(1, age / 150);
            grow = 1 - Math.pow(1 - grow, 3);
            var shrink = age < 300 ? 1 : 1 - (age - 300) / (FB - 300);
            var R = 13 * grow * shrink + (age < 300 ? 0 : 2 * (1 - shrink)); // shrinks to a smoky core
            var heat = Math.max(0, 1 - age / FB);
            var lift = Math.round(age / FB * 4); // hot gas rises a little
            var layers = [
                {k: 1.0, col: P.fire[4]},
                {k: 0.86, col: P.fire[3]},
                {k: 0.66 * (0.5 + 0.5 * heat), col: P.fire[2]},
                {k: 0.46 * heat, col: P.fire[1]},
                {k: 0.26 * heat * heat, col: P.fire[0]}
            ];
            if (age > 380) { layers[0].col = P.smoke[3]; layers[1].col = P.fire[4]; }
            for (var L = 0; L < layers.length; L++) {
                for (var i = 0; i < blobs.length; i++) {
                    var bl = blobs[i];
                    var br = R * bl.r * layers[L].k;
                    self._disc(ctx, cx + bl.x * grow, cy + bl.y * grow - lift, br, layers[L].col);
                }
            }
        }});

        // embers
        var n = this._count(36);
        for (var e = 0; e < n; e++) {
            var a = Math.random() * Math.PI * 2, s = this._rand(50, 150);
            this._addParticle({x: cx + this._rand(-3, 3), y: cy + this._rand(-3, 3),
                vx: Math.cos(a) * s, vy: Math.sin(a) * s, ay: 40, drag: 2.2,
                life: this._rand(350, 800), size: Math.random() < 0.3 ? 2 : 1, colors: P.fire,
                delay: this._rand(0, 60)});
        }
        // debris chunks
        for (var d = 0; d < this._count(10); d++) {
            var da = Math.random() * Math.PI * 2, ds = this._rand(60, 110);
            this._addParticle({x: cx, y: cy, vx: Math.cos(da) * ds, vy: Math.sin(da) * ds - 40, ay: 160,
                drag: 1.2, life: this._rand(400, 620), size: 2, colors: ['#6b5a4a', '#3e3530', '#2a2228']});
        }
        // smoke puffs that linger and fade
        for (var sm = 0; sm < this._count(11); sm++) {
            var sa = Math.random() * Math.PI * 2, sr = this._rand(2, 22);
            this._addParticle({x: cx + Math.cos(sa) * sr, y: cy + Math.sin(sa) * sr,
                delay: this._rand(160, 300), vx: Math.cos(sa) * 8, vy: -this._rand(6, 12),
                life: this._rand(420, 580), shape: 'disc', r: this._rand(1.5, 2.5), grow: 2,
                alpha: 0.8, colors: P.smoke.slice(1), noBlink: true, under: true});
        }
        this.kick();
    },

    // Healing: rising red/green sparkles and "+N".
    heal: function(being, amount) {
        if (!this.ctx || !being || !this._visible(being._x, being._y)) { return; }
        var ox = being._x * this.T, oy = being._y * this.T;
        for (var i = 0; i < this._count(12); i++) {
            var col = this.PAL.heal[i % 2];
            this._addParticle({x: ox + this._rand(2, 14), y: oy + this._rand(7, 15),
                vy: -this._rand(12, 26), vx: this._rand(-3, 3), life: this._rand(450, 800),
                delay: this._rand(0, 200), shape: i % 3 === 0 ? 'plus' : 'sq',
                color: col, core: this.PAL.white});
        }
        if (amount > 0) { this.number(being._x, being._y, '+' + amount, this.PAL.heal[1]); }
        this.kick();
    },

    // Heart pickup: a heart that pulses up in size and floats away.
    heartPulse: function(being) {
        if (!this.ctx || !being || !this._visible(being._x, being._y)) { return; }
        var c = this._tileCenter(being._x, being._y);
        var self = this, H = this.HEART;
        this._add({life: 650, clip: false, render: function(ctx, age) {
            var t = age / 650;
            var scale = t < 0.15 ? 1 : (t < 0.3 ? 2 : (t < 0.45 ? 3 : 2));
            if (t > 0.75 && Math.floor(age / 50) % 2 === 1) { return; }
            var w = 7 * scale, h = 6 * scale;
            var x = Math.round(c[0] - w / 2), y = Math.round(c[1] - h / 2 - 10 * t - 2);
            for (var pass = 0; pass < 2; pass++) {
                for (var row = 0; row < 6; row++) {
                    for (var col = 0; col < 7; col++) {
                        if (H[row][col] !== '1') { continue; }
                        if (pass === 0) {
                            ctx.fillStyle = self.PAL.outline;
                            ctx.fillRect(x + col * scale - 1, y + row * scale - 1, scale + 2, scale + 2);
                        } else {
                            ctx.fillStyle = (row === 1 && col === 1) ? self.PAL.white : self.PAL.heal[0];
                            ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
                        }
                    }
                }
            }
        }});
        for (var i = 0; i < this._count(8); i++) {
            var a = Math.random() * Math.PI * 2, s = this._rand(25, 50);
            this._addParticle({x: c[0], y: c[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3,
                life: this._rand(300, 500), shape: i % 2 ? 'plus' : 'sq', color: this.PAL.heal[0], core: this.PAL.white});
        }
        this.kick();
    },

    // Key and coin pickup: a gold sparkle burst.
    goldBurst: function(x, y, big) {
        if (!this.ctx || !this._visible(x, y)) { return; }
        var c = this._tileCenter(x, y), self = this, P = this.PAL;
        var n = this._count(big ? 18 : 12);
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2 + this._rand(-0.2, 0.2), s = this._rand(30, big ? 90 : 65);
            this._addParticle({x: c[0], y: c[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3.5,
                life: this._rand(300, 520), shape: i % 3 === 0 ? 'plus' : 'sq',
                colors: [P.white, P.gold[0], P.gold[1]], core: P.white});
        }
        this._add({life: 160, render: function(ctx, age) {
            var len = age < 80 ? 6 : 3;
            ctx.fillStyle = age < 80 ? P.white : P.gold[0];
            ctx.fillRect(c[0] - len, c[1], len * 2 + 1, 1);
            ctx.fillRect(c[0], c[1] - len, 1, len * 2 + 1);
            ctx.fillStyle = P.gold[1];
            ctx.fillRect(c[0] - 1, c[1] - 1, 1, 1); ctx.fillRect(c[0] + 1, c[1] + 1, 1, 1);
            ctx.fillRect(c[0] + 1, c[1] - 1, 1, 1); ctx.fillRect(c[0] - 1, c[1] + 1, 1, 1);
        }});
    },

    // Belt: a brief gold glow around the sprite.
    glow: function(being) {
        if (!this.ctx || !being || !this._visible(being._x, being._y)) { return; }
        var self = this, sprite = being._sprite;
        this._add({life: 480, render: function(ctx, age) {
            var info = self._spriteInfo(sprite);
            if (!info || Math.floor(age / 80) % 2 === 1 && age > 240) { return; }
            var ox = being._x * self.T, oy = being._y * self.T;
            ctx.fillStyle = age < 160 ? self.PAL.gold[0] : self.PAL.gold[1];
            for (var i = 0; i < info.outline.length; i++) {
                ctx.fillRect(ox + info.outline[i].x, oy + info.outline[i].y, 1, 1);
            }
        }});
        var ox = being._x * this.T, oy = being._y * this.T;
        for (var i = 0; i < this._count(6); i++) {
            this._addParticle({x: ox + this._rand(1, 15), y: oy + this._rand(2, 14), vy: -this._rand(8, 16),
                life: this._rand(300, 500), delay: this._rand(0, 150), shape: 'plus',
                color: this.PAL.gold[0], core: this.PAL.white});
        }
        this.kick();
    },

    // Summoning ring: a sparkly ring burst where the unicorn appears. The ring
    // follows the unicorn, which may step away on its first turn.
    summon: function(being) {
        if (!this.ctx || !being || !this._visible(being._x, being._y)) { return; }
        var c = this._tileCenter(being._x, being._y), self = this, P = this.PAL;
        this._add({life: 420, render: function(ctx, age) {
            var c = self._tileCenter(being._x, being._y);
            var t = age / 420;
            var r = 2 + 13 * (1 - Math.pow(1 - t, 2));
            if (t > 0.7 && Math.floor(age / 50) % 2 === 1) { return; }
            self._ring(ctx, c[0], c[1], r, r - (t < 0.5 ? 2 : 1), t < 0.4 ? P.white : P.stone[1]);
            // a column of light for the first moments
            if (age < 160) {
                var top = Math.round(c[1] - 16 + age / 160 * 10);
                ctx.fillStyle = P.stone[1];
                ctx.fillRect(c[0] - 1, top, 3, c[1] + 6 - top);
                ctx.fillStyle = P.white;
                ctx.fillRect(c[0], top, 1, c[1] + 6 - top);
            }
        }});
        var n = this._count(16);
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2, s = this._rand(35, 60);
            this._addParticle({x: c[0], y: c[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, drag: 2.5,
                life: this._rand(380, 620), shape: i % 2 ? 'plus' : 'sq',
                colors: [P.white, P.stone[1], P.gold[0]], core: P.white, delay: this._rand(0, 80)});
        }
    },

    // Scroll of revelation: a soft wave sweeping over the explored map.
    reveal: function(x, y) {
        if (!this.ctx || !Game.currentLevel) { return; }
        var lvl = Game.currentLevel, T = this.T;
        var path = new Path2D();
        for (var mx = 0; mx < lvl.MAP_WIDTH; mx++) {
            for (var my = 0; my < lvl.MAP_HEIGHT; my++) {
                if (lvl.map[mx][my] && lvl.map[mx][my].explored) { path.rect(mx * T, my * T, T, T); }
            }
        }
        var c = this._tileCenter(x, y), self = this, P = this.PAL;
        var maxR = Math.sqrt(Math.pow(Math.max(c[0], this.canvas.width - c[0]), 2) +
            Math.pow(Math.max(c[1], this.canvas.height - c[1]), 2)) + 12;
        var life = 1000;
        this._add({life: life, clip: false, render: function(ctx, age) {
            var r = maxR * (age / life);
            ctx.save();
            ctx.clip(path);
            ctx.globalAlpha = 0.75;
            self._ring(ctx, c[0], c[1], r, r - 3, P.stone[1]);
            ctx.globalAlpha = 0.35;
            self._ring(ctx, c[0], c[1], r - 3, r - 9, P.stone[0]);
            ctx.globalAlpha = 0.15;
            self._ring(ctx, c[0], c[1], r - 9, r - 18, P.stone[0]);
            ctx.restore();
            ctx.globalAlpha = 1;
        }});
    },

    // Third key: the exit gate gives a gold flash that fades (if in view).
    exitUnlocked: function() {
        var lvl = Game.currentLevel;
        if (!this.ctx || !lvl) { return; }
        for (var x = 0; x < lvl.MAP_WIDTH; x++) {
            for (var y = 0; y < lvl.MAP_HEIGHT; y++) {
                var item = lvl.map[x][y] && lvl.map[x][y].item;
                if (!item || !(typeof Exit !== 'undefined' && item instanceof Exit)) { continue; }
                if (!this._visible(x, y)) { continue; }
                var self = this, T = this.T, gx = x, gy = y;
                this._add({life: 420, delay: 120, render: function(ctx, age) {
                    ctx.globalAlpha = self._stepAlpha(0.6 * (1 - age / 420));
                    ctx.fillStyle = self.PAL.gold[0];
                    ctx.fillRect(gx * T, gy * T, T, T);
                    ctx.globalAlpha = 1;
                }});
                this.goldBurst(gx, gy, true);
            }
        }
    },

    // Level change: fade in from black.
    fade: function() {
        if (!this.ctx) { return; }
        var self = this;
        this._add({life: 380, clip: false, render: function(ctx, age) {
            ctx.globalAlpha = self._stepAlpha(1 - age / 380);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);
            ctx.globalAlpha = 1;
        }});
    },

    // Called from Being._moveTo for the player while the speed potion is active.
    playerMoved: function(fromX, fromY, toX, toY) {
        this._moveDir = [Math.sign(toX - fromX), Math.sign(toY - fromY)];
        var p = Game.player;
        if (!this.ctx || !p || !p._isFast) { return; }
        if (Math.abs(toX - fromX) > 1 || Math.abs(toY - fromY) > 1) { return; } // teleport
        var now = this._now(), T = this.T;
        // a far ghost on the old tile and a nearer one half a tile behind
        this.afterimages.push({px: fromX * T, py: fromY * T, start: now, life: 220, alpha: 0.5, color: this.PAL.speed[1]});
        this.afterimages.push({px: Math.round((fromX + toX) / 2 * T), py: Math.round((fromY + toY) / 2 * T),
            start: now, life: 160, alpha: 0.75, color: this.PAL.speed[0]});
        if (this.afterimages.length > 4) { this.afterimages.splice(0, this.afterimages.length - 4); }
        this.kick();
    }
};
