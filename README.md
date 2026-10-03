# Blue Room — interactive 3D portfolio prototype

A coded room experience based on the supplied blue-room reference. The supplied `3_d_room.glb` loads by default. Its camera, colors, lighting and computer interaction are implemented in `dist/studio.js`; the interface is in `dist/index.html` and `dist/style.css`. Set `ROOM_MODEL_URL = ''` to return to the sample room built in code.

The supplied GLB has 61 meshes but contains **no material or texture data**. The site gives its named parts a temporary blue palette. To reproduce the exact Spline colors, export a GLB with materials and embedded textures, or recolor its parts in a 3D editor.

## Run locally

From the project folder, use any local static server, for example:

```sh
python -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`. Opening `index.html` directly as a file may block JavaScript module imports.

For automatic live refreshing, open the folder in VS Code, install Microsoft's **Live Preview** extension, then right-click `dist/index.html` and choose **Show Preview**. Keep it beside the code as you edit. The 3D scene restarts when you change its JavaScript.

## Adjust the camera visually in VS Code

1. Open `dist/index.html` using Live Preview. Click inside the preview and press **Shift+C**. You can also add `&cameraDebug=1` to an existing Live Preview URL that already contains `?vscode-livepreview=true` (or `?cameraDebug=1` when there is no other query parameter).
2. Select **มุมห้อง** for the opening view or **มุมจอคอม** for the view after clicking the monitor. Drag the 3D view to orbit, hold **Shift** while dragging to pan, and use the mouse wheel to zoom. You can enter exact X/Y/Z values in the panel.
3. Click **คัดลอกค่ากล้องทั้งสองมุม**. In `dist/studio.js`, replace the four existing `const roomPosition`, `const roomTarget`, `const focusPosition`, and `const focusTarget` lines near the beginning with the copied lines. Save, then let Live Preview reload. The experiment itself resets on refresh until you paste these values into the code.

This editor is hidden from the ordinary website view unless opened with Shift+C or the `cameraDebug=1` parameter. If you already changed camera values in your local `studio.js`, keep a copy of those four lines before replacing files with a newer ZIP.

## Edit the prototype

- Change room and furniture colors near the `mat(...)` definitions and object creation in `dist/studio.js`.
- The wall's three illustrated cards are drawn in `artTexture`. The website mockup on the monitor is drawn in `screenGrad`. They are sample artwork and can be replaced with your own real project visuals later.
- Change camera angles in `roomPosition`, `roomTarget`, `focusPosition`, and `focusTarget`.
- Replace the three example entries in the `projects` array with your own real work.
- Change visible text and layout in `dist/index.html` and `dist/style.css`.

## Add pictures or videos to the computer screen

The close-up project view has a selectable list on the left, a picture/video preview in the center, project information on the right, and next/previous controls. Edit the `projects` array near the bottom of `dist/studio.js`. Put your real media in `dist/media/` (create this folder if needed), then use a relative path:

```js
{
  category: 'WEB DESIGN',
  title: 'My Project',
  subtitle: 'Website',
  tags: ['Web', 'UI/UX'],
  description: 'คำอธิบายสั้น ๆ ของผลงาน',
  media: { type: 'image', src: './media/my-project.jpg' },
  thumbnail: './media/my-project.jpg',
}
```

For a video, change `media` to `{ type: 'video', src: './media/my-project.mp4', poster: './media/my-project.jpg' }`. Keep `thumbnail` pointed to an image. Videos start muted so they can autoplay; the visitor can pause or enable sound with the buttons beside the monitor. When the named GLB computer screen loads, a picture or video surface is placed directly on the 3D monitor and the large HTML preview is hidden. If the model does not contain a recognized display mesh, the HTML preview remains as a fallback. The bundled three projects are sample artwork only. Save the file and refresh your local Chrome preview to see your edits.

The local `dist/vendor` folder contains Three.js and its license. Keep its license when redistributing the project.

## Add your 3D model

1. Export your furniture piece or complete room as a `.glb`. GLB can package image textures in one file.
2. Put it at `dist/models/room.glb`.
3. At the top of `dist/studio.js`, change `const ROOM_MODEL_URL = ''` to `const ROOM_MODEL_URL = './models/room.glb'`.
4. Preview `dist/index.html` through Live Preview. If loading fails, the existing sample room remains visible and the browser console shows an error.

The controls for your GLB are together at the top of `dist/studio.js`:

| Setting | What to choose |
| --- | --- |
| `MODEL_MODE = 'object'` | Individual desk, monitor, chair, etc. Keep the sample room. Set `'room'` only when your GLB contains the **whole room**, which replaces the sample meshes. |
| `MODEL_ROTATION_Y = -Math.PI / 2` | The supplied room opens toward the camera at this rotation. For a different asset try `0`, `Math.PI / 2`, or `Math.PI`. |
| `MODEL_ROOM_OFFSET_X = 2.8` | Shift the supplied whole room to keep the monitor clear of the headline. |
| `MODEL_OBJECT_MAX_SIZE = 2.8` | Largest size of a single furniture asset after import, in room units. Increase a little if it looks too small. |
| `MODEL_OBJECT_POSITION = new THREE.Vector3(3.25, 0, -1.55)` | Position of a single asset (x: left/right, y: up/down, z: front/back). The bottom of its bounding box starts at floor height before this offset. |
| `MODEL_REPLACES_DESK = true` | Hide the sample desk and monitor when the imported asset contains its own desk/monitor. Set `false` when placing a chair or accessory elsewhere. |

The supplied scene's computer is named `Monitor`, so it is clickable. For another GLB, name its computer group `MonitorScreen` or `Monitor` and set `MONITOR_MESH_NAME` to match. If there is no named screen, **View Work** still opens the project UI while the screen click hint is hidden. A different monitor orientation may need the focus normal in the loader adjusted.

## Board and plant camera views (October 2026)

Copy `index.html`, `studio.js`, and `style.css` from this patch into your existing `dist/` folder, replacing those three files. Keep your existing `vendor/`, `models/`, `fonts/`, `media/`, and loading files. Open the page through Live Preview or a local server, then refresh with Ctrl+F5.

- Click the board or **About** to zoom straight toward the board.
- Click the plant or **Contact** to zoom toward the plant, with the plant on the right on desktop.
- **Work** still opens the computer's project view.
- Use **BACK TO ROOM** or **Escape** to return to the room.
- Press **Shift+C** to open the camera editor. It now has four tabs: room, monitor, board, plant.

The board and plant views are fitted from the actual GLB object bounds and viewport size. Object names are `Board` (fallback: `BlackBoard screen`) and `Plant`.

To save a custom angle, copy the camera code from the editor. Replace the eight existing camera vector declarations near the top of `studio.js` with the copied vector values, and replace the existing `AUTO_FIT_OBJECT_VIEWS` declaration with `const AUTO_FIT_OBJECT_VIEWS = false`. Do not paste duplicate `const` declarations. This disables automatic fitting so the loader and resize do not overwrite your saved board/plant angles. The editor remains adjustable after doing this.

This update adds camera navigation only. Add your About/Contact content separately.
