let mediaRecorder;
let recordedChunks = [];
let startTime;
let timerInterval;

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const downloadLink = document.getElementById('downloadLink');
const previewVideo = document.getElementById('preview');
const webcamVideo = document.getElementById('webcam');
const timerDisplay = document.getElementById('timer');

// Configuración de captura
async function startCapture() {
    try {
        // 1. Capturar Pantalla con Audio del Sistema
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: true 
        });

        // 2. Capturar Webcam y Micrófono
        const voiceStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true },
            video: true
        });

        // Mostrar webcam en el recuadro pequeño
        webcamVideo.srcObject = voiceStream;

        // 3. Mezclar pistas (Video de pantalla + Audio de micro + Audio de sistema)
        const tracks = [
            ...screenStream.getVideoTracks(),
            ...voiceStream.getAudioTracks()
        ];
        
        const combinedStream = new MediaStream(tracks);
        previewVideo.srcObject = combinedStream;

        setupRecorder(combinedStream);

    } catch (err) {
        console.error("Error al acceder a los medios: ", err);
        alert("No se pudo iniciar la captura. Revisa los permisos.");
    }
}

function setupRecorder(stream) {
    recordedChunks = [];
    // Usamos vp9 o h264 dependiendo del soporte del navegador
    const mimeType = 'video/webm;codecs=vp9';
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = `grabacion_${Date.now()}.webm`;
        downloadLink.style.display = 'inline-block';
        
        // Limpiar tracks
        stream.getTracks().forEach(track => track.stop());
        webcamVideo.srcObject.getTracks().forEach(track => track.stop());
    };

    // Iniciar
    mediaRecorder.start();
    startTimer();
    toggleButtons(true);
}

// Lógica de botones
btnStart.addEventListener('click', startCapture);
btnStop.addEventListener('click', () => {
    mediaRecorder.stop();
    stopTimer();
    toggleButtons(false);
});

function toggleButtons(isRecording) {
    btnStart.disabled = isRecording;
    btnStop.disabled = !isRecording;
    if(isRecording) downloadLink.style.display = 'none';
}

// Cronómetro simple
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const diff = Date.now() - startTime;
        const seconds = Math.floor(diff / 1000) % 60;
        const minutes = Math.floor(diff / 60000);
        timerDisplay.textContent = `Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}