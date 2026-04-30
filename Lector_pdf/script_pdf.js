pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── State ──────────────────────────────────────────
let pdfDoc = null;
let totalPages = 0;
let currentPage = 1;
let zoomLevel = 1.0;
let isDark = false;
let sidebarOpen = false;
let renderQueue = [];
let isRendering = false;
let pageElements = [];
let thumbCanvases = [];
let fitWidth = false;
let viewerWidth = 0;

// ── DOM refs ───────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
const dropBox = document.getElementById('drop-box');
const scrollCont = document.getElementById('scroll-container');
const fileInput = document.getElementById('file-input');
const pageInput = document.getElementById('page-input');
const pageTotalEl = document.getElementById('page-total');
const zoomLabel = document.getElementById('zoom-label');
const fileNameBadge = document.getElementById('file-name-badge');
const sidebar = document.getElementById('sidebar');
const loadingBar = document.getElementById('loading-bar');
const body = document.body;

// ── Theme ──────────────────────────────────────────
function toggleTheme() {
    isDark = !isDark;
    body.setAttribute('data-theme', isDark ? 'dark' : '');
    document.getElementById('theme-icon-dark').style.display = isDark ? 'none' : '';
    document.getElementById('theme-icon-light').style.display = isDark ? '' : 'none';
    rerenderAll();
}

// ── Load PDF ───────────────────────────────────────
async function loadPDF(arrayBuffer, name) {
    setProgress(10);
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages = pdfDoc.numPages;
    pageTotalEl.textContent = '/ ' + totalPages;
    pageInput.max = totalPages;
    pageInput.value = 1;
    currentPage = 1;
    fileNameBadge.textContent = name || '';
    setProgress(25);
    dropZone.classList.add('hidden');
    scrollCont.classList.add('visible');
    await buildPageLayout();
    buildThumbnails();
    setProgress(100);
    setTimeout(() => { loadingBar.style.width = '0'; loadingBar.style.transition = 'none'; }, 400);
    scrollToPage(1, false);
}

function setProgress(pct) {
    loadingBar.style.transition = pct > 0 ? 'width 0.3s' : 'none';
    loadingBar.style.width = pct + '%';
}

// ── Build all page wrappers ────────────────────────
async function buildPageLayout() {
    scrollCont.innerHTML = '';
    pageElements = [];
    viewerWidth = scrollCont.clientWidth - 48;

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = getViewport(page);

        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        wrapper.dataset.page = i;
        wrapper.style.width = vp.width + 'px';
        wrapper.style.height = vp.height + 'px';

        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        wrapper.appendChild(canvas);

        const label = document.createElement('div');
        label.className = 'page-num-label';
        label.textContent = i + ' / ' + totalPages;
        wrapper.appendChild(label);

        scrollCont.appendChild(wrapper);
        pageElements.push({ wrapper, canvas, page, vp });
    }

    // IntersectionObserver for lazy render
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const idx = parseInt(e.target.dataset.page) - 1;
                queueRender(idx);
            }
        });
    }, { root: scrollCont, rootMargin: '200px' });

    pageElements.forEach(({ wrapper }) => observer.observe(wrapper));
}

function getViewport(page) {
    const baseVp = page.getViewport({ scale: 1 });
    let scale = zoomLevel;
    if (fitWidth) {
        scale = viewerWidth / baseVp.width;
    }
    return page.getViewport({ scale });
}

// ── Render queue ───────────────────────────────────
function queueRender(idx) {
    if (!renderQueue.includes(idx)) renderQueue.push(idx);
    if (!isRendering) processQueue();
}

async function processQueue() {
    if (!renderQueue.length) { isRendering = false; return; }
    isRendering = true;
    const idx = renderQueue.shift();
    await renderPage(idx);
    processQueue();
}

async function renderPage(idx) {
    const { page, canvas } = pageElements[idx];
    const vp = getViewport(page);
    canvas.width = vp.width;
    canvas.height = vp.height;
    const wrapper = pageElements[idx].wrapper;
    wrapper.style.width = vp.width + 'px';
    wrapper.style.height = vp.height + 'px';
    const ctx = canvas.getContext('2d');
    // Always render clean — inversion applied via CSS
    ctx.filter = 'none';
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    // Apply CSS filter AFTER rendering so the browser composites it correctly
    applyCanvasTheme(canvas);
}

function applyCanvasTheme(canvas) {
    if (isDark) {
        canvas.style.filter = 'invert(1) hue-rotate(180deg)';
    } else {
        canvas.style.filter = 'none';
    }
}

async function rerenderAll() {
    // Apply CSS filter immediately to all visible canvases for instant feedback
    pageElements.forEach(({ canvas }) => applyCanvasTheme(canvas));
    // Then re-render properly in the background
    renderQueue = [];
    isRendering = false;
    for (let i = 0; i < pageElements.length; i++) {
        queueRender(i);
    }
}

