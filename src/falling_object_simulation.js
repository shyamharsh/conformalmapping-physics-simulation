import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add some basic lighting
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Set camera position
camera.position.z = 5;
camera.position.y = 2; // Look down slightly

// --- Physics Constants ---
const G = 9.81; // Acceleration due to gravity (m/s^2)
const RHO_AIR = 1.225; // Density of air (kg/m^3)
const COEFF_RESTITUTION = 0.7; // Coefficient of restitution for bouncing (0 = no bounce, 1 = perfect bounce)
const BOUNCE_VELOCITY_THRESHOLD = 0.1; // If vertical velocity is below this after bounce, stop it

// --- Wind Force (constant for now) ---
const WIND_FORCE = new THREE.Vector3(0.5, 0, -0.2); // Example: Blows right (X) and slightly backward (Z)

// --- Texture Loader ---
const textureLoader = new THREE.TextureLoader();
// Make sure you have these texture files in src/textures/
// For demonstration, you might want a placeholder or just use solid colors if textures aren't available.
const earthTexture = textureLoader.load('./src/textures/earth_texture.jpg');
const metalTexture = textureLoader.load('./src/textures/metal_texture.jpg'); // For cubes

// --- Controls Setup (for a single controllable object) ---
const controls = {
    mass: 1.0,
    size: 0.5, // For sphere: radius, For cube: half side length
    initialHeight: 5,
    initialVelocityX: 0,
    initialVelocityZ: 0,
    shape: 'sphere',
    useAirResistance: true, // Toggle air resistance
    useVerlet: false // Toggle between Euler and Verlet
};

// Get HTML elements (assuming you've added them in falling_object.html as per previous instructions)
const massSlider = document.getElementById('mass');
const massValueSpan = document.getElementById('massValue');
const sizeSlider = document.getElementById('size');
const sizeValueSpan = document.getElementById('sizeValue');
const initialHeightSlider = document.getElementById('initialHeight');
const initialHeightValueSpan = document.getElementById('initialHeightValue');
const initialVelocityXSlider = document.getElementById('initialVelocityX');
const initialVelocityXValueSpan = document.getElementById('initialVelocityXValue');
const initialVelocityZSlider = document.getElementById('initialVelocityZ');
const initialVelocityZValueSpan = document.getElementById('initialVelocityZValue');
const shapeSelect = document.getElementById('shape');
const airResistanceCheckbox = document.getElementById('airResistance');
const verletCheckbox = document.getElementById('verletIntegration');
const resetButton = document.getElementById('resetButton');

// Initialize UI elements and controls object
massSlider.value = controls.mass;
massValueSpan.textContent = controls.mass.toFixed(1);
sizeSlider.value = controls.size;
sizeValueSpan.textContent = controls.size.toFixed(2);
initialHeightSlider.value = controls.initialHeight;
initialHeightValueSpan.textContent = controls.initialHeight.toFixed(1);
initialVelocityXSlider.value = controls.initialVelocityX;
initialVelocityXValueSpan.textContent = controls.initialVelocityX.toFixed(1);
initialVelocityZSlider.value = controls.initialVelocityZ;
initialVelocityZValueSpan.textContent = controls.initialVelocityZ.toFixed(1);
shapeSelect.value = controls.shape;
airResistanceCheckbox.checked = controls.useAirResistance;
verletCheckbox.checked = controls.useVerlet;


// --- Ground Plane ---
const groundGeometry = new THREE.PlaneGeometry(30, 30); // Larger plane
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x55aa55, side: THREE.DoubleSide }); // Green ground
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be flat on the XZ plane
ground.position.y = 0; // Ground is at Y=0
scene.add(ground);

// --- Controllable Falling Object ---
let mainControllableObject; // Global scope for the single object

