// For those reading this dont mind my comments I left them out for me to debug and
// remember the staging and the issues, you might read them some are pure nonsense btw
// used gemini to redo my comments cuz you guys probably wont be able to understand some
// of it and thats it hope you gets some of the use on this three.js

// (Changes) Removed the feathering and Waving feature I added causing tons of bugs
// (Future Implementation) Add back the feathering so it looks like it gets swallowed
//  Will cause pain but what can we do. so goal rn get good at three.js to find the issue
//  intial speculation of the bug is the angular (atan/orbit) math wasnt working and needed to change formula
//  and hardening by adding a caching which remember the initial positioning of the
//  particles and then use the helper to make them align back if cause it some issues

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// DEVICE DETECTION
// Is mobile? Used below to pick phone-friendly performance settings.
// Combines a coarse-pointer media query (detects touch-primary hardware like
// phones/tablets without fragility) with a UA-string fallback so laptops with
// touchscreens and any weird UA also get the safe lower-quality phone cap.
const isMobile = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// CAMERA SETUP
// Comment: Dont try this again dumb ahhh hardcoding positions makes them worst

// The exact camera position the site loads with. Also the "home" position
// the camera flies back to the top, whenever the user scrolls up.
const INITIAL_CAM_POS = new THREE.Vector3(14.22610806455782, 14.758352828396987, 77.2217057949491);

// Core three.js scene graph root
// neeeded for it to render the three.js itself
const scene = new THREE.Scene();

// Perspective camera: 40 FOV, aspect matches window, near/far clip planes
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
// Start the camera at the "home" position
camera.position.copy(INITIAL_CAM_POS);

// WebGL renderer with antialiasing and also a hint to the browser to prefer the
// discrete/high-performance GPU if one is available example (laptops with 2 GPUs)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
// Cap pixel ratio so 3x/4x retina displays don't tank performance.
// Mobile GPUs struggle with the heavy per-vertex simplex noise at native
// density, so mobiles cap lower (1.5) than desktop (2). Keeps the disk crisp
// while drastically cutting fragment cost on phones.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
// Filmic tone mapping gives a more cinematic HDR-style look to the glow/bloom
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6; // brightens overall exposure under that tone mapping
document.body.appendChild(renderer.domElement); // mount the <canvas> into the page

// ORBIT CONTROLS (only active in "Observation")
// Plan: this will be a user-driven camera rotation so the goal is to set up
// a rotation control config and then connect to the future event stages
// This was done along time ago I just forgot to remove this because why not.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // adds inertia/smoothing to drag input
controls.dampingFactor = 0.03;      // how quickly that inertia settles
controls.autoRotate = false;        // no automatic idle spin
controls.autoRotateSpeed = 0.0;     // common sense gng "ROTATIONSPEED!!!"
controls.enableZoom = false;        // scroll wheel is reserved for the scroll-driven story, not zoom
controls.enablePan = false;         // prevent panning off-target

// Desktop: left-drag is the only orbit gesture. Middle/right buttons are
// disabled entirely so the site's scroll/reserved gestures stay untouched.
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.NONE,
    RIGHT: THREE.MOUSE.NONE
};

// Mobile: one-finger gestures are handled as page scroll, while two-finger
// gestures are routed into OrbitControls for model rotation. OrbitControls does
// not expose a pure two-finger rotate mode, so we use DOLLY_ROTATE and disable
// zoom elsewhere to make two-finger motion act like rotate-only.
controls.touches = {
    ONE: null,
    TWO: THREE.TOUCH.DOLLY_ROTATE
};

// Force pointer events to be delivered on mobile so OrbitControls can
// receive two-finger gestures. The canvas covers the page, so one-finger
// vertical scroll is handled manually instead of relying on browser touch-action.
const canvasEl = renderer.domElement;
canvasEl.style.touchAction = 'none';
const touchListenerOptions = { passive: false, capture: false };
const activeTouchIds = new Set();
let lastSingleTouchY = null;

