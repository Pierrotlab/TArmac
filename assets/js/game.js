(function () {
  // ================= CONFIG =================
  const ASSETS_PATH = "assets/images/jeu/";
  const BASE_W = 360;
  const BASE_H = 640;

  // ================= PHYSICS =================
  const GRAVITY = 0.7;
  const FLAP = -12;
  const MAX_VY = 5;

  // ================= SPAWN =================
  const BASE_SPAWN_INTERVAL = 1400;

  // ================= DOM =================
  let canvas, ctx, container;
  let scale = 1;

  // ================= STATE =================
  let lastTime = 0;
  let running = false;
  let inMenu = true;
  let player = null;
  let mouettes = [];
  let bgX = 0;
  let spawnAcc = 0;
  let score = 0;

  // ================= UI =================
  let menuEl, playBtn, planeBtns, scoreEl;

  // ================= IMAGES =================
  const images = {};
  const assets = [
    ["bg", ASSETS_PATH + "fond_ciel.gif"],
    ["mouette", ASSETS_PATH + "mouette.png"],
    ["biplan", ASSETS_PATH + "biplan.gif"],
    ["hydravion", ASSETS_PATH + "hydravion.gif"],
    ["chasse", ASSETS_PATH + "chasse.gif"],
    ["guerre", ASSETS_PATH + "guerre.gif"]
  ];

  let selectedPlaneKey = "biplan";
  let loopId = null;
  let initialized = false;

  // ================= HANDLERS =================
  const handlers = {
    onPlayClick: null,
    onPlaneClick: null,
    onCanvasPointerDown: null,
    onKeyDown: null,
    onResize: null,
    onPageHide: null,
    onVisibilityChange: null
  };

  // ================= PRELOAD =================
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


  // ================= SETUP DOM =================
  function setupDOM() {
    container = document.getElementById("game-container");
    if (!container) return false;

    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");

    menuEl = document.getElementById("menu");
    playBtn = document.getElementById("play-btn");
    planeBtns = Array.from(document.querySelectorAll(".plane-option"));

    scoreEl = document.getElementById("scoretext");
    if (!scoreEl) {
      scoreEl = document.createElement("div");
      scoreEl.id = "scoretext";
      scoreEl.textContent = "0";
      container.appendChild(scoreEl);
    }

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
      if (inMenu) startGame();
      else flap();
    };
    canvas.addEventListener("pointerdown", handlers.onCanvasPointerDown);

    handlers.onKeyDown = e => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (inMenu) startGame();
        else flap();
      }
    };
    window.addEventListener("keydown", handlers.onKeyDown);

    handlers.onResize = resize;
    window.addEventListener("resize", handlers.onResize);

    handlers.onPageHide = () => {
      if (loopId) cancelAnimationFrame(loopId);
      loopId = null;
    };
    window.addEventListener("pagehide", handlers.onPageHide);

    handlers.onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && loopId) {
        cancelAnimationFrame(loopId);
        loopId = null;
      }
    };
    document.addEventListener("visibilitychange", handlers.onVisibilityChange);

    return true;
  }

  function removeHandlers() {
    try {
      playBtn?.removeEventListener("click", handlers.onPlayClick);
      planeBtns?.forEach(b => b.removeEventListener("click", handlers.onPlaneClick));
      canvas?.removeEventListener("pointerdown", handlers.onCanvasPointerDown);
    } catch {}
    window.removeEventListener("keydown", handlers.onKeyDown);
    window.removeEventListener("resize", handlers.onResize);
    window.removeEventListener("pagehide", handlers.onPageHide);
    document.removeEventListener("visibilitychange", handlers.onVisibilityChange);
    Object.keys(handlers).forEach(k => handlers[k] = null);
  }

  function destroy() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;
    removeHandlers();
    lastTime = 0;
    running = false;
    inMenu = true;
    player = null;
    mouettes = [];
    bgX = 0;
    spawnAcc = 0;
    elapsed = 0;
    initialized = false;
  }

  // ================= RESIZE =================
  function resize() {
    const w = container.clientWidth || BASE_W;
    scale = w / BASE_W;
    canvas.style.width = BASE_W * scale + "px";
    canvas.style.height = BASE_H * scale + "px";
    canvas.width = BASE_W;
    canvas.height = BASE_H;
  }

  // ================= PLAYER =================
  function createPlayer() {
    return {
      x: BASE_W * 0.7,
      y: BASE_H * 0.45,
      w: 72,
      h: 54,
      vy: 0,
      alive: true
    };
  }

  function flap() {
    if (!player || !player.alive) return;
    player.vy = FLAP;
  }

  // ================= MOUETTES =================
  function spawnMouette() {
    const difficulty = Math.min(1, elapsed / 60000);
    const spread = 200 - difficulty * 120;
    const baseY = player ? player.y : BASE_H / 2;

    const y = Math.max(40, Math.min(BASE_H - 40, baseY + (Math.random() - 0.5) * spread));

    mouettes.push({
      x: -80,
      y,
      w: 64*0.7,
      h: 64*0.7,
      speed: 2.6 + difficulty * 2,
      frame: 0
    });
  }

  function updateMouettes(dt) {
    mouettes.forEach(m => {
      m.x += m.speed * dt / 16;
      m.frame = (m.frame + dt / 100) % 4;
    });
    mouettes = mouettes.filter(m => m.x < BASE_W + 100);
  }

  // ================= COLLISIONS =================
  function overlap(a, b) {
    const shrink = 0.6;
    const pa = {
      x: a.x + a.w * (1 - shrink) / 2,
      y: a.y + a.h * (1 - shrink) / 2,
      w: a.w * shrink,
      h: a.h * shrink
    };
    return !(pa.x + pa.w < b.x || pa.x > b.x + b.w || pa.y + pa.h < b.y || pa.y > b.y + b.h);
  }

  function checkCollisions() {
    if (!player) return;
    const pb = {
      x: player.x - player.w / 2,
      y: player.y - player.h / 2,
      w: player.w,
      h: player.h
    };

    for (const m of mouettes) {
      const mb = {
        x: m.x - m.w / 2,
        y: m.y - m.h / 2,
        w: m.w,
        h: m.h
      };
      if (overlap(pb, mb)) {
        player.alive = false;
        running = false;
        showGameOver();
        break;
      }
    }
  }

  // ================= DRAW =================
  function drawBackground(dt) {
  const bg = images.bg;
  if (!bg) return;

  const scaleH = BASE_H / bg.height;
  const bgWidth = bg.width * scaleH;

  // défiler vers la droite
  bgX += 0.35 * dt / 16;
  if (bgX >= bgWidth) bgX = 0;

  // commencer le dessin à -bgWidth + bgX pour que l'image précédente couvre le vide
  for (let x = -bgWidth + bgX; x < BASE_W; x += bgWidth) {
    ctx.drawImage(bg, x, 0, bgWidth, BASE_H);
  }
}

  function drawPlayer() {
    const img = images[selectedPlaneKey];
    if (!img || !player) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.max(-0.45, Math.min(0.45, -player.vy / 12)));
    ctx.drawImage(img, -player.w / 2, -player.h / 2, player.w, player.h);
    ctx.restore();
  }

  function drawMouettes() {
    const img = images.mouette;
    if (!img) return;
    mouettes.forEach(m => {
      ctx.drawImage(img, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h);
    });
  }

  // ================= LOOP =================
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;

    const speedCorr = dt / 16.67;

    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawBackground(dt);

    if (running && player && player.alive) {
      player.vy += GRAVITY*speedCorr;
      player.y += player.vy*speedCorr;

      const TOP_LIMIT = -20;
      const BOTTOM_LIMIT = BASE_H + 50;

      if (player.y < TOP_LIMIT + player.h / 2) {
        player.y = TOP_LIMIT + player.h / 2;
        player.vy = 0;
      }

      if (player.y > BOTTOM_LIMIT - player.h / 2) {
        player.y = BOTTOM_LIMIT - player.h / 2;
        player.vy = 0;
        running = false;
        showGameOver();
      }

      spawnAcc += dt;
      const interval = BASE_SPAWN_INTERVAL - Math.min(800, elapsed / 80);
      if (spawnAcc > interval) {
        spawnAcc = 0;
        spawnMouette();
      }

      score += dt*0.01; 
      if (scoreEl) scoreEl.textContent = Math.floor(score);

      updateMouettes(dt);
      checkCollisions();
    }

    drawMouettes();
    drawPlayer();

    loopId = requestAnimationFrame(loop);
  }

  // ================= FLOW =================
  function startGame() {
    lastTime = 0;
    score = 0;
    spawnAcc = 0;
    bgX = 0;
    player = createPlayer();
    mouettes = [];
    menuEl.style.display = "none";
    if(scoreEl){
      scoreEl.textContent= "0";
      scoreEl.style.display = "block";
    }
    running = true;
    inMenu = false;
  }

  function showGameOver() {
    if (container.querySelector(".go-overlay")) return;

    const go = document.createElement("div");
    go.className = "go-overlay";

    const title = document.createElement("div");
    title.className = "go-title";
    title.textContent = "Perdu !";
    go.appendChild(title);

    const scoreDisplay = document.createElement("div");
    scoreDisplay.className = "go-score";
    scoreDisplay.textContent = "Score : " + Math.floor(score);
    go.appendChild(scoreDisplay);

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "8px";

    const replay = document.createElement("button");
    replay.className = "go-btn primary";
    replay.textContent = "Rejouer";
    replay.onclick = () => { go.remove(); startGame(); };

    const home = document.createElement("button");
    home.className = "go-btn secondary";
    home.textContent = "Menu";
    home.onclick = () => { go.remove(); backToMenu(); };

    btns.appendChild(replay);
    btns.appendChild(home);
    go.appendChild(btns);

    container.appendChild(go);
  }

  function backToMenu() {
    inMenu = true;
    running = false;
    player = null;
    mouettes = [];
    if (menuEl) menuEl.style.display = "flex";
    if (scoreEl) scoreEl.style.display = "none";
    if (!loopId) loopId = requestAnimationFrame(loop);
  }

  // ================= PUBLIC INIT =================

  async function startGameEngine() {
    // 1. On nettoie tout ce qui pourrait rester d'une session précédente
    destroy(); 

    // 2. IMPORTANT : On force setupDOM() à chaque fois 
    // car le HTML vient d'être ré-injecté par navigateTo
    if (setupDOM()) {        
        // 3. On s'assure que les images sont là
        if (Object.keys(images).length === 0) {
            await preload();
        }

        // 4. On lance l'affichage
        resize();
        if (menuEl) menuEl.style.display = "flex";
        inMenu = true;

        // 5. On lance la boucle de rendu si elle n'est pas active
        if (!loopId) {
            loopId = requestAnimationFrame(loop);
        }
    } else {
        console.error("Impossible de trouver les éléments du jeu (canvas, container...)");
    }
  }

  window.startGameEngine = startGameEngine;
})();
