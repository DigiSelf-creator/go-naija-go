# Tech

## Engine (A1): plain canvas + TypeScript, no Phaser

1. Size: Phaser 3 adds about 1.2 MB minified (about 340 KB gzipped) before any game code or art; our own canvas engine (loop, input, physics, draw) is a few KB.
2. That leaves almost all of the 3 MB first-load budget for art and sound, which matters on costly data.
3. Less code to parse means a faster start and smoother frames on cheap Android phones.
4. docs/prototype.html already plays the whole idea on plain canvas, so we need nothing Phaser adds (we have no physics bodies, tilemaps or scene graph needs).
5. Cost: we write our own fixed-step loop, input, collisions and sprite atlas loader, kept small and unit tested.
