/**
 * PRIMA JavaScript Color Engine
 * Maneja conversiones exactas y generación de paletas
 */

const wheel = document.getElementById('colorWheel');
const sizeInput = document.getElementById('circleSize');
const paletteContainer = document.getElementById('paletteContainer');
const selectedInfo = document.getElementById('selectedInfo');
const neonContainer = document.getElementById('neonPalette');
const wheelSection = document.getElementById('wheelSection');
const bgInput = document.getElementById('bgImage');
const resetBgBtn = document.getElementById('resetBg');

// 0. Colores Neón / Fluorescentes de referencia
// Tonos "eléctricos" de alta saturación y luminosidad, similares
// a los que se muestran en encycolorpedia.es/39ff14
const neonColors = [
    { name: 'Verde Neón',        hex: '#39FF14' },
    { name: 'Rosa Neón',         hex: '#FF10F0' },
    { name: 'Amarillo Flúor',    hex: '#FFFF33' },
    { name: 'Naranja Neón',      hex: '#FF5F1F' },
    { name: 'Azul Eléctrico',    hex: '#04D9FF' },
    { name: 'Púrpura Eléctrico', hex: '#BC13FE' },
    { name: 'Rojo Neón',         hex: '#FF073A' },
    { name: 'Lima Eléctrica',    hex: '#CCFF00' },
    { name: 'Turquesa Neón',     hex: '#00FFEF' },
    { name: 'Fucsia Eléctrico',  hex: '#FF00C8' }
];

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

// 1B. Generación de la franja de colores Neón
function initNeonPalette() {
    neonColors.forEach(({ name, hex }) => {
        const dot = document.createElement('div');
        dot.className = 'neon-swatch';
        dot.style.backgroundColor = hex;
        // El "brillo" que simula energía saliendo del color
        dot.style.boxShadow = `0 0 6px ${hex}, 0 0 14px ${hex}, 0 0 22px ${hex}`;
        dot.title = name;

        dot.onclick = () => {
            const [r, g, b] = hexToRgb(hex);
            const [h, s, l] = rgbToHsl(r, g, b);
            updatePalette(h, s, l);
        };

        neonContainer.appendChild(dot);
    });
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

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
}

// 3. Actualización de la Paleta Lateral
function updatePalette(h, s, l) {
    paletteContainer.innerHTML = '';
    const [r, g, b] = hslToRgb(h, s, l);
    const hex = rgbToHex(r, g, b);

    selectedInfo.innerHTML = `<h3>Color Base: <span style="color:${hex}">${hex}</span></h3>`;

    // Generar 15 tonos (desde muy claro a muy oscuro)
    const steps = [97, 90, 82, 74, 66, 58, 50, 44, 38, 32, 26, 20, 14, 8, 4];

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

// 5. Control de Fondo del área del círculo (imagen elegida por el usuario)
bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        wheelSection.style.backgroundImage = `url(${ev.target.result})`;
        wheelSection.style.backgroundSize = 'cover';
        wheelSection.style.backgroundPosition = 'center';
        wheelSection.style.backgroundRepeat = 'no-repeat';
    };
    reader.readAsDataURL(file);
});

resetBgBtn.addEventListener('click', () => {
    wheelSection.style.backgroundImage = '';
    bgInput.value = '';
});

// Inicialización
wheel.style.width = '350px';
wheel.style.height = '350px';
initWheel();
initNeonPalette();
