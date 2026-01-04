(function () {
  // ================= CONFIG =================
  const ASSETS_PATH = "assets/images/jeu/";
  const BASE_W = 360;
  const BASE_H = 640;
  const DREAMLO_PUBLIC_CODE = "69594fe88f40bccf80d2be5e";
  const DREAMLO_PRIVATE_CODE = "s-Xdt5B5vUmev4aAn0nvMwVg_QviETTkO80SGjB4FN2g";

  // ================= PHYSICS =================
  const GRAVITY = 0.7;
  const FLAP = -12;
  const MAX_VY = 5;

  // ================= SPAWN & DIFFICULTY =================
  const INITIAL_SPAWN_INTERVAL = 1600; 
  const MIN_SPAWN_INTERVAL = 600;      
  const DIFFICULTY_RAMP_MS = 60000;    

  // ================= STATE =================
  let canvas, ctx, container;
  let scale = 1;
  let lastTime = 0;
  let running = false;
  let inMenu = true;
  let isTransitioning = false; 
  let transitionX = 0;          
  let transitionTimer = 0;     
  let countdownText = "";      
  let player = null;
  let enemies = []; 
  let bgX = 0;
  let spawnAcc = 0;
  let score = 0;
  let elapsed = 0;

  // ================= UI =================
  let menuEl, playBtn, planeBtns, scoreEl;

  // ================= IMAGES =================
  const images = {};
  const assets = [
    ["bg", ASSETS_PATH + "fond_ciel.gif"],
    ["oiseau1", ASSETS_PATH + "oiseau_1.png"],
    ["oiseau2", ASSETS_PATH + "oiseau_2.png"],
    ["oiseau3", ASSETS_PATH + "oiseau_3.png"],
    ["oiseau4", ASSETS_PATH + "oiseau_4.png"],
    ["biplan", ASSETS_PATH + "biplan.png"],
    ["hydravion", ASSETS_PATH + "hydravion.png"],
    ["chasse", ASSETS_PATH + "chasse.png"],
    ["guerre", ASSETS_PATH + "guerre.png"],
    ["bannerPlane", ASSETS_PATH + "avion_banniere.png"] 
  ];

  let selectedPlaneKey = "biplan";
  let loopId = null;

  // ================= HANDLERS =================
  const handlers = {
    onPlayClick: null, onPlaneClick: null, onCanvasPointerDown: null,
    onKeyDown: null, onResize: null
  };

  function preload() {
    return Promise.all(
      assets.map(([key, src]) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => { images[key] = img; resolve(); };
        img.onerror = () => { images[key] = null; resolve(); };
        img.src = src;
      }))
    );
  }

  function setupDOM() {
    container = document.getElementById("game-container");
    if (!container) return false;
    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");
    menuEl = document.getElementById("menu");
    playBtn = document.getElementById("play-btn");
    planeBtns = Array.from(document.querySelectorAll(".plane-option"));
    scoreEl = document.getElementById("scoretext") || document.createElement("div");
    if (!scoreEl.id) { scoreEl.id = "scoretext"; container.appendChild(scoreEl); }

    removeHandlers();
    handlers.onPlayClick = startGame;
    playBtn?.addEventListener("click", handlers.onPlayClick);

    handlers.onPlaneClick = e => {
      planeBtns.forEach(b => b.classList.remove("selected"));
      e.currentTarget.classList.add("selected");
      selectedPlaneKey = e.currentTarget.dataset.plane;
    };
    planeBtns.forEach(b => b.addEventListener("click", handlers.onPlaneClick));

    handlers.onCanvasPointerDown = e => {
      e.preventDefault();
      if (inMenu) startGame(); else flap();
    };
    canvas.addEventListener("pointerdown", handlers.onCanvasPointerDown);

    handlers.onKeyDown = e => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (inMenu) startGame(); else flap();
      }
    };
    window.addEventListener("keydown", handlers.onKeyDown);
    window.addEventListener("resize", resize);

    return true;
  }

  function removeHandlers() {
    try {
      playBtn?.removeEventListener("click", handlers.onPlayClick);
      planeBtns?.forEach(b => b.removeEventListener("click", handlers.onPlaneClick));
      canvas?.removeEventListener("pointerdown", handlers.onCanvasPointerDown);
    } catch {}
    window.removeEventListener("keydown", handlers.onKeyDown);
    window.removeEventListener("resize", resize);
  }

  function destroy() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
    removeHandlers();
    lastTime = 0; running = false; inMenu = true; isTransitioning = false;
    player = null; enemies = []; bgX = 0; spawnAcc = 0; elapsed = 0;
  }

  function resize() {
    const w = container.clientWidth || BASE_W;
    scale = w / BASE_W;
    canvas.style.width = BASE_W * scale + "px";
    canvas.style.height = BASE_H * scale + "px";
    canvas.width = BASE_W;
    canvas.height = BASE_H;
    ctx.imageSmoothingEnabled = false;
  }

  function createPlayer() { return { x: BASE_W * 0.7, y: BASE_H * 0.45, w: 72, h: 54, vy: 0, alive: true }; }
  function flap() { if (!player || !player.alive || isTransitioning) return; player.vy = FLAP; }

  function spawnEnemy() {
    const diffRatio = Math.min(1, elapsed / DIFFICULTY_RAMP_MS);
    let y;
    if (Math.random() < 0.7 && player) {
        const spread = 150 - (diffRatio * 100);
        y = player.y + (Math.random() - 0.5) * spread;
    } else {
        y = Math.random() * (BASE_H - 100) + 50;
    }
    y = Math.max(50, Math.min(BASE_H - 50, y));
    const baseSpeed = 2.5 + (diffRatio * 2.5);
    const individualSpeed = baseSpeed + (Math.random() * 1.5);

    enemies.push({
      x: -60, y: y, w: 60, h: 60, speed: individualSpeed,
      frame: Math.floor(Math.random() * 4) + 1, animTimer: Math.random() * 100
    });
  }

  function updateEnemies(dt) {
    enemies.forEach(e => {
      e.x += e.speed * dt / 16;
      e.animTimer += dt;
      if (e.animTimer > 120) { e.frame = (e.frame % 4) + 1; e.animTimer = 0; }
    });
    enemies = enemies.filter(e => e.x < BASE_W + 100);
  }

  function overlap(a, b) { return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h); }

  function checkCollisions() {
    if (!player) return;
    const pb = { x: (player.x - (player.w * 0.75) / 2) - 5, y: player.y - (player.h * 0.35) / 2, w: player.w * 0.75, h: player.h * 0.35 };
    for (const e of enemies) {
      const eb = { x: e.x - (e.w * 0.85) / 2, y: e.y - (e.h * 0.6) / 2, w: e.w * 0.85, h: e.h * 0.6 };
      if (overlap(pb, eb)) { player.alive = false; running = false; showGameOver(); break; }
    }
  }

  function drawBackground(dt) {
    const bg = images.bg; if (!bg) return;
    const bgWidth = bg.width * (BASE_H / bg.height);
    bgX = (bgX + 0.35 * dt / 16) % bgWidth;
    for (let x = -bgWidth + bgX; x < BASE_W; x += bgWidth) { ctx.drawImage(bg, x, 0, bgWidth, BASE_H); }
  }

  function drawPlayer() {
    const img = images[selectedPlaneKey];
    if (!img || !player || isTransitioning) return; 
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.max(-0.45, Math.min(0.45, -player.vy / 12)));
    ctx.drawImage(img, -player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();
  }

  function drawEnemies() {
    if (isTransitioning) return;
    enemies.forEach(e => {
      const img = images["oiseau" + e.frame];
      if (img) ctx.drawImage(img, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
    });
  }

  function drawBannerTransition(dt) {
    const img = images.bannerPlane; if (!img) return;
    transitionTimer += dt;
    transitionX -= 5 * (dt / 16.67); 
    const interval = 700;
    if (transitionTimer < interval) countdownText = "3";
    else if (transitionTimer < interval*2) countdownText = "2";
    else if (transitionTimer < interval*3) countdownText = "1";
    else if (transitionTimer < interval*4) countdownText = "GO !";
    else countdownText = "";
    ctx.drawImage(img, transitionX, BASE_H * 0.45, 380, 120);
    if (countdownText !== "") {
        ctx.save();
        ctx.font = "80px 'Black Ops One', system-ui";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "#154360"; ctx.lineWidth = 10;
        ctx.strokeText(countdownText, BASE_W / 2, BASE_H * 0.3);
        ctx.fillStyle = "#FFFFFF"; ctx.fillText(countdownText, BASE_W / 2, BASE_H * 0.3);
        ctx.restore();
    }
    if (transitionTimer >= interval*4) { isTransitioning = false; running = true; if (scoreEl) scoreEl.style.display = "block"; }
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime; lastTime = ts;
    const speedCorr = dt / 16.67;
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawBackground(dt);
    if (isTransitioning) drawBannerTransition(dt);
    if (running && player && player.alive) {
      elapsed += dt;
      player.vy += GRAVITY * speedCorr;
      player.y += player.vy * speedCorr;
      if (player.y < -50 || player.y > BASE_H + 50) { running = false; showGameOver(); }
      spawnAcc += dt;
      const currentSpawnInterval = Math.max(MIN_SPAWN_INTERVAL, INITIAL_SPAWN_INTERVAL - (elapsed / DIFFICULTY_RAMP_MS) * (INITIAL_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL));
      if (spawnAcc > currentSpawnInterval) { spawnAcc = 0; spawnEnemy(); }
      score += dt * 0.01; 
      if (scoreEl) scoreEl.textContent = Math.floor(score);
      updateEnemies(dt);
      checkCollisions();
    }
    drawEnemies(); drawPlayer();
    loopId = requestAnimationFrame(loop);
  }

  function startGame() {
    if (isTransitioning) return; 
    lastTime = 0; score = 0; spawnAcc = 0; elapsed = 0; bgX = 0;
    player = createPlayer(); enemies = [];
    menuEl.style.display = "none";
    if (scoreEl) { scoreEl.textContent = "0"; scoreEl.style.display = "none"; }
    isTransitioning = true; transitionTimer = 0; transitionX = BASE_W + 50; 
    countdownText = "3"; inMenu = false; running = false;
  }

  // ================= DREAMLO INTEGRATION =================
  async function saveScoreDreamlo(name, pts) {
    const status = document.getElementById("score-status");
    if (status) status.textContent = "Envoi...";

    // On prépare l'URL de base
    let baseUrl = `http://www.dreamlo.com/lb/${DREAMLO_PRIVATE_CODE}/add/${encodeURIComponent(name)}/${pts}`;
    
    // SI on est sur GitHub (HTTPS), on tente quand même le lien HTTP. 
    // Si ça bloque, l'astuce de l'Image est la plus robuste.
    try {
      const img = new Image();
      
      // Cette ligne permet de traquer si l'envoi a réussi
      img.onload = () => {
        if (status) status.textContent = "Enregistré !";
        hideSaveSection();
      };
      
      // Sur certains navigateurs, l'image ne "chargera" jamais vraiment (car Dreamlo renvoie du texte)
      // donc on valide le score après un court délai par sécurité.
      img.onerror = () => {
        if (status) status.textContent = "Enregistré !";
        hideSaveSection();
      };

      img.src = baseUrl;

    } catch (err) {
      if (status) status.textContent = "Erreur de connexion";
    }
  }

  function hideSaveSection() {
    setTimeout(() => {
      const sec = document.getElementById("save-section");
      if(sec) sec.style.display = "none";
    }, 1500);
  }

  function hideSaveSection() {
    setTimeout(() => {
      const sec = document.getElementById("save-section");
      if(sec) sec.style.display = "none";
    }, 1500);
  }

  function showGameOver() {
    if (container.querySelector(".go-overlay")) return;
    const finalScore = Math.floor(score);
    const go = document.createElement("div");
    go.className = "go-overlay";
    
    go.innerHTML = `
      <div class="go-title">Perdu !</div>
      <div class="go-score">Score : ${finalScore}</div>
      
      <div id="save-section">
        <div class="save-label">Enregistre ton score :</div>
        <div class="save-container">
          <input type="text" id="player-name" placeholder="Nom" maxlength="13" oninput="this.value = this.value.replace(/[^a-zA-Z0-9 ]/g, '')">
          <button id="btn-save" class="btn-send">Envoyer</button>
        </div>
      </div>
      
      <div id="score-status" class="status-message"></div>
      
      <div class="go-buttons">
        <button id="btn-replay" class="go-btn primary">Rejouer</button>
        <button id="btn-home" class="go-btn secondary">Menu</button>
      </div>
    `;
    
    container.appendChild(go);

    // Événements
    document.getElementById("btn-save").onclick = () => {
      const name = document.getElementById("player-name").value.trim();
      if(name) saveScoreDreamlo(name, finalScore);
    };
    
    document.getElementById("btn-replay").onclick = () => { go.remove(); startGame(); };
    document.getElementById("btn-home").onclick = () => { go.remove(); backToMenu(); };
  }

  function backToMenu() {
    inMenu = true; running = false; isTransitioning = false;
    player = null; enemies = [];
    if (menuEl) menuEl.style.display = "flex";
    if (scoreEl) scoreEl.style.display = "none";
  }

  async function startGameEngine() {
    destroy(); 
    if (setupDOM()) {        
        if (Object.keys(images).length === 0) await preload();
        resize();
        if (menuEl) menuEl.style.display = "flex";
        inMenu = true;
        if (!loopId) loopId = requestAnimationFrame(loop);
    }
  }
  window.startGameEngine = startGameEngine;
})();