function onCanvasTouchStart(e) {
    // Track every touch pointer that starts on the canvas, because touchend/
    // touchcancel events can be delivered with fewer touches than were actually
    // active before the event.
    for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouchIds.add(e.changedTouches[i].identifier);
    }

    if (activeTouchIds.size === 1 && e.touches.length === 1) {
        lastSingleTouchY = e.touches[0].clientY;
    } else {
        lastSingleTouchY = null;
    }
}

function onCanvasTouchMove(e) {
    // One-finger vertical drags should scroll the page, while two-finger
    // gestures should be captured and forwarded to OrbitControls.
    if (activeTouchIds.size === 1 && e.touches.length === 1 && lastSingleTouchY !== null) {
        const currentY = e.touches[0].clientY;
        window.scrollBy(0, lastSingleTouchY - currentY);
        lastSingleTouchY = currentY;
        e.preventDefault();
    } else if (activeTouchIds.size >= 2) {
        lastSingleTouchY = null;
        e.preventDefault();
    }
}

function onCanvasTouchEnd(e) {
    // Remove ended touch pointers from our active set, then recompute whether
    // the remaining gesture is a single-finger scroll or part of a multi-touch
    // OrbitControls interaction.
    for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouchIds.delete(e.changedTouches[i].identifier);
    }

    if (activeTouchIds.size === 1 && e.touches.length === 1) {
        lastSingleTouchY = e.touches[0].clientY;
    } else {
        lastSingleTouchY = null;
    }
}

function onCanvasTouchCancel(e) {
    // Treat cancelled touches as ended gestures and clear any pending
    // single-finger scroll state.
    for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouchIds.delete(e.changedTouches[i].identifier);
    }
    lastSingleTouchY = null;
}

canvasEl.addEventListener('touchstart', onCanvasTouchStart, touchListenerOptions);
canvasEl.addEventListener('touchmove', onCanvasTouchMove, touchListenerOptions);
canvasEl.addEventListener('touchend', onCanvasTouchEnd, touchListenerOptions);
canvasEl.addEventListener('touchcancel', onCanvasTouchCancel, touchListenerOptions);

function removeCanvasTouchListeners() {
    // Remove handlers with the same listener options used during registration
    // so we don't leak event listeners if the canvas is replaced or the page
    // transitions away.
    canvasEl.removeEventListener('touchstart', onCanvasTouchStart, touchListenerOptions);
    canvasEl.removeEventListener('touchmove', onCanvasTouchMove, touchListenerOptions);
    canvasEl.removeEventListener('touchend', onCanvasTouchEnd, touchListenerOptions);
    canvasEl.removeEventListener('touchcancel', onCanvasTouchCancel, touchListenerOptions);
}

window.addEventListener('pagehide', removeCanvasTouchListeners, { passive: true });

// Tracks the camera position the user last left it at via manual orbiting.
// Kept separate from the scroll-driven lerp target so scroll animation
// doesn't fight with (or get overwritten by) user drag input.
let baseUserCamPos = INITIAL_CAM_POS.clone();

// Whenever OrbitControls changes the camera (i.e. the user is dragging),
// resync baseUserCamPos
// While debugging I noticed a bug that I cause which i found a solution by
// using this code found in opensource talking about this same issue
// "the last place the user parked the camera"
// TOOK 8HRS OF MY LIFE FOR BETTER LIFE QUALITY CHANGE DAMMIT
// Test
controls.addEventListener('change', () => {
    if (controls.enabled) {
        baseUserCamPos.copy(camera.position);
    }
});