function initializeControllableObject() {
    // Remove old mesh from scene if it exists
    if (mainControllableObject && mainControllableObject.mesh) {
        scene.remove(mainControllableObject.mesh);
        mainControllableObject.mesh.geometry.dispose();
        if (Array.isArray(mainControllableObject.mesh.material)) {
            mainControllableObject.mesh.material.forEach(m => m.dispose());
        } else {
            mainControllableObject.mesh.material.dispose();
        }
    }

    let geometry;
    let material;
    let dragCoefficient;
    let crossSectionalArea;
    let objectRadiusOrHalfSize = controls.size; // 'size' represents radius for sphere, half-side for cube

    if (controls.shape === 'sphere') {
        geometry = new THREE.SphereGeometry(objectRadiusOrHalfSize, 32, 32);
        material = new THREE.MeshPhongMaterial({ map: earthTexture, color: 0x0077ff }); // Use map, but keep color for fallback/tint
        dragCoefficient = 0.47;
        crossSectionalArea = Math.PI * objectRadiusOrHalfSize * objectRadiusOrHalfSize;
    } else if (controls.shape === 'cube') {
        geometry = new THREE.BoxGeometry(objectRadiusOrHalfSize * 2, objectRadiusOrHalfSize * 2, objectRadiusOrHalfSize * 2);
        material = new THREE.MeshPhongMaterial({ map: metalTexture, color: 0xff0000 });
        dragCoefficient = 1.05;
        crossSectionalArea = (objectRadiusOrHalfSize * 2) * (objectRadiusOrHalfSize * 2);
    } else {
        console.warn("Unknown shape, defaulting to sphere.");
        geometry = new THREE.SphereGeometry(objectRadiusOrHalfSize, 32, 32);
        material = new THREE.MeshPhongMaterial({ map: earthTexture, color: 0x0077ff });
        dragCoefficient = 0.47;
        crossSectionalArea = Math.PI * objectRadiusOrHalfSize * objectRadiusOrHalfSize;
    }

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    mainControllableObject = {
        mesh: mesh,
        mass: controls.mass,
        dragCoefficient: dragCoefficient,
        crossSectionalArea: crossSectionalArea,
        position: new THREE.Vector3(0, controls.initialHeight, 0), // Initial start position
        velocity: new THREE.Vector3(controls.initialVelocityX, 0, controls.initialVelocityZ), // Initial start velocity
        prevPosition: new THREE.Vector3(0, controls.initialHeight, 0), // For Verlet integration
        radius: objectRadiusOrHalfSize, // Used for ground collision (this is radius or half-size)
        shape: controls.shape
    };
    mainControllableObject.mesh.position.copy(mainControllableObject.position);
}

// Initialize the first object on load
initializeControllableObject();


// --- Event Listeners for Controls ---
massSlider.addEventListener('input', (event) => {
    controls.mass = parseFloat(event.target.value);
    massValueSpan.textContent = controls.mass.toFixed(1);
    mainControllableObject.mass = controls.mass; // Update live
});

sizeSlider.addEventListener('input', (event) => {
    controls.size = parseFloat(event.target.value);
    sizeValueSpan.textContent = controls.size.toFixed(2);
    // When size or shape changes, recreate the object to update geometry/area
    initializeControllableObject();
});

initialHeightSlider.addEventListener('input', (event) => {
    controls.initialHeight = parseFloat(event.target.value);
    initialHeightValueSpan.textContent = controls.initialHeight.toFixed(1);
});

initialVelocityXSlider.addEventListener('input', (event) => {
    controls.initialVelocityX = parseFloat(event.target.value);
    initialVelocityXValueSpan.textContent = controls.initialVelocityX.toFixed(1);
});

initialVelocityZSlider.addEventListener('input', (event) => {
    controls.initialVelocityZ = parseFloat(event.target.value);
    initialVelocityZValueSpan.textContent = controls.initialVelocityZ.toFixed(1);
});

shapeSelect.addEventListener('change', (event) => {
    controls.shape = event.target.value;
    initializeControllableObject(); // Recreate object with new shape
});

