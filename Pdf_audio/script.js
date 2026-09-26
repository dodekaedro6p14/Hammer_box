// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const textDisplay = document.getElementById('textDisplay');
const languageSelect = document.getElementById('languageSelect');

const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnStop = document.getElementById('btnStop');

// --- 1. LÓGICA DE DRAG & DROP ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
});

// --- 2. LÓGICA DE EXTRACCIÓN DE TEXTO ---
async function processFile(file) {
    textDisplay.value = "Procesando archivo... por favor espera.";
    
    if (file.type === "text/plain") {
        // Leer TXT
        const reader = new FileReader();
        reader.onload = (e) => textDisplay.value = e.target.result;
        reader.readAsText(file);
    } else if (file.type === "application/pdf") {
        // Leer PDF
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + "\n\n";
            }
            textDisplay.value = fullText;
        } catch (error) {
            textDisplay.value = "Error al leer el PDF. Asegúrate de que no esté protegido con contraseña.";
            console.error(error);
        }
    } else {
        textDisplay.value = "Formato no soportado. Por favor sube un .TXT o .PDF.";
    }
}

// --- 3. LÓGICA DE TEXT-TO-SPEECH (AUDIO) ---
let synth = window.speechSynthesis;
let currentUtterance = null;

btnPlay.addEventListener('click', () => {
    if (synth.paused && currentUtterance) {
        synth.resume();
        return;
    }
    
    const textToSpeak = textDisplay.value.trim();
    if (!textToSpeak) return alert("No hay texto para reproducir.");

    synth.cancel(); // Detener cualquier lectura anterior

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = languageSelect.value;
    
    // Opcional: Ajustar velocidad y tono
    currentUtterance.rate = 1.0; 
    currentUtterance.pitch = 1.0;

    synth.speak(currentUtterance);
});

btnPause.addEventListener('click', () => {
    if (synth.speaking && !synth.paused) synth.pause();
});

btnStop.addEventListener('click', () => {
    synth.cancel();
    currentUtterance = null;
});