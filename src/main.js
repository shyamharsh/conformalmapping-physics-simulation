import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Corrected import path for npm
import * as dat from 'dat.gui'; // Corrected import path for npm


let scene, camera, renderer, clock, controls;
let strings = [];
let numPoints = 200;
let stringLength = 10;

let params = [
    { name: 'Guitar E String', amplitude: 1, frequency: 1, harmonics: 1 },
    { name: 'Bass G String', amplitude: 1.5, frequency: 2, harmonics: 2 },
    { name: 'Violin A String', amplitude: 0.8, frequency: 0.5, harmonics: 1 }
];

// Ensure the Three.js initialization happens after the DOM is fully loaded
window.onload = function () {
    init();
    animate();
}

function init() {
    scene = new THREE.Scene();
    // Add a subtle ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // soft white light
    scene.add(ambientLight);

    // Add a directional light for better depth perception
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5).normalize();
    scene.add(directionalLight);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    clock = new THREE.Clock();

    // Create multiple strings
    params.forEach((param, index) => {
        let points = [];
        for (let i = 0; i < numPoints; i++) {
            let x = (i / (numPoints - 1)) * stringLength - stringLength / 2;
            points.push(new THREE.Vector3(x, 0, index * 3 - (params.length - 1) * 1.5)); // Offset each string in Z axis, centered
        }

        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        let line = new THREE.Line(geometry, material);

        scene.add(line);
        strings.push({ line, param });
    });

    // GUI Controls for each string
    let gui = new dat.GUI();
    strings.forEach((stringObj, index) => {
        let folder = gui.addFolder(`String ${index + 1}`);
        folder.add(stringObj.param, 'amplitude', 0, 3).step(0.1);
        folder.add(stringObj.param, 'frequency', 0.5, 5).step(0.1);
        folder.add(stringObj.param, 'harmonics', 1, 5).step(1);
        folder.open();
    });

    window.addEventListener('resize', onWindowResize, false);
}

function animate() {
    requestAnimationFrame(animate);

    let time = clock.getElapsedTime();

    strings.forEach((stringObj, index) => {
        let positions = stringObj.line.geometry.attributes.position.array;
        let param = stringObj.param;

        for (let i = 0; i < numPoints; i++) {
            let x = (i / (numPoints - 1)) * stringLength - stringLength / 2;
            let k = (param.harmonics * Math.PI) / stringLength;
            let omega = 2 * Math.PI * param.frequency;
            let y = param.amplitude * Math.sin(k * (x + stringLength / 2)) * Math.cos(omega * time);

            positions[i * 3 + 1] = y;
        }

        stringObj.line.geometry.attributes.position.needsUpdate = true;

        // Real-time color change based on amplitude
        let colorScale = Math.min(1, param.amplitude / 3);
        stringObj.line.material.color.setHSL(0.6 - colorScale * 0.6, 1, 0.5);
    });

    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

