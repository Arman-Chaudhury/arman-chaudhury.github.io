# curvefolio

A WebGL portfolio rebuilt from the interaction design of Jesper Landberg's Awwwards Site of the Day (Sept 29, 2026), with original code and my own projects as content.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

## What's in it

| Effect | How |
| --- | --- |
| Infinite strip on a 3D "sheet" | Cards are subdivided planes; `sheet()` in `src/gl/shaders.js` bends them into an S-curve that deepens, banks and rears up with scroll speed (`tanh` velocity, signed square). |
| Input | Wheel with mouse-notch detection and smoothing, trackpad pass-through, drag/swipe with fling, arrow/page keys. Soft leash keeps the target within one viewport of the actual position. |
| Card lighting | Depth shading along the sheet plus Blinn-Phong from analytic slopes; hover presses a dome-shaped dent into the card. |
| Reflective floor | Grid floor with a mirrored-camera reflection pass at 15% resolution, visible only on the grid lines. |
| Cursor | A diffusing, decaying height field (256px ping-pong) painted only by fast motion; its gradient dents and shades the image. Fades near readable text. |
| Profile | A gravitational-lens black hole (inverse lens equation, wobbling rim, RGB split, frame dragging) opens behind the bio. |
| Project view | The clicked card flies to fill the screen, flattens and washes to white, then becomes the DOM panel. Reverses on close. |
| Full index | Text list with line reveals; rows open the same panel. |

`src/gl/sheet.js` is a JS twin of the GLSL sheet so DOM titles and hit-testing sit exactly on the bent cards. Keep the two in sync.

## Differences from the original

- Text is DOM, not GPU vector glyphs.
- Font is Inter Tight instead of the commercial ABC Diatype.
- Covers are procedurally drawn mock screenshots (`src/covers.js`); swap in real screenshots by returning an image/canvas from `drawCover`.
- Phones keep the horizontal strip instead of switching to a vertical list.
- No page-wipe transition or easter eggs.

Content lives in `src/data.js`.
