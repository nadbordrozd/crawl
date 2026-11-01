# Sound effects asset contract

Status: first set generated 2026-11-01 (crawl-yia.1). The orchestrator chose
the style from the user's request; the user can overrule it.

## Inventory

30 clips in `audio/sfx/<id>.mp3`. `audio/sfx/prompts.json` lists them (prompt,
duration, influence, output), `records.json` holds the requests,
`verdicts.json` the verdicts, and `levels.json` the suggested playback gain
for each id. The format is ElevenLabs `mp3_44100_128`, stereo, about 570 KB in
total.

| id | use | duration s |
|---|---|---|
| player.step | each player move (plays a lot, must be subtle) | 0.48 |
| player.attack | player swings | 0.48 |
| hit.enemy | player hits an enemy | 0.48 |
| hit.player | player takes damage | 0.60 |
| enemy.death | enemy dies (poof) | 0.80 |
| bomb.explode | bomb explodes | 1.76 |
| pickup.coin / pickup.key / pickup.item | pickups | 0.48 / 0.80 / 0.48 |
| item.potion / item.eat | drink a potion / eat food | 1.20 / 0.80 |
| powerup.heart / powerup.belt | max-health heart / belt slot | 1.00 / 1.00 |
| status.stoneskin / status.speed / status.expire | buffs start or wear off | 1.20 / 0.80 / 0.80 |
| summon.unicorn / unicorn.attack | unicorn appears / zaps | 1.48 / 0.68 |
| scroll.reveal | map scroll read | 1.48 |
| exit.locked / exit.open | exit refuses / opens | 0.60 / 1.48 |
| level.complete / game.over / game.win | stingers | 2.00 / 2.00 / 3.00 |
| ui.denied | bumping into a wall, empty slot | 0.48 |
| frog.croak, zombie.groan, ghost.wail, troll.roar, imp.teleport | creature cues, used sparingly | 0.48-0.88 |

## Style

Short, punchy, cute retro fantasy (in the manner of a modern pixel-art indie
game): crunchy but clean, a light 8/16-bit flavour, not harsh square-wave
chiptune, not realistic, no music beds, no voices, a tight start and a quick
tail.

These prompt words worked: name the event first ("A quick short sword swish"),
then `cute retro fantasy pixel-art video game sound effect, clean, light
16-bit flavour, no music, no voice`. For things that should not speak, use
`no words` or `like a cartoon oof without a voice`. For creatures, `cartoony
... not scary` or `goofy`. For the unicorn, `wobbly synth neigh made of warm
synth tones, no realistic animal`. For a fade, `fade out completely to
silence`. For two-part sounds, use `then` ("glug glug ... then a bright
sparkling shimmer"). Prompt influence was 0.5 for most clips and 0.55-0.6 for
tiny tonal ones.

These did not work: `soft`, `very quiet` or `subtle` made takes inaudible
(-42 to -67 LUFS-M), so ask for `clear close-up` and set the level at
playback instead. `clean mix with headroom, not distorted, not clipped` did
stop the brick-walled explosions; the first explosion takes had 110-136
flat-top runs. Loudness varies by 20-30 dB between takes of the same prompt,
so plan 2 takes and expect to re-roll the quiet ones.

## Loudness targets and levels.json

The tool copies accepted takes byte for byte (it has no trim or normalise
step), so the gain is applied at playback. `levels.json` maps each id to a
gain from 0 to 1 that brings its maximum momentary loudness (EBU R128 M,
400 ms window) to its target:

- Most effects and stingers: -20 LUFS-M.
- bomb.explode: -17 (the biggest moment).
- ui.denied, status.expire, imp.teleport: -24.
- Creature cues (frog, zombie, ghost, troll): -26.
- player.step: -30.

The gain is `min(1, 10^((target - M_max) / 20))`. For reference, the music
tracks measure -12.5 to -20 LUFS integrated, so at volume 0.3 they play at
about -23 to -30 LUFS, and effects at -20 sit 3-10 dB above them. Five clips
are below their target even at gain 1: player.step (-3 dB), pickup.coin
(-3.5), item.potion (-2), powerup.belt (-1.3) and exit.locked (-1.5). That is
acceptable for a bright clink or a subtle step. A few takes have small
inter-sample overs (true peak up to +1.1 dBTP, for example item.eat). They
decode as floats and are attenuated by their gain below 1, so they do not
clip.

## Measurement method (nothing is ever played)

- Duration: `ffprobe -show_entries format=duration`.
- Loudness and true peak: `ffmpeg -i f -af ebur128=peak=true -f null -`,
  reading I (integrated), the largest M (momentary) and the true peak.
- Sample peak: `ffmpeg -i f -af volumedetect -f null -` (max_volume, plus
  histogram_0db as a limiting indicator).
- Clipping: decode to f32 at the native rate and count flat-top runs (3 or
  more consecutive samples at |x| >= 0.98) and overs (|x| > 1).
- Leading and trailing silence: the first and last sample above -40 dBFS.
- Shape: 50 ms RMS envelope and per-frame FFT peak frequency and centroid.
  These check "rising", "descending", "fades out", "glug then shimmer" and
  cut-off endings (still at full level in the last frame).
- Stereo: L/R correlation (ui.denied#1 was rejected at -0.93: it cancels in
  mono).

Rejection rules: lead over 30 ms (powerup.belt#3 at 131 ms); flat-top
clipping; still at full level when the file ends; wrong pitch direction or a
missing part; inaudible (more than 6 dB under target at gain 1) when a
louder clean take exists; phase-inverted stereo.

## Recipe notes

- Run from a worktree with `STUDIO_RAW_DIR=~/.studio-raw/crawl` so raw takes
  land in the repository's raw folder, not one named after the worktree.
- To re-roll, raise `takes` and edit the prompt in place: the new indices are
  generated, and `records.json` keeps the exact text sent for each take.
- Cost: 80 calls, 79.2 s of audio requested. The API key has no `user_read`
  permission, so the exact credit spend could not be read. At ElevenLabs'
  published rate for sound effects with a set duration (about 40 credits per
  second), that is roughly 3,200 credits.
