/**
 * PRIMA JavaScript Color Engine
 * Maneja conversiones exactas y generación de paletas
 */

const wheel = document.getElementById('colorWheel');
const sizeInput = document.getElementById('circleSize');
const paletteContainer = document.getElementById('paletteContainer');
const selectedInfo = document.getElementById('selectedInfo');

// 1. Generación del Círculo Cromático (Arcoíris + B/N)
function initWheel() {
    const totalSegments = 24; // Más segmentos para un arcoíris más fluido
    const angleStep = 360 / totalSegments;

    for (let i = 0; i < totalSegments; i++) {
        const h = i * angleStep;
        createSegment(h, 100, 50, i, angleStep);
    }

    // Agregar Blanco (Centro) y Negro (Borde exterior) como elementos especiales
    createSpecialCircle('white', '30%', '50%');
    createSpecialCircle('black', '10%', '50%');
}

function createSegment(h, s, l, index, step) {
    const segment = document.createElement('div');
    segment.className = 'segment';
    const color = `hsl(${h}, ${s}%, ${l}%)`;
    
    segment.style.position = 'absolute';
    segment.style.width = '100%';
    segment.style.height = '100%';
    segment.style.backgroundColor = color;
    segment.style.clipPath = `polygon(50% 50%, 50% 0%, ${50 + Math.tan(step * Math.PI / 180) * 50}% 0%)`;
    segment.style.transform = `rotate(${h}deg)`;
    segment.style.cursor = 'pointer';

    segment.onclick = () => updatePalette(h, s, l);
    wheel.appendChild(segment);
}

function createSpecialCircle(type, size, pos) {
    const circle = document.createElement('div');
    circle.style.position = 'absolute';
    circle.style.width = size;
    circle.style.height = size;
    circle.style.borderRadius = '50%';
    circle.style.backgroundColor = type === 'white' ? '#fff' : '#000';
    circle.style.left = '50%';
    circle.style.top = '50%';
    circle.style.transform = 'translate(-50%, -50%)';
    circle.style.zIndex = type === 'white' ? '10' : '5';
    circle.style.cursor = 'pointer';
    circle.style.border = '2px solid var(--border-color)';

    circle.onclick = () => type === 'white' ? updatePalette(0, 0, 100) : updatePalette(0, 0, 0);
    wheel.appendChild(circle);
}

// 2. Lógica de Conversión Exacta
function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    
    return [
        Math.round(255 * f(0)),
        Math.round(255 * f(8)),
        Math.round(255 * f(4))
    ];
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// 3. Actualización de la Paleta Lateral
function updatePalette(h, s, l) {
    paletteContainer.innerHTML = '';
    const [r, g, b] = hslToRgb(h, s, l);
    const hex = rgbToHex(r, g, b);

    selectedInfo.innerHTML = `<h3>Color Base: <span style="color:${hex}">${hex}</span></h3>`;

    // Generar 8 tonos (desde muy claro a tenue)
    const steps = [95, 85, 75, 65, 50, 35, 20, 10];
    
    steps.forEach(light => {
        const [tr, tg, tb] = hslToRgb(h, s, light);
        const thex = rgbToHex(tr, tg, tb);
        
        const card = document.createElement('div');
        card.className = 'color-card';
        card.innerHTML = `
            <div class="swatch" style="background-color: ${thex}"></div>
            <div class="codes">
                <strong>HEX:</strong> ${thex}<br>
                <strong>RGB:</strong> (${tr}, ${tg}, ${tb})
            </div>
        `;
        paletteContainer.appendChild(card);
    });
}

// 4. Control de Tamaño
sizeInput.oninput = (e) => {
    wheel.style.width = `${e.target.value}px`;
    wheel.style.height = `${e.target.value}px`;
};

// Inicialización
wheel.style.width = '350px';
wheel.style.height = '350px';
initWheel();