// ── Scroll tracking → update page number ──────────
scrollCont.addEventListener('scroll', () => {
    const scrollMid = scrollCont.scrollTop + scrollCont.clientHeight / 2;
    let closest = 0, closestDist = Infinity;
    pageElements.forEach(({ wrapper }, i) => {
        const mid = wrapper.offsetTop + wrapper.offsetHeight / 2;
        const dist = Math.abs(mid - scrollMid);
        if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    currentPage = closest + 1;
    pageInput.value = currentPage;
    highlightThumb(currentPage);
}, { passive: true });

// ── Scroll to page ────────────────────────────────
function scrollToPage(n, smooth = true) {
    if (!pageElements.length) return;
    n = Math.max(1, Math.min(n, totalPages));
    if (!smooth) scrollCont.classList.add('instant');
    pageElements[n - 1].wrapper.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
    if (!smooth) setTimeout(() => scrollCont.classList.remove('instant'), 50);
}

// ── Thumbnails ────────────────────────────────────
async function buildThumbnails() {
    sidebar.innerHTML = '';
    thumbCanvases = [];
    for (let i = 1; i <= totalPages; i++) {
        const item = document.createElement('div');
        item.className = 'thumb-item';
        item.dataset.page = i;

        const tc = document.createElement('canvas');
        item.appendChild(tc);

        const num = document.createElement('div');
        num.className = 'thumb-num';
        num.textContent = i;
        item.appendChild(num);

        item.addEventListener('click', () => {
            scrollToPage(i);
        });

        sidebar.appendChild(item);
        thumbCanvases.push({ item, tc });

        // render thumb lazily
        (async (idx, canvas) => {
            const page = await pdfDoc.getPage(idx);
            const vp = page.getViewport({ scale: 0.22 });
            canvas.width = vp.width;
            canvas.height = vp.height;
            canvas.style.width = '100px';
            canvas.style.height = Math.round(vp.height * (100 / vp.width)) + 'px';
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
        })(i, tc);
    }
    highlightThumb(1);
}

function highlightThumb(n) {
    thumbCanvases.forEach(({ item }, i) => {
        item.classList.toggle('active', i + 1 === n);
    });
    // scroll sidebar to active thumb
    if (thumbCanvases[n - 1]) {
        thumbCanvases[n - 1].item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// ── Zoom ──────────────────────────────────────────
async function setZoom(z, rebuildLayout = true) {
    fitWidth = false;
    zoomLevel = Math.max(0.3, Math.min(5.0, z));
    zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
    if (!pdfDoc) return;
    if (rebuildLayout) {
        const savedPage = currentPage;
        await rebuildAll();
        scrollToPage(savedPage, false);
    }
}

async function setFitWidth() {
    fitWidth = true;
    viewerWidth = scrollCont.clientWidth - 48;
    if (!pdfDoc) return;
    const savedPage = currentPage;
    await rebuildAll();
    const page = pageElements[0];
    if (page) {
        const vp = getViewport(page.page);
        zoomLevel = vp.scale || zoomLevel;
        zoomLabel.textContent = 'Ajuste';
    }
    scrollToPage(savedPage, false);
}

async function rebuildAll() {
    scrollCont.innerHTML = '';
    pageElements = [];
    renderQueue = [];
    isRendering = false;
    await buildPageLayout();
}

// ── File handling ──────────────────────────────────
function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Por favor selecciona un archivo PDF válido.');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => loadPDF(e.target.result, file.name);
    reader.readAsArrayBuffer(file);
}

// ── Drag & drop ────────────────────────────────────
document.addEventListener('dragover', e => { e.preventDefault(); dropBox.classList.add('dragover'); });
document.addEventListener('dragleave', () => dropBox.classList.remove('dragover'));
document.addEventListener('drop', e => {
    e.preventDefault();
    dropBox.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

dropBox.addEventListener('click', () => fileInput.click());
document.getElementById('btn-open').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

// ── Toolbar buttons ────────────────────────────────
document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
});
document.getElementById('btn-next').addEventListener('click', () => {
    if (currentPage < totalPages) scrollToPage(currentPage + 1);
});
document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(zoomLevel + 0.15));
document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoomLevel - 0.15));
document.getElementById('btn-zoom-reset').addEventListener('click', () => setZoom(1.0));
document.getElementById('btn-fit').addEventListener('click', setFitWidth);
document.getElementById('btn-theme').addEventListener('click', toggleTheme);
document.getElementById('btn-sidebar').addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('open', sidebarOpen);
    document.getElementById('btn-sidebar').classList.toggle('active', sidebarOpen);
});

pageInput.addEventListener('change', () => {
    const n = parseInt(pageInput.value);
    if (n >= 1 && n <= totalPages) scrollToPage(n);
});
pageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') pageInput.dispatchEvent(new Event('change'));
});

// ── Wheel zoom (Ctrl+scroll) / normal scroll ───────
scrollCont.addEventListener('wheel', e => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        setZoom(zoomLevel + delta);
    }
}, { passive: false });

// ── Keyboard shortcuts ─────────────────────────────
document.addEventListener('keydown', e => {
    if (e.target === pageInput) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.key) {
        case 's':
        case 'PageDown':
            if (currentPage < totalPages) scrollToPage(currentPage + 1);
            break;
        case 'w':
        case 'PageUp':
            if (currentPage > 1) scrollToPage(currentPage - 1);
            break;
        case 'q':
            e.preventDefault();
            setZoom(zoomLevel + 0.12);
            break;
        case 'e':
            e.preventDefault();
            setZoom(zoomLevel - 0.12);
            break;
        case 't':
        case 'T':
            toggleTheme();
            break;
        case 'm':
        case 'M':
            document.getElementById('btn-sidebar').click();
            break;
        case 'f':
        case 'F':
            setFitWidth();
            break;
        case '+':
        case '=':
            setZoom(zoomLevel + 0.15);
            break;
        case '-':
            setZoom(zoomLevel - 0.15);
            break;
        case '0':
            setZoom(1.0);
            break;
    }
});

// ── Resize: rebuild if fitWidth ────────────────────
window.addEventListener('resize', () => {
    if (fitWidth && pdfDoc) setFitWidth();
});
