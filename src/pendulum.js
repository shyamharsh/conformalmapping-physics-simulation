import * as THREE from 'https://esm.sh/three@0.128.0';
import { OrbitControls } from 'https://esm.sh/three@0.128.0/examples/jsm/controls/OrbitControls';

let scene, camera, renderer, controls;
let pendulumRod, pendulumBob;
let pivotPoint; // The fixed point where the pendulum hangs

// Pendulum physics parameters
let L = 10; // Length of the pendulum rod
let g = 9.81; // Acceleration due to gravity
let theta = Math.PI / 4; // Initial angle (45 degrees in radians)
let omega = 0; // Angular velocity

// UI elements
const lengthSlider = document.getElementById('length-slider');
const lengthValueSpan = document.getElementById('length-value');
const gravitySlider = document.getElementById('gravity-slider');
const gravityValueSpan = document.getElementById('gravity-value');
const initialAngleSlider = document.getElementById('initial-angle-slider');
const initialAngleValueSpan = document.getElementById('initial-angle-value');
const resetButton = document.getElementById('reset-button');
const canvasContainer = document.getElementById('canvas-container');

// Initialize Three.js scene
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe2e8f0); // Match container background

    // Camera
    // Log dimensions of the canvas container before setting renderer size
    console.log('Canvas Container Client Width:', canvasContainer.clientWidth);
    console.log('Canvas Container Client Height:', canvasContainer.clientHeight);

    camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 20); // Adjust camera position for better view

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.appendChild(renderer.domElement);
    console.log('Renderer DOM element appended to canvas-container.');
    console.log('Renderer size set to:', renderer.domElement.width, 'x', renderer.domElement.height);


    // Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going below ground

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Ground Plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -L - 2; // Position below the pendulum's lowest point
    scene.add(ground);

    // Pendulum components
    createPendulum();

    // Event Listeners for UI
    lengthSlider.addEventListener('input', updateParameters);
    gravitySlider.addEventListener('input', updateParameters);
    initialAngleSlider.addEventListener('input', updateParameters);
    resetButton.addEventListener('click', resetPendulum);

    // Initial UI update
    updateParameters();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function createPendulum() {
    // Remove existing pendulum if any
    // Only remove the top-level pivotPoint, its children (rod, bob) will be removed with it.
    if (pivotPoint) {
        scene.remove(pivotPoint);
        pivotPoint.traverse(object => { // Dispose geometries and materials to prevent memory leaks
            if (object.isMesh) {
                object.geometry.dispose();
                object.material.dispose();
            }
        });
    }

    // Pivot Point (fixed point at the top)
    const pivotGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const pivotMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    pivotPoint = new THREE.Mesh(pivotGeometry, pivotMaterial);
    pivotPoint.position.set(0, 0, 0); // Fixed at origin
    scene.add(pivotPoint);

    // Pendulum Rod (Cylinder for better visual)
    const rodGeometry = new THREE.CylinderGeometry(0.05, 0.05, L, 8); // Thin cylinder
    const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    pendulumRod = new THREE.Mesh(rodGeometry, rodMaterial);
    // Position the rod so its top is at the pivot point
    pendulumRod.position.y = -L / 2; // Center of cylinder is at -L/2 relative to pivot
    pivotPoint.add(pendulumRod); // Rod is child of pivotPoint

    // Pendulum Bob (Sphere)
    const bobRadius = 0.5;
    const bobGeometry = new THREE.SphereGeometry(bobRadius, 32, 32);
    const bobMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500 }); // Orange-red color
    pendulumBob = new THREE.Mesh(bobGeometry, bobMaterial);
    // Position the bob at the end of the rod
    pendulumBob.position.y = -L / 2 - bobRadius; // Position relative to the rod's center
    pendulumRod.add(pendulumBob); // Bob is child of rod

    // Initial rotation based on theta
    pivotPoint.rotation.z = theta; // Rotate around Z-axis for 2D pendulum
}

// Update pendulum parameters from UI
function updateParameters() {
    L = parseFloat(lengthSlider.value);
    g = parseFloat(gravitySlider.value);
    theta = parseFloat(initialAngleSlider.value) * (Math.PI / 180); // Convert degrees to radians

    lengthValueSpan.textContent = L.toFixed(2);
    gravityValueSpan.textContent = g.toFixed(2);
    initialAngleValueSpan.textContent = (theta * 180 / Math.PI).toFixed(2);

    // Recreate pendulum with new length and reset angle
    createPendulum();
    resetPendulum();
}

// Reset pendulum to initial angle and zero velocity
function resetPendulum() {
    omega = 0;
    pivotPoint.rotation.z = theta;
}

let lastTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);

    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Simple Pendulum Physics (Euler integration for demonstration)
    // Angular acceleration: alpha = -(g/L) * sin(theta)
    const alpha = -(g / L) * Math.sin(pivotPoint.rotation.z);

    // Update angular velocity: omega = omega + alpha * dt
    omega += alpha * deltaTime;

    // Update angular position: theta = theta + omega * dt
    pivotPoint.rotation.z += omega * deltaTime;

    controls.update(); // Only required if controls.enableDamping is set to true
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

// Start the simulation when the window loads
window.onload = function() {
    init();
    animate(0); // Start animation loop
};
