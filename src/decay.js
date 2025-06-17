import * as THREE from 'three';

let scene, camera, renderer, particles = [], decayConstant = 0.2, initialCount = 100, startTime, chart, chartData;
let particleGroup = new THREE.Group();

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Chart setup
    setupChart();

    // Load initial particles
    createParticles(initialCount);

    // Event listeners
    document.getElementById('restartButton').addEventListener('click', restartSimulation);
    document.getElementById('decayRate').addEventListener('input', (e) => {
        decayConstant = parseFloat(e.target.value);
        document.getElementById('lambdaValue').textContent = decayConstant.toFixed(2);
    });

    window.addEventListener('resize', onWindowResize);
}

function createParticles(count) {
    // Clear old particles
    particles = [];
    if (scene.children.includes(particleGroup)) {
        scene.remove(particleGroup);
    }
    particleGroup = new THREE.Group();

    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    for (let i = 0; i < count; i++) {
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        particle.decayTime = Math.random() * 10 / decayConstant;
        particleGroup.add(particle);
        particles.push({ mesh: particle, decayed: false });
    }
    scene.add(particleGroup);

    startTime = performance.now() / 1000; // seconds
    chartData = { time: [0], remaining: [particles.length] };
    updateChart(0, particles.length);
}

function restartSimulation() {
    initialCount = parseInt(document.getElementById('initialParticles').value);
    createParticles(initialCount);
}

function animate() {
    requestAnimationFrame(animate);

    let elapsed = (performance.now() / 1000) - startTime;

    let remaining = 0;

    particles.forEach(p => {
        if (!p.decayed) {
            if (Math.random() < decayConstant * 0.01) {
                p.decayed = true;
            } else {
                remaining++;
            }
        }

        if (p.decayed && p.mesh.material.opacity > 0) {
            p.mesh.material.transparent = true;
            p.mesh.material.opacity -= 0.02;
        }
    });

    updateChart(elapsed, remaining);

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupChart() {
    const ctx = document.getElementById('decayChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [0],
            datasets: [{
                label: 'Remaining Particles',
                data: [initialCount],
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: { title: { display: true, text: 'Time (s)' } },
                y: { title: { display: true, text: 'Particles Remaining' }, beginAtZero: true }
            }
        }
    });
}

function updateChart(time, remaining) {
    if (chartData.time.length === 0 || time - chartData.time[chartData.time.length - 1] >= 0.1) {
        chartData.time.push(time.toFixed(1));
        chartData.remaining.push(remaining);
        chart.data.labels = chartData.time;
        chart.data.datasets[0].data = chartData.remaining;
        chart.update();
    }
}
