(function(){
  const STORAGE_KEY = "puzzleforge_library";

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
  
  function debounce(fn, delay=120){
    let t;
    return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); };
  }

  function resizeImage(file, maxDim = 1600, quality = 0.85){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
      reader.onload = ev=>{
        const img = new Image();
        img.onerror = () => reject(new Error('Image invalide.'));
        img.onload = ()=>{
          let { width, height } = img;
          if(width > maxDim || height > maxDim){
            const ratio = Math.min(maxDim/width, maxDim/height);
            width = Math.round(width*ratio);
            height = Math.round(height*ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  function switchTab(name){
    tabBtns.forEach(b=>{
      const active = b.dataset.tab === name;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    tabContents.forEach(c=>{
      if(c.id === 'tab-'+name) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }
  
  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.disabled) return;
      switchTab(btn.dataset.tab);
    });
  });
  
  const playTabBtn = document.getElementById('tabbtn-play');

  let currentImageData = null;
  let currentFileName = 'Image importée';
  let currentSize = 6;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewRow = document.getElementById('previewRow');
  const previewImg = document.getElementById('previewImg');
  const diffs = document.getElementById('diffs');
  const generateBtn = document.getElementById('generateBtn');

  dropzone.addEventListener('dragover', (e)=>{ e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', ()=> dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', (e)=>{
    e.preventDefault();
    dropzone.classList.remove('drag');
    if(e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e)=>{
    if(e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    fileInput.value = '';
  });

  async function handleFile(file){
    if(!file.type.startsWith('image/')){
      alert('Merci de sélectionner un fichier image (JPG, PNG, WebP...).');
      return;
    }
    generateBtn.disabled = true;
    try{
      const dataUrl = await resizeImage(file, 1600, 0.85);
      currentImageData = dataUrl;
      currentFileName = (file.name || '').replace(/\.[^.]+$/, '') || 'Image importée';
      previewImg.src = currentImageData;
      previewRow.style.display = 'flex';
      generateBtn.disabled = false;
    }catch(err){
      console.error(err);
      alert('Impossible de lire cette image. Essayez un autre fichier.');
      generateBtn.disabled = true;
    }
  }

  diffs.querySelectorAll('.diff-opt').forEach(opt=>{
    opt.addEventListener('click', ()=>{
      diffs.querySelectorAll('.diff-opt').forEach(o=>{
        o.classList.remove('active');
        o.setAttribute('aria-checked','false');
      });
      opt.classList.add('active');
      opt.setAttribute('aria-checked','true');
      currentSize = parseInt(opt.dataset.size, 10);
    });
    opt.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); opt.click(); } });
  });
  diffs.querySelectorAll('.diff-opt').forEach(o=>o.classList.remove('active'));
  const defaultOpt = diffs.querySelector('[data-size="6"]');
  defaultOpt.classList.add('active');
  diffs.querySelectorAll('.diff-opt').forEach(o=> o.setAttribute('aria-checked', o===defaultOpt ? 'true':'false'));

  generateBtn.addEventListener('click', ()=>{
    if(!currentImageData) return;
    generateBtn.disabled = true;
    const originalHtml = generateBtn.innerHTML;
    generateBtn.textContent = 'Génération...';

    switchTab('play');

    requestAnimationFrame(()=>{
      buildPuzzle(currentImageData, currentSize);
      addToLibrary(currentImageData, currentSize, currentFileName);
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalHtml;
    });
  });

  function labelForSize(n){
    if(n===4) return 'Facile (4×4)';
    if(n===6) return 'Moyen (6×6)';
    if(n===8) return 'Difficile (8×8)';
    if(n===10) return 'Expert (10×10)';
    return n+'×'+n;
  }

  function parseDifficultyToSize(difficulty){
    const text = String(difficulty || '').trim().toLowerCase();
    if(text.includes('facile')) return 4;
    if(text.includes('moyen')) return 6;
    if(text.includes('difficile')) return 8;
    if(text.includes('expert')) return 10;
    return 6;
  }

  const playEmpty = document.getElementById('playEmpty');
  const playContent = document.getElementById('playContent');
  const trayPanel = document.getElementById('trayPanel');
  const tray = document.getElementById('tray');
  const trayCountEl = document.getElementById('trayCount');
  const expandTrayBtn = document.getElementById('expandTrayBtn');
  const assemblyZone = document.getElementById('assemblyZone');
  const assemblyGuide = document.getElementById('assemblyGuide');
  const assemblyGrid = document.getElementById('assemblyGrid');
  const movesCount = document.getElementById('movesCount');
  const timeCount = document.getElementById('timeCount');
  const placedCount = document.getElementById('placedCount');
  const totalCount = document.getElementById('totalCount');
  const diffLabel = document.getElementById('diffLabel');
  const progressFill = document.getElementById('progressFill');
  const winBanner = document.getElementById('winBanner');
  const winMoves = document.getElementById('winMoves');
  const winTime = document.getElementById('winTime');
  const guideBtn = document.getElementById('guideBtn');
  const quitBtn = document.getElementById('quitBtn');
  const magnifier = document.getElementById('pieceMagnifier');
  const libGrid = document.getElementById('libGrid');
  const emptyMsg = document.getElementById('emptyMsg');

  expandTrayBtn.addEventListener('click', ()=>{
    const expanded = trayPanel.classList.toggle('expanded');
    expandTrayBtn.setAttribute('aria-expanded', String(expanded));
    expandTrayBtn.textContent = expanded ? 'Réduire' : 'Agrandir';
  });

  quitBtn.addEventListener('click', ()=>{
    clearInterval(timerInterval);
    playEmpty.style.display = 'block';
    playContent.style.display = 'none';
    switchTab('create');
  });

  let size = 6;
  let imgSrc = null;
  let total = 0;
  let slotOccupancy = [];
  let correctCountVal = 0;
  let moves = 0;
  let seconds = 0;
  let started = false;
  let timerInterval = null;
  let guideVisible = false;
  let currentImgRatio = 1;

  guideBtn.addEventListener('click', ()=>{
    guideVisible = !guideVisible;
    assemblyGuide.style.display = guideVisible ? 'block' : 'none';
    guideBtn.setAttribute('aria-label', guideVisible ? 'Masquer l aperçu de l image' : 'Afficher l aperçu de l image complète');
    guideBtn.innerHTML = guideVisible
      ? '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> Masquer'
      : '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Aperçu';
  });

  function buildGridOverlay(){
    assemblyGrid.innerHTML = '';
    for(let i=1; i<size; i++){ 
      const h = document.createElement('div');
      h.className = 'grid-line h';
      h.style.top = (i/size*100)+'%';
      assemblyGrid.appendChild(h);
      const v = document.createElement('div');
      v.className = 'grid-line v';
      v.style.left = (i/size*100)+'%';
      assemblyGrid.appendChild(v);
    }
  }

  function resizeAssemblyZone() {
    if (!currentImgRatio) return;
    const parent = assemblyZone.parentElement;
    const maxWidth = Math.max(240, Math.min(parent.clientWidth - 12, 800));
    const maxHeight = Math.max(260, Math.min(window.innerHeight * 0.58, 680));

    let w = maxWidth;
    let h = w / currentImgRatio;

    if (h > maxHeight) {
      h = maxHeight;
      w = h * currentImgRatio;
    }

    if (w > maxWidth) {
      w = maxWidth;
      h = w / currentImgRatio;
    }

    assemblyZone.style.maxWidth = '100%';
    assemblyZone.style.width = Math.round(w) + 'px';
    assemblyZone.style.height = Math.round(h) + 'px';
  }

  function updateTrayCount(){
    const remaining = tray.querySelectorAll('.piece').length;
    trayCountEl.textContent = `(${remaining})`;
  }

  function buildPuzzle(src, s){
    imgSrc = src;
    size = s;
    total = size*size;
    playEmpty.style.display = 'none';
    playContent.style.display = 'block';
    playTabBtn.disabled = false;

    diffLabel.textContent = labelForSize(size);
    totalCount.textContent = total;
    placedCount.textContent = '0';
    movesCount.textContent = '0';
    timeCount.textContent = '00:00';
    winBanner.style.display = 'none';
    moves = 0; seconds = 0; started = false; correctCountVal = 0;
    clearInterval(timerInterval);
    progressFill.style.width = '0%';

    trayPanel.classList.remove('expanded');
    expandTrayBtn.textContent = 'Agrandir';
    expandTrayBtn.setAttribute('aria-expanded', 'false');
    magnifier.classList.remove('show');

    let pxSize = 48;
    if(total > 36) pxSize = 42;
    if(total > 64) pxSize = 36;
    tray.style.setProperty('--tray-piece-size', pxSize + 'px');

    assemblyGuide.style.backgroundImage = `url(${src})`;
    guideVisible = false;
    assemblyGuide.style.display = 'none';
    guideBtn.setAttribute('aria-label', 'Afficher l aperçu de l image complète');
    guideBtn.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Aperçu';

    tray.innerHTML = '';
    assemblyZone.querySelectorAll('.piece').forEach(p=>p.remove());
    slotOccupancy = new Array(total).fill(null);
    buildGridOverlay();

    const tempImg = new Image();
    tempImg.onload = function() {
      currentImgRatio = tempImg.naturalWidth / tempImg.naturalHeight;
      resizeAssemblyZone();
      window.dispatchEvent(new Event('resize'));
    };
    tempImg.onerror = function(){ console.error('Impossible de charger l image du puzzle.'); };
    tempImg.src = src;

    const order = [...Array(total).keys()];
    for(let i=order.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    order.forEach(correctIndex=>{
      const piece = createPiece(correctIndex);
      tray.appendChild(piece);
    });
    updateTrayCount();
  }

  function createPiece(correctIndex){
    const div = document.createElement('div');
    div.className = 'piece';
    div.dataset.correct = correctIndex;
    div.dataset.slot = '';
    const row = Math.floor(correctIndex/size);
    const col = correctIndex%size;
    div.style.backgroundImage = `url(${imgSrc})`;
    div.style.backgroundSize = `${size*100}% ${size*100}%`;
    div.style.backgroundPosition = `${size>1 ? (col/(size-1))*100 : 0}% ${size>1 ? (row/(size-1))*100 : 0}%`;
    attachDrag(div);
    attachMagnifier(div);
    return div;
  }

  function attachMagnifier(piece){
    piece.addEventListener('pointerenter', ()=>{
      if(piece.classList.contains('dragging')) return;
      magnifier.style.backgroundImage = piece.style.backgroundImage;
      magnifier.style.backgroundSize = piece.style.backgroundSize;
      magnifier.style.backgroundPosition = piece.style.backgroundPosition;
      magnifier.classList.add('show');
    });
    piece.addEventListener('pointerleave', ()=> magnifier.classList.remove('show'));
  }

  function attachDrag(piece){
    piece.addEventListener('pointerdown', (e)=>{
      if(piece.classList.contains('correct')) return;
      e.preventDefault();

      magnifier.classList.remove('show');
      assemblyGrid.classList.add('show');

      const rect = piece.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const originSlot = piece.dataset.slot;

      if(originSlot !== ''){
        slotOccupancy[parseInt(originSlot,10)] = null;
      }

      const w = rect.width, h = rect.height;
      piece.style.width = w+'px';
      piece.style.height = h+'px';
      piece.classList.add('dragging');
      document.body.appendChild(piece);
      piece.style.left = rect.left+'px';
      piece.style.top = rect.top+'px';
      updateTrayCount();

      piece.setPointerCapture(e.pointerId);

      function onMove(ev){
        piece.style.left = (ev.clientX - offsetX)+'px';
        piece.style.top = (ev.clientY - offsetY)+'px';
      }
      function onUp(ev){
        piece.removeEventListener('pointermove', onMove);
        piece.removeEventListener('pointerup', onUp);
        piece.classList.remove('dragging');
        piece.style.width = '';
        piece.style.height = '';
        piece.style.left = '';
        piece.style.top = '';
        assemblyGrid.classList.remove('show');
        handleDrop(piece, ev.clientX, ev.clientY);
      }
      piece.addEventListener('pointermove', onMove);
      piece.addEventListener('pointerup', onUp);
    });
  }

  function handleDrop(piece, clientX, clientY){
    const zoneRect = assemblyZone.getBoundingClientRect();
    const inside = clientX >= zoneRect.left && clientX <= zoneRect.right && clientY >= zoneRect.top && clientY <= zoneRect.bottom;

    if(!inside){
      returnToTray(piece);
      return;
    }

    if(!started){ started = true; startTimer(); }

    const pieceW = zoneRect.width / size;
    const pieceH = zoneRect.height / size;

    const relX = clientX - zoneRect.left;
    const relY = clientY - zoneRect.top;
    let col = Math.floor(relX / pieceW);
    let row = Math.floor(relY / pieceH);
    col = Math.max(0, Math.min(size-1, col));
    row = Math.max(0, Math.min(size-1, row));
    const slot = row*size+col;

    moves++;
    movesCount.textContent = moves;

    if(slotOccupancy[slot] && slotOccupancy[slot] !== piece){
      returnToTray(piece);
      return;
    }

    slotOccupancy[slot] = piece;
    piece.dataset.slot = slot;
    piece.classList.add('placed-zone');

    piece.style.width = pieceW + 'px';
    piece.style.height = pieceH + 'px';
    piece.style.left = (col * pieceW) + 'px';
    piece.style.top = (row * pieceH) + 'px';
    assemblyZone.appendChild(piece);

    if(parseInt(piece.dataset.correct,10) === slot){
      piece.classList.add('correct');
      correctCountVal++;
      placedCount.textContent = correctCountVal;
      progressFill.style.width = Math.round((correctCountVal/total)*100)+'%';
      checkWin();
    } else {
      piece.classList.remove('correct');
    }
    updateTrayCount();
  }

  function returnToTray(piece){
    piece.dataset.slot = '';
    piece.classList.remove('placed-zone');
    piece.style.position = '';
    piece.style.left = '';
    piece.style.top = '';
    piece.style.width = '';
    piece.style.height = '';
    tray.appendChild(piece);
    updateTrayCount();
  }

  function startTimer(){
    clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      seconds++;
      const m = String(Math.floor(seconds/60)).padStart(2,'0');
      const s = String(seconds%60).padStart(2,'0');
      timeCount.textContent = `${m}:${s}`;
    },1000);
  }

  function checkWin(){
    if(correctCountVal === total){
      clearInterval(timerInterval);
      winMoves.textContent = moves;
      winTime.textContent = timeCount.textContent;
      winBanner.style.display = 'block';
      addToLibrary(imgSrc, size, currentFileName);
    }
  }

  window.addEventListener('resize', debounce(()=>{
    if(!imgSrc) return;
    resizeAssemblyZone();
    const zoneRect = assemblyZone.getBoundingClientRect();
    const pieceW = zoneRect.width / size;
    const pieceH = zoneRect.height / size;
    assemblyZone.querySelectorAll('.piece.placed-zone').forEach(p=>{
      const slot = parseInt(p.dataset.slot,10);
      const row = Math.floor(slot/size), col = slot%size;
      p.style.width = pieceW + 'px';
      p.style.height = pieceH + 'px';
      p.style.left = (col * pieceW) + 'px';
      p.style.top = (row * pieceH) + 'px';
    });
    buildGridOverlay();
  }, 120));

  async function addToLibrary(src, s, name='Image importée'){
    const normalizedName = (name || '').trim() || 'Image importée';
    
    try {
      const result = await window.pywebview.api.save_puzzle(normalizedName, src, labelForSize(s));
      if (result.success) {
        renderLibrary();
      } else {
        alert('Erreur sauvegarde: ' + result.error);
      }
    } catch (err) {
      console.error('Erreur addToLibrary:', err);
      alert('Erreur sauvegarde du puzzle');
    }
  }

  async function removeFromLibrary(id){
    try {
      const result = await window.pywebview.api.delete_puzzle(id);
      if (result.success) {
        renderLibrary();
      }
    } catch (err) {
      console.error('Erreur removeFromLibrary:', err);
    }
  }

  async function renderLibrary(){
    try {
      const list = await window.pywebview.api.load_library();
      libGrid.innerHTML = '';
      if(!list || list.length===0){ emptyMsg.style.display='block'; return; }
      emptyMsg.style.display='none';
      
      for(const item of list){
        const imageUrl = await window.pywebview.api.load_puzzle_image(item.id);
        
        const el = document.createElement('div');
        el.className = 'lib-item';
        el.setAttribute('role','button');
        el.setAttribute('tabindex','0');
        const label = item.name || labelForSize(parseDifficultyToSize(item.difficulty));
        el.setAttribute('aria-label', `Ouvrir le puzzle ${escapeHtml(label)}, ${item.difficulty}`);
        el.innerHTML = `
          <img src="${imageUrl}" alt="${escapeHtml(label)}" loading="lazy">
          <div class="meta"><b>${escapeHtml(label)}</b><div>${escapeHtml(item.date)}</div></div>
          <button type="button" class="del-btn" title="Supprimer" aria-label="Supprimer ce puzzle de la bibliothèque">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        `;
        el.addEventListener('click', (e)=>{
          if(e.target.closest('.del-btn')) return;
          switchTab('play');
          requestAnimationFrame(()=> buildPuzzle(imageUrl, parseDifficultyToSize(item.difficulty)));
        });
        el.addEventListener('keydown', (e)=>{
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            switchTab('play');
            requestAnimationFrame(()=> buildPuzzle(imageUrl, parseDifficultyToSize(item.difficulty)));
          }
        });
        el.querySelector('.del-btn').addEventListener('click', (e)=>{
          e.stopPropagation();
          if(confirm('Supprimer ce puzzle de la bibliothèque ?')){
            removeFromLibrary(item.id);
          }
        });
        libGrid.appendChild(el);
      }
    } catch (err) {
      console.error('Erreur renderLibrary:', err);
    }
  }

  // ---- Paramètres ----
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const discordToggle = document.getElementById('discordToggle');
  const statsCount = document.getElementById('statsCount');
  const statsSize = document.getElementById('statsSize');

  async function openSettingsModal(){
    settingsModal.classList.add('show');

    try {
      const settings = await window.pywebview.api.load_settings();
      discordToggle.classList.toggle('on', settings.discord_enabled !== false);
    } catch (err) {
      console.error('Erreur load_settings:', err);
    }

    try {
      const stats = await window.pywebview.api.get_library_stats();
      if (stats && stats.success) {
        statsCount.textContent = stats.count;
        statsSize.textContent = stats.size_mb + ' MB';
      }
    } catch (err) {
      console.error('Erreur get_library_stats:', err);
    }
  }

  function closeSettingsModal(){
    settingsModal.classList.remove('show');
  }

  settingsBtn.addEventListener('click', openSettingsModal);
  settingsCloseBtn.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e)=>{
    if(e.target === settingsModal) closeSettingsModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && settingsModal.classList.contains('show')) closeSettingsModal();
  });

  discordToggle.addEventListener('click', async ()=>{
    const enabling = !discordToggle.classList.contains('on');
    discordToggle.classList.toggle('on', enabling);
    try {
      await window.pywebview.api.toggle_discord(enabling);
    } catch (err) {
      console.error('Erreur toggle_discord:', err);
    }
  });

  // Attendre que PyWebView soit prêt
  function initLibrary() {
    if (window.pywebview && window.pywebview.api) {
      renderLibrary();
    } else {
      setTimeout(initLibrary, 100);
    }
  }

  initLibrary();
})();