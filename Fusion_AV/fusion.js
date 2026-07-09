
(function(){
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: false });

  const els = {
    dzVideo: document.getElementById('dzVideo'),
    dzAudio: document.getElementById('dzAudio'),
    videoInput: document.getElementById('videoInput'),
    audioInput: document.getElementById('audioInput'),
    videoMeta: document.getElementById('videoMeta'),
    audioMeta: document.getElementById('audioMeta'),
    previewVideo: document.getElementById('previewVideo'),
    waveCanvas: document.getElementById('waveCanvas'),
    durVideo: document.getElementById('durVideo'),
    durAudio: document.getElementById('durAudio'),
    syncMode: document.getElementById('syncMode'),
    mergeBtn: document.getElementById('mergeBtn'),
    resetBtn: document.getElementById('resetBtn'),
    progressFill: document.getElementById('progressFill'),
    progressPct: document.getElementById('progressPct'),
    consoleLog: document.getElementById('consoleLog'),
    outputPanel: document.getElementById('outputPanel'),
    previewOut: document.getElementById('previewOut'),
    downloadBtn: document.getElementById('downloadBtn'),
    outMeta: document.getElementById('outMeta'),
    engineDot: document.getElementById('engineDot'),
    engineStatus: document.getElementById('engineStatus'),
  };

  let videoFile = null, audioFile = null;
  let videoDuration = 0, audioDuration = 0;
  let engineReady = false;

  function log(msg, cls){
    const line = document.createElement('div');
    line.className = cls || 'l-info';
    line.textContent = '> ' + msg;
    els.consoleLog.appendChild(line);
    els.consoleLog.scrollTop = els.consoleLog.scrollHeight;
  }

  function fmtTime(s){
    if(!isFinite(s) || s<=0) return '--:--';
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  }

  function fmtSize(bytes){
    if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
  }

  function updateSyncStrip(){
    els.durVideo.textContent = fmtTime(videoDuration);
    els.durAudio.textContent = fmtTime(audioDuration);
    if(videoDuration && audioDuration){
      if(audioDuration < videoDuration){
        els.syncMode.textContent = 'audio en bucle hasta cubrir el video';
      } else if(audioDuration > videoDuration){
        els.syncMode.textContent = 'audio recortado a la duración del video';
      } else {
        els.syncMode.textContent = 'duraciones coincidentes';
      }
    } else {
      els.syncMode.textContent = 'esperando archivos…';
    }
  }

  function checkReady(){
    els.mergeBtn.disabled = !(videoFile && audioFile);
  }

  // ---- Video handling ----
  function handleVideoFile(file){
    if(!file) return;
    videoFile = file;
    const url = URL.createObjectURL(file);
    els.previewVideo.src = url;
    els.previewVideo.style.display = 'block';
    els.previewVideo.onloadedmetadata = () => {
      videoDuration = els.previewVideo.duration;
      updateSyncStrip();
    };
    els.videoMeta.innerHTML = `<b>Archivo:</b> <span class="name">${file.name}</span><br><b>Tamaño:</b> ${fmtSize(file.size)}`;
    els.videoMeta.classList.add('show');
    log(`Video cargado: ${file.name}`, 'l-ok');
    checkReady();
  }

  // ---- Audio handling ----
  function handleAudioFile(file){
    if(!file) return;
    audioFile = file;
    const url = URL.createObjectURL(file);
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      audioDuration = tempAudio.duration;
      updateSyncStrip();
    };
    els.audioMeta.innerHTML = `<b>Archivo:</b> <span class="name">${file.name}</span><br><b>Tamaño:</b> ${fmtSize(file.size)}`;
    els.audioMeta.classList.add('show');
    log(`Audio cargado: ${file.name}`, 'l-ok');
    drawWaveform(file);
    checkReady();
  }

  function drawWaveform(file){
    const canvas = els.waveCanvas;
    canvas.classList.add('show');
    const reader = new FileReader();
    reader.onload = function(e){
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctx.decodeAudioData(e.target.result.slice(0), (buffer) => {
        const raw = buffer.getChannelData(0);
        const w = canvas.clientWidth || 400, h = 46;
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        const c = canvas.getContext('2d');
        c.scale(devicePixelRatio, devicePixelRatio);
        c.clearRect(0,0,w,h);
        const step = Math.ceil(raw.length / w);
        c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--green-mint');
        c.lineWidth = 1;
        c.beginPath();
        for(let i=0;i<w;i++){
          let min=1, max=-1;
          for(let j=0;j<step;j++){
            const idx = i*step+j;
            if(idx<raw.length){
              const v = raw[idx];
              if(v<min) min=v;
              if(v>max) max=v;
            }
          }
          const y1 = (1+min)*h/2, y2=(1+max)*h/2;
          c.moveTo(i, y1);
          c.lineTo(i, y2);
        }
        c.stroke();
      }, () => { canvas.classList.remove('show'); });
    };
    reader.readAsArrayBuffer(file);
  }

  // ---- Drag & drop wiring ----
  function wireDropzone(dz, input, handler, accept){
    dz.addEventListener('click', () => input.click());
    input.addEventListener('change', () => handler(input.files[0]));
    ['dragover','dragenter'].forEach(ev => dz.addEventListener(ev, (e)=>{
      e.preventDefault(); dz.classList.add('drag');
    }));
    ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, (e)=>{
      e.preventDefault(); dz.classList.remove('drag');
    }));
    dz.addEventListener('drop', (e)=>{
      const file = e.dataTransfer.files[0];
      if(file && file.type.startsWith(accept)) handler(file);
    });
  }
  wireDropzone(els.dzVideo, els.videoInput, handleVideoFile, 'video');
  wireDropzone(els.dzAudio, els.audioInput, handleAudioFile, 'audio');

  // ---- FFmpeg engine ----
  async function ensureEngine(){
    if(engineReady) return;
    els.engineDot.className = 'dot busy';
    els.engineStatus.textContent = 'MOTOR: CARGANDO…';
    log('Cargando motor FFmpeg (WASM)…');
    await ffmpeg.load();
    engineReady = true;
    els.engineDot.className = 'dot ready';
    els.engineStatus.textContent = 'MOTOR: LISTO';
    log('Motor listo.', 'l-ok');
  }

  ffmpeg.setProgress && ffmpeg.setProgress(({ ratio }) => {
    const pct = Math.min(100, Math.max(0, Math.round((ratio||0)*100)));
    els.progressFill.style.width = pct + '%';
    els.progressPct.textContent = pct + '%';
  });

  els.mergeBtn.addEventListener('click', async () => {
    if(!videoFile || !audioFile) return;
    els.mergeBtn.disabled = true;
    els.outputPanel.classList.remove('show');
    els.progressFill.style.width = '0%';
    els.progressPct.textContent = '0%';

    try {
      await ensureEngine();

      const videoExt = (videoFile.name.split('.').pop() || 'mp4').toLowerCase();
      const audioExt = (audioFile.name.split('.').pop() || 'mp3').toLowerCase();
      const inVideoName = 'input_video.' + videoExt;
      const inAudioName = 'input_audio.' + audioExt;
      const outName = 'fusion.mp4';

      log(`Escribiendo ${inVideoName} en el sistema virtual…`);
      ffmpeg.FS('writeFile', inVideoName, await fetchFile(videoFile));
      log(`Escribiendo ${inAudioName} en el sistema virtual…`);
      ffmpeg.FS('writeFile', inAudioName, await fetchFile(audioFile));

      const vDur = videoDuration || 0;
      log(`Duración de referencia (video): ${fmtTime(vDur)}`);
      log('Ejecutando fusión y ajuste de duración…', 'l-warn');

      // El audio se repite en bucle (-stream_loop -1) y el resultado
      // se recorta exactamente a la duración del video con -t.
      await ffmpeg.run(
        '-stream_loop', '-1', '-i', inAudioName,
        '-i', inVideoName,
        '-map', '1:v:0', '-map', '0:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        '-t', String(vDur),
        '-shortest',
        outName
      );

      log('Fusión completada, generando archivo de salida…', 'l-ok');
      const data = ffmpeg.FS('readFile', outName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      els.previewOut.src = url;
      els.downloadBtn.href = url;
      const finalName = 'fusion_' + (videoFile.name.split('.')[0] || 'video') + '.mp4';
      els.downloadBtn.download = finalName;
      els.outMeta.textContent = `Duración final: ${fmtTime(vDur)} · Tamaño: ${fmtSize(blob.size)}`;
      els.outputPanel.classList.add('show');
      log(`Listo para descargar: ${finalName}`, 'l-ok');

      // limpieza del FS virtual
      try{
        ffmpeg.FS('unlink', inVideoName);
        ffmpeg.FS('unlink', inAudioName);
        ffmpeg.FS('unlink', outName);
      }catch(e){}

    } catch (err) {
      console.error(err);
      els.engineDot.className = 'dot err';
      log('Error durante la fusión: ' + (err.message || err), 'l-err');
    } finally {
      els.mergeBtn.disabled = false;
    }
  });

  els.resetBtn.addEventListener('click', () => {
    videoFile = null; audioFile = null;
    videoDuration = 0; audioDuration = 0;
    els.videoInput.value = ''; els.audioInput.value = '';
    els.videoMeta.classList.remove('show');
    els.audioMeta.classList.remove('show');
    els.previewVideo.style.display = 'none';
    els.waveCanvas.classList.remove('show');
    els.outputPanel.classList.remove('show');
    els.progressFill.style.width = '0%';
    els.progressPct.textContent = '0%';
    updateSyncStrip();
    checkReady();
    log('Reiniciado.', 'l-info');
  });

  log('Interfaz cargada. Arrastra o selecciona video y audio para comenzar.');
  updateSyncStrip();
})();