// Sound effects (Web Audio). The clips live in audio/sfx/<id>.mp3 and
// audio/sfx/levels.json gives each id a gain (0..1) for equal perceived
// loudness; see docs/art/classes/sfx.md.
//
// Clips are fetched and decoded once at load (on an OfflineAudioContext, so
// no audio device is opened before the player does anything). The real
// AudioContext is created and resumed on the first key press, click or touch
// (browser autoplay policy). Each play is a new BufferSource -> GainNode
// (clip gain x master x per-call volume) -> destination, so sounds overlap.
//
// Usage: Sfx.play(id[, {volume, delay, minInterval}]) and
// Sfx.playAt(id, x, y[, opts]) for events on the map (silent unless the tile
// is in the player's field of view). Missing or undecodable files are skipped
// silently (one console.warn at most).
var Sfx = {
    IDS: [
        "player.step", "player.attack", "hit.enemy", "hit.player", "enemy.death",
        "bomb.explode", "pickup.coin", "pickup.key", "pickup.item", "item.potion",
        "item.eat", "powerup.heart", "powerup.belt", "status.stoneskin",
        "status.speed", "status.expire", "summon.unicorn", "scroll.reveal",
        "exit.locked", "exit.open", "level.complete", "game.over", "game.win",
        "ui.denied", "unicorn.attack", "frog.croak", "zombie.groan", "ghost.wail",
        "troll.roar", "imp.teleport"
    ],
    BASE_PATH: "audio/sfx/",
    STORAGE_KEY: "vibeCrawlerSfx",

    // Master volume. levels.json brings most clips to about -20 LUFS (max
    // momentary); x0.8 (-2 dB) puts them near -22, a few dB above the music,
    // which plays at volume 0.3 (about -23 to -30 LUFS).
    master: 0.8,
    enabled: true,

    // Minimum time between two plays of the same id (ms). Collapses repeats in
    // one frame (a bomb killing several enemies) and key-repeat spam.
    MIN_INTERVAL: 50,
    MIN_INTERVAL_BY_ID: {
        "player.step": 80,
        "ui.denied": 150
    },

    _ctx: null,
    _buffers: {},
    _gains: {},
    _lastPlayed: {},
    _warned: false,
    _decoded: 0,
    _failed: 0,

    init: function() {
        try {
            this.enabled = window.localStorage.getItem(this.STORAGE_KEY) !== "off";
        } catch (e) { /* storage blocked: keep the default (on) */ }

        var self = this;
        var unlock = function() { self._unlock(); };
        this._unlockHandler = unlock;
        ["keydown", "pointerdown", "touchstart"].forEach(function(type) {
            window.addEventListener(type, unlock, true);
        });

        this._load();
    },

    _warn: function(msg) {
        if (this._warned) { return; }
        this._warned = true;
        console.warn("Sfx: " + msg + " (sound effects that failed to load stay silent)");
    },

    _load: function() {
        var self = this;
        var Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!Offline || !window.fetch) {
            this._warn("Web Audio is not available");
            return;
        }
        var decoder;
        try {
            decoder = new Offline(2, 1, 44100);
        } catch (e) {
            this._warn("cannot create an audio decoder");
            return;
        }

        fetch(this.BASE_PATH + "levels.json").then(function(r) {
            if (!r.ok) { throw new Error(r.status); }
            return r.json();
        }).then(function(levels) {
            self._gains = levels || {};
        }).catch(function() {
            self._warn("levels.json missing");
        });

        this.IDS.forEach(function(id) {
            fetch(self.BASE_PATH + id + ".mp3").then(function(r) {
                if (!r.ok) { throw new Error(r.status); }
                return r.arrayBuffer();
            }).then(function(data) {
                return new Promise(function(resolve, reject) {
                    // Callback form as well as the promise, for older Safari
                    var p = decoder.decodeAudioData(data, resolve, reject);
                    if (p && p.catch) { p.catch(reject); }
                });
            }).then(function(buffer) {
                self._buffers[id] = buffer;
                self._decoded++;
            }).catch(function() {
                self._failed++;
                self._warn("could not load " + id + ".mp3");
            });
        });
    },

    // Create/resume the playback context on a user gesture.
    _unlock: function() {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) { return; }
        try {
            if (!this._ctx) {
                this._ctx = new Ctx();
            }
            if (this._ctx.state === "suspended") {
                var p = this._ctx.resume();
                if (p && p.catch) { p.catch(function() {}); }
            }
        } catch (e) {
            return;
        }
        if (this._ctx.state === "running" && this._unlockHandler) {
            var unlock = this._unlockHandler;
            ["keydown", "pointerdown", "touchstart"].forEach(function(type) {
                window.removeEventListener(type, unlock, true);
            });
            this._unlockHandler = null;
        }
    },

    // Play a clip. opts: volume (0..1 multiplier), delay (seconds),
    // minInterval (ms, overrides the per-id rate limit).
    // Returns true when the play was accepted (enabled and not rate-limited),
    // whether or not the clip is loaded and the audio device is unlocked yet.
    play: function(id, opts) {
        if (!this.enabled) { return false; }
        opts = opts || {};

        var now = Date.now();
        var minInterval = opts.minInterval !== undefined ? opts.minInterval
            : (this.MIN_INTERVAL_BY_ID[id] !== undefined ? this.MIN_INTERVAL_BY_ID[id] : this.MIN_INTERVAL);
        var last = this._lastPlayed[id];
        if (last !== undefined && now - last < minInterval) { return false; }
        this._lastPlayed[id] = now;

        var ctx = this._ctx;
        var buffer = this._buffers[id];
        // Never queue sounds on a suspended context: they would all burst out at once
        if (!ctx || ctx.state !== "running" || !buffer) { return true; }

        try {
            var gain = this._gains[id] !== undefined ? this._gains[id] : 0.5;
            var volume = opts.volume !== undefined ? opts.volume : 1;
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            var gainNode = ctx.createGain();
            gainNode.gain.value = gain * this.master * volume;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(ctx.currentTime + (opts.delay || 0));
        } catch (e) {
            this._warn("playback failed for " + id);
        }
        return true;
    },

    // Play a clip for an event at map tile (x, y), only if the player can see it.
    playAt: function(id, x, y, opts) {
        if (!this.canSee(x, y)) { return false; }
        return this.play(id, opts);
    },

    canSee: function(x, y) {
        var level = window.Game && Game.currentLevel;
        return !!(level && level.visibleCells && level.visibleCells[x + "," + y]);
    },

    setEnabled: function(on) {
        this.enabled = !!on;
        try {
            window.localStorage.setItem(this.STORAGE_KEY, this.enabled ? "on" : "off");
        } catch (e) { /* storage blocked: the choice lasts for this page only */ }
    },

    decodedCount: function() { return this._decoded; },

    // Wire the "Sound ON/OFF" button (same label pattern as the music button)
    bindToggle: function(button) {
        if (!button) { return; }
        var self = this;
        var label = function() {
            button.innerHTML = self.enabled ? "Sound <b><u>ON</u></b>/OFF" : "Sound ON/<b><u>OFF</u></b>";
        };
        label();
        button.addEventListener("click", function() {
            self.setEnabled(!self.enabled);
            label();
        });
    }
};

Sfx.init();
