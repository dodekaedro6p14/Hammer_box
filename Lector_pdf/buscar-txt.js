/* ============================================================
   buscar-txt.js
   Buscador de texto para el Visor PDF.
   Este archivo NO modifica visor-pdf.js: se apoya en las
   variables globales que ese script ya declara (pdfDoc,
   totalPages, pageElements, scrollToPage, etc.) porque los
   <script> clásicos comparten el mismo ámbito léxico global
   de la página cuando se cargan uno después del otro.

   Requisitos:
   1) Haber agregado el botón #btn-search dentro de #toolbar
      y el bloque #search-bar en el HTML.
   2) Haber agregado los estilos de #search-bar y .text-highlight
      en visor-pdf.css.
   3) Incluir este archivo DESPUÉS de visor-pdf.js:
        <script src="visor-pdf.js"></script>
        <script src="buscar-txt.js"></script>
   ============================================================ */

(function () {
  'use strict';

  if (typeof pdfjsLib === 'undefined') {
    console.error('buscar-txt.js: pdfjsLib no está disponible. Verifica el orden de los <script>.');
    return;
  }

  // ── Referencias al DOM (creadas por ti en el HTML) ───────
  const toggleBtn   = document.getElementById('btn-search');
  const searchBar   = document.getElementById('search-bar');
  const searchInput = document.getElementById('search-input');
  const searchCount = document.getElementById('search-count');
  const btnPrev     = document.getElementById('search-prev');
  const btnNext     = document.getElementById('search-next');
  const btnClose    = document.getElementById('search-close');
  const scrollCont  = document.getElementById('scroll-container');
  const fileInputEl = document.getElementById('file-input');

  if (!toggleBtn || !searchBar || !searchInput || !searchCount || !btnPrev || !btnNext || !btnClose) {
    console.error('buscar-txt.js: faltan elementos en el HTML (btn-search / search-bar y sus hijos). Revisa el paso 1 y 2 de las instrucciones.');
    return;
  }

  // ── Estado ───────────────────────────────────────────────
  let pageTextCache = {};   // pageNum -> { vp1Width, vp1Height, segments, fullTextLower }
  let allMatches = [];      // { pageIdx, start, end, rects: [...], matchIndex }
  let currentMatchIndex = -1;
  let searchToken = 0;
  let debounceTimer = null;
  let rebuildDebounce = null;

  // ── Utilidades de texto ─────────────────────────────────
  function normalize(s) {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // ── Extraer texto + posiciones de una página (con caché) ──
  async function getPageTextData(pageNum) {
    if (pageTextCache[pageNum]) return pageTextCache[pageNum];
    const page = await pdfDoc.getPage(pageNum);
    const vp1 = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const segments = [];
    let fullText = '';

    textContent.items.forEach((item) => {
      if (item.str) {
        const tx = pdfjsLib.Util.transform(vp1.transform, item.transform);
        const fontHeight = Math.hypot(tx[2], tx[3]) || Math.abs(tx[3]) || (item.height || 10);
        const x = tx[4];
        const yTop = tx[5] - fontHeight;
        const width = item.width || 0;

        segments.push({
          str: item.str,
          x, y: yTop, width, height: fontHeight,
          start: fullText.length,
          end: fullText.length + item.str.length
        });
        fullText += item.str;
        if (!/\s$/.test(item.str)) fullText += ' ';
      } else if (item.hasEOL && !/\s$/.test(fullText)) {
        fullText += ' ';
      }
    });

    const data = {
      vp1Width: vp1.width,
      vp1Height: vp1.height,
      segments,
      fullTextLower: normalize(fullText)
    };
    pageTextCache[pageNum] = data;
    return data;
  }

  // ── Calcular los rectángulos de resalte de una coincidencia ──
  function computeRects(data, matchStart, matchEnd) {
    const rects = [];
    for (const seg of data.segments) {
      if (seg.end <= matchStart || seg.start >= matchEnd) continue;
      const localStart = Math.max(0, matchStart - seg.start);
      const localEnd = Math.min(seg.str.length, matchEnd - seg.start);
      if (localEnd <= localStart) continue;
      const len = seg.str.length || 1;
      const f1 = localStart / len;
      const f2 = localEnd / len;
      rects.push({
        x: seg.x + f1 * seg.width,
        y: seg.y,
        width: (f2 - f1) * seg.width,
        height: seg.height
      });
    }
    return rects;
  }

  // ── Resaltado en pantalla ────────────────────────────────
  function clearHighlightsInWrapper(wrapper) {
    wrapper.querySelectorAll('.text-highlight').forEach(el => el.remove());
  }

  function clearAllHighlights() {
    pageElements.forEach(({ wrapper }) => clearHighlightsInWrapper(wrapper));
  }

  function renderHighlightsForPage(pageNum) {
    const entry = pageElements[pageNum - 1];
    if (!entry) return;
    const { wrapper } = entry;
    clearHighlightsInWrapper(wrapper);
    const data = pageTextCache[pageNum];
    if (!data || !data.vp1Width) return;
    const ratio = wrapper.clientWidth / data.vp1Width;
    allMatches
      .filter(m => m.pageIdx === pageNum)
      .forEach(m => {
        m.rects.forEach(r => {
          const div = document.createElement('div');
          div.className = 'text-highlight' + (m.matchIndex === currentMatchIndex ? ' active' : '');
          div.dataset.matchIndex = m.matchIndex;
          div.style.left = (r.x * ratio) + 'px';
          div.style.top = (r.y * ratio) + 'px';
          div.style.width = Math.max(2, r.width * ratio) + 'px';
          div.style.height = (r.height * ratio) + 'px';
          wrapper.appendChild(div);
        });
      });
  }

  function renderAllHighlights() {
    for (let p = 1; p <= totalPages; p++) renderHighlightsForPage(p);
  }

  function updateCount() {
    searchCount.textContent = allMatches.length
      ? (currentMatchIndex + 1) + '/' + allMatches.length
      : '0/0';
  }

  // ── Ir a una coincidencia concreta ──────────────────────
  function goToMatch(i, smooth) {
    if (!allMatches.length) return;
    currentMatchIndex = ((i % allMatches.length) + allMatches.length) % allMatches.length;

    document.querySelectorAll('.text-highlight.active').forEach(d => d.classList.remove('active'));
    const m = allMatches[currentMatchIndex];
    const divs = document.querySelectorAll('.text-highlight[data-match-index="' + m.matchIndex + '"]');
    divs.forEach(d => d.classList.add('active'));

    scrollToPage(m.pageIdx, smooth !== false);
    setTimeout(() => {
      if (divs[0]) divs[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
    updateCount();
  }

  // ── Búsqueda principal ───────────────────────────────────
  async function performSearch(rawQuery) {
    const token = ++searchToken;
    clearAllHighlights();
    allMatches = [];
    currentMatchIndex = -1;
    updateCount();

    const q = rawQuery.trim().replace(/\s+/g, ' ');
    if (!pdfDoc || q.length < 2) return;

    const normQuery = normalize(q);

    for (let p = 1; p <= totalPages; p++) {
      if (token !== searchToken) return;
      const data = await getPageTextData(p);
      if (token !== searchToken) return;

      let idx = 0;
      let foundOnPage = false;
      while (true) {
        const found = data.fullTextLower.indexOf(normQuery, idx);
        if (found === -1) break;
        const rects = computeRects(data, found, found + normQuery.length);
        allMatches.push({
          pageIdx: p,
          start: found,
          end: found + normQuery.length,
          rects,
          matchIndex: allMatches.length
        });
        idx = found + normQuery.length;
        foundOnPage = true;
      }

      if (foundOnPage) {
        renderHighlightsForPage(p);
        if (currentMatchIndex === -1) {
          currentMatchIndex = allMatches.findIndex(m => m.pageIdx === p);
          goToMatch(currentMatchIndex, true);
        }
        updateCount();
      }
    }
    updateCount();
  }

  // ── Abrir / cerrar barra de búsqueda ─────────────────────
  function openSearch() {
    if (!pdfDoc) return;
    searchBar.classList.add('open');
    toggleBtn.classList.add('active');
    searchInput.focus();
    searchInput.select();
  }

  function closeSearch() {
    searchBar.classList.remove('open');
    toggleBtn.classList.remove('active');
    clearAllHighlights();
    allMatches = [];
    currentMatchIndex = -1;
    searchInput.value = '';
    updateCount();
  }

  function resetSearchState() {
    pageTextCache = {};
    closeSearch();
  }

  // ── Eventos de la UI de búsqueda ─────────────────────────
  toggleBtn.addEventListener('click', () => {
    if (searchBar.classList.contains('open')) closeSearch();
    else openSearch();
  });

  btnClose.addEventListener('click', closeSearch);
  btnNext.addEventListener('click', () => goToMatch(currentMatchIndex + 1));
  btnPrev.addEventListener('click', () => goToMatch(currentMatchIndex - 1));

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => performSearch(searchInput.value), 300);
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goToMatch(currentMatchIndex - 1);
      else goToMatch(currentMatchIndex + 1);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  });

  // Ctrl+F / Cmd+F abre el buscador propio
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      if (!pdfDoc) return;
      e.preventDefault();
      if (searchBar.classList.contains('open')) searchInput.focus();
      else openSearch();
    }
  });

  // ── Reset al cargar un PDF nuevo ─────────────────────────
  if (fileInputEl) fileInputEl.addEventListener('change', resetSearchState);
  document.addEventListener('drop', resetSearchState);

  // ── Re-posicionar resaltados cuando cambian zoom / ajuste ──
  const scrollObserver = new MutationObserver(() => {
    clearTimeout(rebuildDebounce);
    rebuildDebounce = setTimeout(() => {
      if (allMatches.length) renderAllHighlights();
    }, 200);
  });
  if (scrollCont) scrollObserver.observe(scrollCont, { childList: true });

})();
