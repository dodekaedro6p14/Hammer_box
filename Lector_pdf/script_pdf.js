// --- GENERADOR DE ESPACIO ---
const space = document.getElementById('space-background');

//	-- drop area personal--
// script.js
const dropArea = document.getElementById('drop-area');
const fileList = document.getElementById('file-list');
// 1. Prevenir comportamientos por defecto (abrir el archivo en el navegador)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// 2. Añadir/Quitar estilos al arrastrar sobre el área
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

// 3. Manejar el archivo soltado
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
}

function handleFiles(files) {
    ([...files]).forEach(validateAndProcessFile);
}

function validateAndProcessFile(file) {
    // Validar que sea PDF
    if (file.type === 'application/pdf') {
        fileList.innerHTML = `<p>Archivo cargado: <strong>${file.name}</strong></p>`;
        console.log('PDF recibido:', file.name);

        // Aquí puedes usar FileReader para leer el contenido del archivo
        // o subirlo a un servidor mediante FormData
    } else {
        alert('Por favor, suelta solo archivos PDF.');
    }
}

function initSpace() {
    // Crear 150 estrellas
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 'px';
        star.style.width = size;
        star.style.height = size;
        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
        space.appendChild(star);
    }

    // Crear 10 asteroides orbitando
    for (let i = 0; i < 10; i++) {
        const asteroide = document.createElement('div');
        asteroide.className = 'asteroid';
        asteroide.style.top = '50%';
        asteroide.style.left = '50%';
        asteroide.style.setProperty('--distance', (200 + Math.random() * 300) + 'px');
        asteroide.style.setProperty('--duration', (10 + Math.random() * 40) + 's');
        space.appendChild(asteroide);
    }
}
initSpace();

// --- LÓGICA DEL PDF ---
const fileUpload = document.getElementById('file-upload');
const container = document.getElementById('pdf-viewer-container');
const pageInfo = document.getElementById('page-info');
const bgColorPicker = document.getElementById('bgColor');
const textColorPicker = document.getElementById('textColor');
const topBtn = document.getElementById('topBtn');

let pdfDoc = null;

fileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async function () {
            const typedarray = new Uint8Array(this.result);

            // Cargar el documento
            pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
            renderAllPages();
        };
        reader.readAsArrayBuffer(file);
    }
});

async function renderAllPages() {
    container.innerHTML = ''; // Limpiar
    pageInfo.textContent = `Páginas: ${pdfDoc.numPages} / ${pdfDoc.numPages}`;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        container.appendChild(canvas);
    }
}

// --- CAMBIO DE COLORES ---
bgColorPicker.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--bg-reader', e.target.value);
});

textColorPicker.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--text-reader', e.target.value);
    // Aplicamos un filtro a los canvas para intentar cambiar el color del texto del PDF
    const canvases = document.querySelectorAll('canvas');
    if (e.target.value !== '#000000') {
        canvases.forEach(c => c.style.filter = 'invert(0.8) hue-rotate(180deg)');
    } else {
        canvases.forEach(c => c.style.filter = 'none');
    }
});

// --- BOTÓN VOLVER ARRIBA ---
container.onscroll = function () {
    if (container.scrollTop > 100) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
};

function scrollToTop() {
    container.scrollTo({ top: 0, behavior: 'smooth' });
}