airResistanceCheckbox.addEventListener('change', (event) => {
    controls.useAirResistance = event.target.checked;
});

verletCheckbox.addEventListener('change', (event) => {
    controls.useVerlet = event.target.checked;
    // When switching integration methods, reset the object's state
    initializeControllableObject();
});

resetButton.addEventListener('click', () => {
    // *** MODIFICATION START ***
    // The "Reset Object" button will now reinitialize the object
    // with the *current values* set in the sliders and checkboxes,
    // instead of resetting the sliders themselves to defaults.
    // This allows you to perform new experiments with the same custom settings.
    initializeControllableObject();
    // *** MODIFICATION END ***
});


// --- Animation Loop ---
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTimeMillis = currentTime - lastTime;
    lastTime = currentTime;

    const dt = deltaTimeMillis / 1000;

    // --- Physics Calculation for the controllable object ---
    const object = mainControllableObject; // Reference the single object

    // 1. Force of Gravity
    const forceGravity = new THREE.Vector3(0, -object.mass * G, 0);

    // 2. Air Resistance (Drag Force)
    let forceDrag = new THREE.Vector3();
    if (controls.useAirResistance) {
        const speed = object.velocity.length();
        if (speed > 0.001) { // Avoid division by zero/flicker if speed is tiny
            const dragMagnitude = 0.5 * RHO_AIR * speed * speed * object.dragCoefficient * object.crossSectionalArea;
            forceDrag.copy(object.velocity).normalize().multiplyScalar(-dragMagnitude);
        }
    }

    // 3. Wind Force
    const forceWind = WIND_FORCE.clone(); // Clone to avoid modifying the global constant

    // 4. Net Force
    const netForce = new THREE.Vector3().addVectors(forceGravity, forceDrag);
    netForce.add(forceWind);

    // 5. Acceleration
    const acceleration = netForce.divideScalar(object.mass);

    // 6. Update Velocity and Position based on integration method
    if (controls.useVerlet) {
        // Verlet Integration
        const tempPosition = object.position.clone();

        object.position.x = 2 * object.position.x - object.prevPosition.x + acceleration.x * dt * dt;
        object.position.y = 2 * object.position.y - object.prevPosition.y + acceleration.y * dt * dt;
        object.position.z = 2 * object.position.z - object.prevPosition.z + acceleration.z * dt * dt;

        // Update Velocity (derived from position change for Verlet)
        object.velocity.copy(object.position).sub(object.prevPosition).divideScalar(dt);

        // Update prevPosition for the next iteration
        object.prevPosition.copy(tempPosition);

    } else {
        // Euler Integration (as before)
        object.velocity.add(acceleration.multiplyScalar(dt));
        object.position.add(object.velocity.clone().multiplyScalar(dt));
    }


    // 7. Ground Collision & Bouncing
    const groundLevel = object.radius; // The object's base should be at Y=0 when it touches the ground

    if (object.position.y < groundLevel) {
        object.position.y = groundLevel; // Set position to ground level

        // Apply bounce logic
        if (object.velocity.y < 0) { // Only bounce if moving downwards
            object.velocity.y *= -COEFF_RESTITUTION; // Reverse and reduce vertical velocity

            // Dampen horizontal velocity
            object.velocity.x *= 0.9;
            object.velocity.z *= 0.9;

            // Stop vertical movement if velocity is very small after bounce
            if (Math.abs(object.velocity.y) < BOUNCE_VELOCITY_THRESHOLD) {
                object.velocity.y = 0;
            }

            // For Verlet: Adjust prevPosition to reflect the bounce, crucial for stability
            if (controls.useVerlet) {
                object.prevPosition.y = object.position.y + object.velocity.y * dt;
            }
        }
    }


    // Update the Three.js mesh's position
    object.mesh.position.copy(object.position);

    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation
animate();

// --- Handle Window Resizing ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