// SHARED NOISE FUNCTION (GLSL Simplex 3D noise) - used to make the disk
// surface ripple/turbulate instead of looking like a flat rigid ring
// This is pure math I hate it...
const noiseChunk = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    // Standard Ashima Arts simplex noise implementation, returns roughly [-1, 1]
    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        // Gradients (7x7 points over a square, mapped onto an octahedron)
        float n_ = 0.142857142857; // 1/7
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        // Normalize gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }
`;

// BLACK HOLE CORE
// Hope fully it works and doesnt cause lag (*praying)

// Group so the core sphere + aura could be transformed together if ever needed
// Which wont happens because I will get lazy lol
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// The event horizon itself: a plain flat-black sphere, radius 4
const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const bhGeo = new THREE.SphereGeometry(4, 64, 64);
coreGroup.add(new THREE.Mesh(bhGeo, bhMat));

// Rim-light "aura" material: glows brightest at the silhouette edge (Fresnel-style rim)
const auraMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            // Normal in view space, used for the rim/Fresnel calculation
            vNormal = normalize(normalMatrix * normal);
            // Direction from the vertex toward the camera, in view space
            vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            // rim = 0 when facing the camera straight-on, 1 at the grazing silhouette edge.
            // pow(...,4.0) sharpens that falloff so only the very edge glows.
            float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 4.0);
            // Warm orange glow color, scaled by rim strength and intensity uniform
            gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * rim * uIntensity * 5.0, 1.0);
        }
    `,
    side: THREE.BackSide,        // render inside faces, so the glow wraps around
                                 // the sphere as seen from outside
    transparent: true,
    blending: THREE.AdditiveBlending // light adds onto what's behind it instead of covering it
});
// Slightly bigger sphere (radius 4.25 vs 4.0) so the aura sits just outside the black core
coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(4.25, 64, 64), auraMat));

// ACCRETION DISK - built from thousands of instanced tapered "streak" cones

// Mobile GPUs can choke on 15k instanced cones + per-frame GLSL simplex noise.
// Dropping to 8k on phones keeps FPS smooth while the disk still looks dense.
const instanceCount = isMobile ? 8000 : 15000; // number of individual streak particles in the disk

// Single streak shape, reused for every instance via InstancedMesh:
// top radius 0.06 (thick/head end), bottom radius 0.008 (thin/tail point),
// length 1.8, 3 radial segments (triangular cross-section, cheap to render)
const streakGeo = new THREE.CylinderGeometry(0.06, 0.008, 1.8, 3);
// Rotate the cylinder so its long axis runs along local Z instead of default Y.
// After this: the thick head (was +Y) is now at local +Z, thin tail (was -Y) is now at local -Z.
streakGeo.rotateX(Math.PI / 2);

