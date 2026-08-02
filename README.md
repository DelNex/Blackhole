# Black Hole — Scroll-Driven Three.js Experience

A scroll-controlled 3D visualization of a black hole with an accretion disk, built with **Three.js**. As the user scrolls, the scene progresses through three narrative chapters — from a calm orbiting view, through turbulent instability, into a full relativistic collapse toward the singularity.

---

## Features

- **15,000-instance GPU-instanced accretion disk** — tapered "streak" particles (thick head, thin tail) that orbit the black hole using a Kepler-like `1/√r` velocity model (closer particles orbit faster).
- **Custom GLSL shaders** for the disk (orbit motion, turbulence, color grading, fake Doppler brightening) and for the core's glowing rim/aura (Fresnel-style edge light).
- **Simplex 3D noise** (Ashima Arts implementation) driving disk surface turbulence.
- **Scroll-driven camera & story engine** — camera position, disk compression, orbital speed, brightness, and color all interpolate based on scroll progress.
- **Free orbit camera** (via `OrbitControls`) while at the starting/"home" view, with damping-based drag.
- **Automatic return-to-start camera lock** — scrolling back to the top flies the camera precisely back to its original launch position before re-enabling user orbit, so the experience always resets to an identical starting state.
- **Whiteout transition** at the very end of the scroll for the collapse finale.
- **Optional debug overlay** showing scroll progress, current chapter, FPS, and live camera coordinates.

---

## How It Works

### Chapters

The experience is split into three scroll-progress ranges (0–1):

| Chapter | Scroll Range | Description |
|---|---|---|
| **Observation** | `0.0 – 0.3` | Calm accretion disk. Camera is free to orbit via drag. |
| **Instability** | `0.3 – 0.7` | Camera locks and rises to an overhead view. Disk turbulence, orbital speed, brightness, and heat all ramp up. |
| **Singularity** | `0.7 – 1.0` | Camera dives from overhead down close to the core. Disk compresses inward dramatically and goes white-hot. Screen fades to white at the very end. |

Chapter ranges are configurable in the `CHAPTERS` object.

### Camera Behavior

- While in **Observation** and fully at the home position, `OrbitControls` is enabled and the user can freely rotate around the black hole.
- Leaving Observation disables user rotation and the camera smoothly lerps between fixed waypoints (`INITIAL_CAM_POS` → `overheadCamPos` → `singularityCamPos`) as the user scrolls.
- Scrolling back up into Observation does **not** immediately hand control back to the user — the camera first flies back to the exact `INITIAL_CAM_POS`. Only once it's within `START_ARRIVE_EPSILON` (0.08 units) of that position does it snap exactly onto it and re-enable orbiting. This guarantees the "home" view always looks identical, no matter where the user scrolled from.

### Accretion Disk

Each of the 15,000 disk particles is a tapered cone (`CylinderGeometry`, top radius 0.06, bottom radius 0.008) rotated so its thick end points toward local `+Z`. In the vertex shader:

- Each instance orbits based on its distance from center (`1.5 / √r`, scaled by `uOrbitScale`).
- Simplex noise displaces particles vertically for turbulence (`uMorph`).
- Particles are oriented so the **thick head leads in the direction of motion** and the **thin tail trails behind** — this is what gives the disk its "streaking" motion-blur look.
- Color blends from dim red (outer edge) → orange → white-hot (near the event horizon), with a faint violet tint near the outer edge suggesting gravitational lensing, and a "Doppler boost" that brightens particles moving toward the camera.

### Shader Uniforms (per chapter)

| Uniform | Purpose |
|---|---|
| `uMorph` | Turbulence/noise displacement strength |
| `uCompression` | Radial compression (disk shrinking inward during collapse) |
| `uIntensity` | Overall brightness multiplier |
| `uOrbitScale` | Orbital speed multiplier |
| `uHeat` | Pushes disk color toward white-hot |

---

## Project Structure

```
├── main.js          # Scene setup, shaders, disk instancing, scroll engine, animation loop
└── index.html        # (expected) hosts #whiteout, #scroll-prompt, #debug-overlay,
                       # #main-title, #status-text, #vel-val elements referenced by main.js
```

> Note: this script expects certain DOM elements to exist on the page (see below). It will run without them, but those UI features will silently no-op.

### Required DOM Elements (optional but expected)

| ID | Purpose |
|---|---|
| `#whiteout` | Full-screen overlay that fades to white during the Singularity finale |
| `#scroll-prompt` | "Scroll to explore" prompt, fades out as the user starts scrolling |
| `#debug-overlay` | Debug text panel (only shown if `DEBUG_SCROLL = true`) |
| `#main-title` | Chapter title text |
| `#status-text` | Chapter status/topology label |
| `#vel-val` | Displayed velocity readout (e.g. "0.45c") |

---

## Setup

1. Install Three.js (this uses the `three/addons/controls/OrbitControls.js` import path, so a recent version of `three` is required):
   ```bash
   npm install three
   ```
2. Make sure your page has a scrollable height taller than the viewport (the scroll listener maps `window.scrollY` against `document.documentElement.scrollHeight - window.innerHeight`).
3. Import and it will auto-start (`animate()` is called at the bottom of the file).

---

## Configuration Quick Reference

- **Chapter boundaries** -> edit `CHAPTERS`
- **Number of disk particles** -> `instanceCount`
- **Camera waypoints** -> `INITIAL_CAM_POS`, `overheadCamPos`, `singularityCamPos`
- **Return-to-start snap distance** -> `START_ARRIVE_EPSILON`
- **Debug overlay** -> toggle `DEBUG_SCROLL`
- **Color palette** -> `outer` / `warm` / `hot` / `lensColor` vectors inside the disk vertex shader

---

## Known Issues / Roadmap

Carried over from in-code notes:

- **Feathering/waving effect removed** — an earlier attempt at making the disk edge look like it's being "swallowed" near the event horizon caused instability and was pulled out. Re-adding it is a planned future pass; suspected root cause was the angular (`atan`/orbit) math needing a different formula, possibly combined with caching each particle's initial position so a correction step can re-align them if the effect destabilizes things.
- **Hardcoded camera positions** — works, but is fragile/brittle if the scene geometry changes; a more robust (non-hardcoded) approach may be worth revisiting.
- **Mobile performance untested** — `renderer.setPixelRatio` is capped at 2, but 15,000 GPU instances + full-screen shaders have not yet been profiled on mobile GPUs. Expect possible frame-rate issues until tested.

---

## Credits

- Built with [Three.js](https://threejs.org/). Simplex noise implementation adapted from the Ashima Arts / Stefan Gustavson WebGL noise reference implementation.
- The random dudes on reddits talking about Three.js issues