// Custom shader material driving per-instance orbital motion, turbulence, and color
const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },          // running clock, drives orbit + noise animation
        uMorph: { value: 0.1 },       // strength of vertical noise displacement (turbulence)
        uCompression: { value: 1.0 }, // radial compression factor (disk squeezing inward)
        uIntensity: { value: 1.0 },   // overall brightness multiplier
        uOrbitScale: { value: 1.0 },  // multiplier on orbital speed
        uHeat: { value: 1.0 }         // pushes colors toward white-hot as it increases
    },
    vertexShader: `
        ${noiseChunk}
        uniform float uTime;
        uniform float uMorph;
        uniform float uCompression;
        uniform float uIntensity;
        uniform float uOrbitScale;
        uniform float uHeat;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
            // Instance's base position (the center point each streak orbits from),
            // extracted from its per-instance transform matrix.
            vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            // Original orbital radius before any compression is applied
            float rOriginal = length(instPos.xz);
            // Compressed radius, used for the actual rendered position (shrinks disk inward during collapse)
            float r = rOriginal * uCompression;
            // Original angle of this instance around the Y axis
            float initialAngle = atan(instPos.z, instPos.x);

            // Orbital velocity calculation - Kepler-ish: closer to the center = faster (1/sqrt(r)),
            // scaled by uOrbitScale which ramps up during Instability/Singularity chapters
            float orbitalVelocity = (1.5 / sqrt(max(rOriginal, 0.1))) * uOrbitScale;
            // Advance this instance's angle forward over time based on its own orbital speed
            float currentAngle = initialAngle + (uTime * orbitalVelocity);

            // Recompute this instance's world position at the new orbit angle
            vec3 morphedWorldPos = vec3(cos(currentAngle) * r, instPos.y, sin(currentAngle) * r);

            // Sample noise using this instance's current world XZ position + time,
            // so ripples move with the disk instead of staying fixed in world space
            float noise = snoise(vec3(morphedWorldPos.x * 0.08, morphedWorldPos.z * 0.08, uTime * 0.3));
            // Push the instance up/down based on noise, scaled by uMorph (turbulence strength)
            morphedWorldPos.y += noise * uMorph * 4.0;

            // Tangent (velocity direction along circle) & Radial Normal vectors
            // Tangent = direction of orbital travel at this point on the circle (unit vector)
            vec3 tangent = normalize(vec3(-sin(currentAngle), 0.0, cos(currentAngle)));
            // Radial normal = direction pointing straight outward from the center, at this angle
            vec3 normalVec = normalize(vec3(cos(currentAngle), 0.0, sin(currentAngle)));

            // Direction from this point toward the camera, used for the Doppler brightening effect
            vec3 viewDir = normalize(cameraPosition - morphedWorldPos);
            // How aligned the motion direction is with the view direction —
            // used to fake relativistic Doppler beaming (material moving toward camera looks brighter)
            float doppler = dot(tangent, viewDir);

            // COLOR PALETTE
            vec3 outer = vec3(0.35, 0.02, 0.01); // dim red, far edge of the disk
            vec3 warm = vec3(1.0, 0.25, 0.02);   // mid-disk orange
            vec3 hot = vec3(1.0, 0.85, 0.35);    // near-core yellow-white
            vec3 lensColor = vec3(0.35, 0.15, 1.0); // faint violet tint for the outermost lensed ring

            // Blend outer -> warm as radius shrinks from 45 to 12
            vec3 color = mix(outer, warm, smoothstep(45.0, 12.0, r));
            // Blend warm -> hot as radius shrinks further, from 12 to 4 (near the event horizon)
            color = mix(color, hot, smoothstep(12.0, 4.0, r));
            // Add a subtle violet tint at the very outer edge (35–45) to suggest gravitational lensing
            color = mix(color, lensColor, smoothstep(35.0, 45.0, r) * 0.25);
            // As uHeat rises (during collapse), pull everything toward white-hot
            color = mix(color, vec3(1.0, 0.9, 0.7), clamp(uHeat * 0.15, 0.0, 1.0));

            // Per-instance pseudo-random brightness variation so the disk isn't perfectly uniform
            float instanceHash = fract(sin(float(gl_InstanceID)) * 43758.5453);
            color *= mix(0.7, 1.3, instanceHash);

            // Only brighten (never darken) based on Doppler alignment
            float dopplerBoost = clamp(doppler, 0.0, 1.0);
            vColor = color * (1.0 + dopplerBoost * 0.8) * uIntensity;

            // Fade opacity in near r=0.5–3.5 (avoid a hard pop right at the event horizon)
            // and fade out again near the outer edge (38–48), so the disk has soft boundaries
            vOpacity = (smoothstep(0.5, 3.5, r) * (1.0 - smoothstep(38.0, 48.0, r))) * 0.8;

            // Extract vertex local scale and local offsets - the local offset for this streak
            // (before orientation), scaled by the per-instance scale set in JS. instanceMatrix here
            // has translation stripped via w=0.0, so only the rotation+scale part applies.
            vec3 localPos = (instanceMatrix * vec4(position, 0.0)).xyz;

            // localPos.z > 0 = thick head (leading edge), localPos.z < 0 = thin tail point.
            // Multiplying by +tangent makes the thick head lead in the
            // direction of motion, with the thin tail trailing behind it - correct streak look.
            vec3 orientedPos = tangent * localPos.z + normalVec * localPos.x + vec3(0.0, localPos.y, 0.0);
            // Final world position = orbit position + oriented streak shape offset
            vec3 finalWorldPos = morphedWorldPos + orientedPos;

            gl_Position = projectionMatrix * viewMatrix * vec4(finalWorldPos, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            // Skip fully-transparent fragments entirely (cheap early-out, avoids overdraw cost)
            if (vOpacity < 0.01) discard;
            gl_FragColor = vec4(vColor, vOpacity);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending, // streaks add light together where they
                                      // overlap (glowy look)
    depthWrite: false                 // don't let transparent streaks occlude each
                                      // other via depth buffer
});

// One mesh instance per streak, all sharing the same geometry/material
// (GPU-instanced for performance)
const instancedDisk = new THREE.InstancedMesh(streakGeo, diskMaterial, instanceCount);
// Reusable dummy object used only to compute each instance's transform matrix
const dummy = new THREE.Object3D();

// - Populate initial per-instance positions, scale -
for (let i = 0; i < instanceCount; i++) {
    // Bias radius distribution toward the center using pow(random, 2.5)
    // more particles cluster near the black hole than out at the edge
    const r = 5 + Math.pow(Math.random(), 2.5) * 40;
    // Random angle around the disk
    const angle = Math.random() * Math.PI * 2;

    dummy.position.set(
        Math.cos(angle) * r,
        (Math.random() - 0.5) * (8 / r), // thinner vertical spread at
                                         // larger radius (flatter disk edge)
        Math.sin(angle) * r
    );

    // Scale varies by radius band, giving the disk different streak character
    // close-in vs mid vs far out
    let scaleX = 1.0, scaleY = 1.0, scaleZ = 1.0;
    if (r < 12) {
        // Inner disk: bigger, more elongated streaks (fast orbital motion blur)
        scaleX = 0.8 + Math.random() * 0.5;
        scaleY = 0.8 + Math.random() * 0.5;
        scaleZ = 1.4 + Math.random() * 0.8;
    } else if (r < 30) {
        // Mid disk: medium streaks
        scaleX = 0.7 + Math.random() * 0.4;
        scaleY = 0.7 + Math.random() * 0.4;
        scaleZ = 0.9 + Math.random() * 0.5;
    } else {
        // Outer disk: small, short, dust-like specks
        scaleX = 0.4 + Math.random() * 0.4;
        scaleY = 0.4 + Math.random() * 0.4;
        scaleZ = 0.4 + Math.random() * 0.4;
    }

    dummy.scale.set(scaleX, scaleY, scaleZ);
    dummy.rotation.set(0, 0, 0); // no per-instance rotation — orientation is
                                 // handled entirely in the shader via tangent/normal
    dummy.updateMatrix();
    instancedDisk.setMatrixAt(i, dummy.matrix); // bake this instance's transform
                                                // into the instance buffer
}
instancedDisk.instanceMatrix.needsUpdate = true; // tell three.js to upload the
                                                 //  instance matrices to the GPU
scene.add(instancedDisk);

//Todo: add some config vars into
// <SCROLL-DRIVEN EXPERIENCE ENGINE & CONFIGURATION>

// Defines the [start, end] scroll-progress range (0–1) for each story chapter
const CHAPTERS = {
    observation: [0.0, 0.3],
    instability: [0.3, 0.7],
    singularity: [0.7, 1.0]
};

const DEBUG_SCROLL = false; // toggle the on-screen debug overlay

let targetScrollProgress = 0;  // raw scroll position mapped to 0–1, updates instantly on scroll
let currentScrollProgress = 0; // smoothed/lerped version actually used to drive the animation

// Whether the camera currently sits exactly at INITIAL_CAM_POS (the true "home" view).
// Starts true because the page loads already sitting at that position.
let arrivedAtStart = true;
// How close (in world units) the camera needs to get to INITIAL_CAM_POS during the
// return-flight before we snap it exactly onto that position and re-enable orbiting.
const START_ARRIVE_EPSILON = 0.08;

// Cached DOM references for UI elements the animation loop updates each frame
const whiteoutEl = document.getElementById('whiteout');
const scrollPromptEl = document.getElementById('scroll-prompt');
const debugOverlayEl = document.getElementById('debug-overlay');
const mainTitleEl = document.getElementById('main-title');
const statusTextEl = document.getElementById('status-text');
const velValEl = document.getElementById('vel-val');

// On touch devices the scroll prompt should tell the user about the gestures
// that actually exist there: one finger scrolls, two fingers orbit the disk.
if (isMobile) {
    scrollPromptEl.textContent = 'Scroll to explore';
}

// Convert raw page scroll position into a 0–1 progress value.
// Use documentElement.clientHeight (the *layout* viewport) as the denominator,
// NOT window.innerHeight: innerHeight is the visual viewport and resizes as
// the mobile address bar retracts, making scrollY / maxScroll unstable and
// unable to reach exactly 1.0. clientHeight stays pinned during toolbar
// collapse, so the math lands on 1.0 at the true bottom. A small tolerance
// buffer then force-clamps to 1.0 on the last ~10px so the whiteout finale
// always triggers.
window.addEventListener('scroll', () => {
    const docEl = document.documentElement;
    const scrollY = window.scrollY;
    const maxScroll = docEl.scrollHeight - docEl.clientHeight; // layout-viewport based
    let progress = maxScroll > 0 ? scrollY / maxScroll : 0;

    // Snap to exactly 1.0 near the bottom regardless of browser-chrome quirks.
    if (maxScroll > 0 && scrollY + window.innerHeight >= docEl.scrollHeight - 10) {
        progress = 1;
    }

    targetScrollProgress = Math.min(Math.max(progress, 0), 1);
});

// Clamp a value between min and max (defaults to 0–1)
function clamp(val, min = 0, max = 1) {
    return Math.min(Math.max(val, min), max);
}

// Remap val from range [inMin, inMax] to [outMin, outMax], clamping the input first.
// This is the core helper used everywhere to drive uniforms/camera off scroll progress.
function remap(val, inMin, inMax, outMin, outMax) {
    const t = clamp((val - inMin) / (inMax - inMin), 0, 1);
    return outMin + t * (outMax - outMin);
}

// The camera position the animate loop lerps toward every frame when controls are disabled
const cameraTargetPos = INITIAL_CAM_POS.clone();
// Camera position used during the Instability chapter — looking down from above
const overheadCamPos = new THREE.Vector3(0.5, 85, 0.5);
// Camera position used at the very end of Singularity — deep, close to the core
const singularityCamPos = new THREE.Vector3(0.1, 4.5, 0.1);

// FPS tracking state
let frameCount = 0;
let lastFpsCheck = performance.now();
let currentFps = 60;

let customTime = 0; // our own accumulating clock, fed into the shaders as uTime

const clock = new THREE.Clock(); // three.js delta-time helper
const blackHoleTarget = new THREE.Vector3(0, 0, 0); // world origin, what the
                                                    //  camera looks at when controls are disabled

// MAIN RENDER / ANIMATION LOOP - runs once per frame

function animate() {
    // Delta time since last frame, capped at 0.1s so a dropped/backgrounded tab
    // doesn't cause a huge time jump when it resumes
    const safeDelta = Math.min(clock.getDelta(), 0.1);
    // Accumulate our own time value, wrapped to avoid float precision issues over long sessions
    customTime = (customTime + safeDelta) % (Math.PI * 2 * 1000);
    // Push the updated time into both shaders driving animation
    diskMaterial.uniforms.uTime.value = customTime;
    auraMat.uniforms.uTime.value = customTime;

    // Force the core/disk groups to stay at identity transform every frame —
    // all movement is baked into the shaders themselves, not object transforms
    coreGroup.rotation.set(0, 0, 0);
    coreGroup.position.set(0, 0, 0);
    instancedDisk.rotation.set(0, 0, 0);
    instancedDisk.position.set(0, 0, 0);

    // - FPS counter, updates once per second -
    frameCount++;
    const now = performance.now();
    if (now - lastFpsCheck >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
        frameCount = 0;
        lastFpsCheck = now;
    }

    // Smoothly ease the actual animation progress toward the raw scroll target,
    // so scrolling feels fluid instead of snapping instantly to scroll position
    currentScrollProgress = THREE.MathUtils.lerp(currentScrollProgress, targetScrollProgress, 0.05);
    const p = currentScrollProgress; // shorthand used throughout below

    // Fade out the "scroll to explore" prompt as soon as the user starts scrolling
    if (scrollPromptEl) {
        const promptOpacity = clamp(1.0 - (p / 0.08), 0, 1);
        scrollPromptEl.style.opacity = promptOpacity.toFixed(2);
    }

    let currentChapter = "Observation"; // used later for the return-to-start
                                        // check and debug overlay text

    // CHAPTER 1: OBSERVATION - user can freely orbit once truly "home";
    // otherwise the camera is mid-flight back to INITIAL_CAM_POS
    if (p <= CHAPTERS.observation[1]) {
        currentChapter = "Observation";

        if (arrivedAtStart) {
            // Fully settled at the true starting view — free orbit allowed
            controls.enabled = true;
        } else {
            // Coming back from a deeper chapter — fly back to the exact
            // start position first.
            // No user rotation until we arrive.
            controls.enabled = false;
            cameraTargetPos.copy(INITIAL_CAM_POS);
        }

        // Reset all disk uniforms to their calm/idle values
        diskMaterial.uniforms.uMorph.value = 0.1;
        diskMaterial.uniforms.uCompression.value = 1.0;
        diskMaterial.uniforms.uIntensity.value = 1.0;
        diskMaterial.uniforms.uOrbitScale.value = 1.0;
        diskMaterial.uniforms.uHeat.value = 1.0;
        auraMat.uniforms.uIntensity.value = 1.0;


    // CHAPTER 2: INSTABILITY - camera locked, flies from user's orbit
    // position up to an overhead view; disk starts turbulating
    } else if (p <= CHAPTERS.instability[1]) {
        currentChapter = "Instability";
        controls.enabled = false; // lock user rotation
        arrivedAtStart = false;   // left the start; next return to
                                  // Observation must fly back first

        // 0>1 progress specifically for the camera move
        // (finishes at p=0.6, before the chapter's own end at 0.7)
        const camLerp = remap(p, CHAPTERS.observation[1], 0.6, 0, 1);
        cameraTargetPos.lerpVectors(baseUserCamPos, overheadCamPos, camLerp);

        // 0>1 progress across the full Instability chapter,
        // drives all the shader uniforms below
        const instLerp = remap(p, CHAPTERS.observation[1], CHAPTERS.instability[1], 0, 1);
        diskMaterial.uniforms.uMorph.value = remap(instLerp, 0, 1, 0.1, 3.5);        // turbulence ramps up
        diskMaterial.uniforms.uCompression.value = remap(instLerp, 0, 1, 1.0, 1.15); // disk starts compressing
        diskMaterial.uniforms.uIntensity.value = remap(instLerp, 0, 1, 1.0, 1.4);    // brightens
        diskMaterial.uniforms.uOrbitScale.value = remap(instLerp, 0, 1, 1.0, 1.8);   // spins faster
        diskMaterial.uniforms.uHeat.value = remap(instLerp, 0, 1, 1.0, 2.0);         // heats up in color
        auraMat.uniforms.uIntensity.value = remap(instLerp, 0, 1, 1.0, 1.4);         // core rim glow brightens too


    // CHAPTER 3: SINGULARITY - camera dives from overhead down close to
    // the core; disk collapses inward and goes white-hot
    } else {
        currentChapter = "Singularity";
        controls.enabled = false; // still locked
        arrivedAtStart = false;   // still away from home; return will require the fly-back on the way out

        // 0→1 progress across the Singularity chapter
        const diveLerp = remap(p, CHAPTERS.singularity[0], CHAPTERS.singularity[1], 0, 1);
        cameraTargetPos.lerpVectors(overheadCamPos, singularityCamPos, diveLerp);

        diskMaterial.uniforms.uMorph.value = remap(diveLerp, 0, 1, 3.5, 0.0);        // turbulence smooths back out as it collapses
        diskMaterial.uniforms.uCompression.value = remap(diveLerp, 0, 1, 1.15, 0.25); // disk radius collapses dramatically inward
        diskMaterial.uniforms.uIntensity.value = remap(diveLerp, 0, 1, 1.4, 6.0);    // intense brightening
        diskMaterial.uniforms.uOrbitScale.value = remap(diveLerp, 0, 1, 1.8, 5.0);   // spins extremely fast
        diskMaterial.uniforms.uHeat.value = remap(diveLerp, 0, 1, 2.0, 5.0);         // pushed fully toward white-hot
        auraMat.uniforms.uIntensity.value = remap(diveLerp, 0, 1, 1.4, 8.0);         // core rim glow becomes blinding
    }


    // - Apply camera movement for this frame -
    if (controls.enabled) {
        // Observation chapter, fully at home: let OrbitControls handle damping/rotation from user input
        controls.update();
    } else {
        // Locked chapters (or mid fly-back to home): smoothly lerp toward the target position and always look at the core
        camera.up.set(0, 1, 0);
        camera.position.lerp(cameraTargetPos, 0.08);
        camera.lookAt(blackHoleTarget);
    }

    // Detect when the return-flight has reached the true starting view.
    // Only relevant while we're back in the Observation chapter but haven't
    // yet snapped exactly onto INITIAL_CAM_POS.
    if (currentChapter === "Observation" && !arrivedAtStart) {
        if (camera.position.distanceTo(INITIAL_CAM_POS) < START_ARRIVE_EPSILON) {
            // Close enough — snap exactly onto the home position to avoid a
            // lingering sub-pixel offset, and resync every piece of state
            // that depends on "where the camera is" so orbiting resumes cleanly
            camera.position.copy(INITIAL_CAM_POS);
            baseUserCamPos.copy(INITIAL_CAM_POS);
            controls.target.set(0, 0, 0); // make sure OrbitControls orbits around
                                          // the black hole, not a stale target
            controls.update();
            arrivedAtStart = true; // orbit control re-enabled on the next frame's
                                   // Observation branch
        }
    }

    // Fade the screen to white as the user approaches the very end of the scroll (p 0.9–1.0)
    const whiteoutOpacity = clamp(remap(p, 0.9, 1.0, 0.0, 1.0), 0, 1);
    if (whiteoutEl) {
        whiteoutEl.style.opacity = whiteoutOpacity.toFixed(3);
    }

    // - Debug overlay: only shown when DEBUG_SCROLL is true -
    if (DEBUG_SCROLL && debugOverlayEl) {
        debugOverlayEl.style.display = 'block';
        debugOverlayEl.innerText =
`[DEBUG OVERLAY]
Scroll Progress: ${p.toFixed(3)}
Current Chapter: ${currentChapter}
FPS:             ${currentFps}
Camera Position:
  X: ${camera.position.x.toFixed(2)}
  Y: ${camera.position.y.toFixed(2)}
  Z: ${camera.position.z.toFixed(2)}`;
    } else if (debugOverlayEl) {
        debugOverlayEl.style.display = 'none';
    }

    renderer.render(scene, camera); // draw the frame
    requestAnimationFrame(animate); // schedule the next frame
}

// Keep the renderer/camera in sync with the window size on resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(); // kick off the render loop
