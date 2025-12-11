(function () {
  // CONFIG
  const ASSETS_PATH = "assets/images/jeu/";
  const BASE_W = 360;
  const BASE_H = 640;

  // PHYSICS
  const GRAVITY = 0.05;
  const FLAP = -4;
  const MAX_VY = 4;

  // SPAWN
  const SPAWN_INTERVAL = 1200;

  // DOM
  let canvas, ctx, container;
  let scale = 1;

  // STATE
  let lastTime = 0;
  let running = false;
  let inMenu = true;
  let player = null;
  let mouettes = [];
  let bgX = 0;
  let spawnAcc = 0;
  let elapsed = 0;

  // UI
  let menuEl, playBtn, planeBtns, chronoEl;

  // IMAGES
  const images = {};
  const assets = [
    ["bg", ASSETS_PATH + "fond_ciel.gif"],
    ["title", ASSETS_PATH + "Title.gif"],
    ["mouette", ASSETS_PATH + "mouette.gif"],

    ["biplan", ASSETS_PATH + "biplan.gif"],
    ["biplan_up", ASSETS_PATH + "biplan_haut.gif"],
    ["biplan_down", ASSETS_PATH + "biplan_bas.gif"],

    ["hydravion", ASSETS_PATH + "hydravion.gif"],
    ["hydravion_up", ASSETS_PATH + "hydravion_haut.gif"],
    ["hydravion_down", ASSETS_PATH + "hydravion_bas.gif"],

    ["chasse", ASSETS_PATH + "chasse.gif"],
    ["chasse_up", ASSETS_PATH + "chasse_haut.gif"],
    ["chasse_down", ASSETS_PATH + "chasse_bas.gif"],

    ["guerre", ASSETS_PATH + "guerre.gif"],
    ["guerre_up", ASSETS_PATH + "guerre_haut.gif"],
    ["guerre_down", ASSETS_PATH + "guerre_bas.gif"]
  ];

  let selectedPlaneKey = "biplan";
  let loopId = null; // id du requestAnimationFrame en cours

  // ---------------- PRELOAD ----------------
  function preload() {
    return Promise.all(
      assets.map(([key, src]) => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => { images[key] = img; resolve(); };
          img.onerror = () => { images[key] = null; resolve(); };
          img.src = src;
        });
      })
    );
  }

  // ---------------- SETUP DOM ----------------
  function setupDOM() {
    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");
    container = document.getElementById("game-container");

    menuEl = document.getElementById("menu");
    playBtn = document.getElementById("play-btn");
    planeBtns = Array.from(document.querySelectorAll(".plane-option"));

    // Chrono
    chronoEl = document.createElement("div");
    chronoEl.id = "chronotext";
    chronoEl.textContent = "00:00";
    container.appendChild(chronoEl);

    container.style.position = "relative";

    // Events
    playBtn.addEventListener("click", startGame);
    planeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        planeBtns.forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedPlaneKey = btn.dataset.plane;
      });
    });

    canvas.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (inMenu) startGame();
      else flap();
    });

    window.addEventListener("keydown", e => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (inMenu) startGame();
        else flap();
      }
    });
  }

  // ---------------- RESIZE ----------------
  function resize() {
    const clientW = container.clientWidth || window.innerWidth;
    scale = clientW / BASE_W;

    const cssW = Math.round(BASE_W * scale);
    const cssH = Math.round(BASE_H * scale);

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    const ratio = window.devicePixelRatio || 1;
    canvas.width = BASE_W * ratio;
    canvas.height = BASE_H * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // ---------------- PLAYER ----------------
  function createPlayer() {
    return {
      x: BASE_W * 0.65, // plus à droite
      y: BASE_H * 0.45,
      w: 72,
      h: 54,
      vy: 0,
      alive: true,
      frame: "normal"
    };
  }

  function flap() {
    if (!player || !player.alive) return;
    player.vy = FLAP;
    player.frame = "up";
    setTimeout(() => {
      if (player) player.frame = "normal";
    }, 150);
  }

  // ---------------- MOUETTES ----------------
  function spawnMouette() {
    const y = 60 + Math.random() * (BASE_H - 120);
    const x = -40;
    const speed = 2.3 + Math.random() * 1.4;
    const size = (28 + Math.random() * 22) * 1.2; // 20% plus grand
    mouettes.push({ x, y, w: size, h: size, speed });
  }

  function updateMouettes(dt) {
    for (let i = mouettes.length - 1; i >= 0; i--) {
      const m = mouettes[i];
      m.x += m.speed * (dt / (1000 / 60));
      if (m.x - m.w / 2 > BASE_W + 40) mouettes.splice(i, 1);
    }
  }

  // ---------------- COLLISIONS ----------------
  function overlap(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  function checkCollisions() {
    const pb = { x: player.x - 14, y: player.y - player.h / 2, w: player.w, h: player.h };
    for (const m of mouettes) {
      const mb = { x: m.x - m.w / 2, y: m.y - m.h / 2, w: m.w, h: m.h };
      if (overlap(pb, mb)) {
        player.alive = false;
        running = false;
        showGameOver();
        break;
      }
    }
  }

  // ---------------- DRAW ----------------
  function drawBackground() {
    const bg = images.bg;
    if (bg) {
      if (running) {
        bgX += 0.35; // inversé : défile vers la droite
        if (bgX >= BASE_W) bgX = 0;
      }
      ctx.drawImage(bg, bgX, 0, BASE_W, BASE_H);
      ctx.drawImage(bg, bgX - BASE_W, 0, BASE_W, BASE_H);
    } else {
      ctx.fillStyle = "#A9CCE3";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    }
  }

  function drawPlayer() {
    if (!player) return;

    const key =
      player.frame === "up" ? `${selectedPlaneKey}_up` :
      player.frame === "down" ? `${selectedPlaneKey}_down` :
      selectedPlaneKey;

    const img = images[key] || images[selectedPlaneKey];
    if (!img) return;

    ctx.save();
    const tilt = Math.max(-0.45, Math.min(0.45, -player.vy / 18));
    ctx.translate(player.x, player.y);
    ctx.rotate(tilt);

    // simulate "nose up" with small offset
    let offsetY = player.frame === "up" ? -6 : 0;
    ctx.drawImage(img, -player.w / 2, -player.h / 2 + offsetY, player.w, player.h);
    ctx.restore();
  }

  function drawMouettes() {
    const img = images.mouette;
    for (const m of mouettes) {
      ctx.drawImage(img, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h);
    }
  }

  function drawHUD() {
    chronoEl.textContent = formatTime(elapsed);
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  // ---------------- MAIN LOOP ----------------
  function loop(ts) {
    loopId = requestAnimationFrame(loop); // on stocke l'id

    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;

    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawBackground();

    if (running && player && player.alive) {
      // physics
      player.vy += GRAVITY;
      if (player.vy > MAX_VY) player.vy = MAX_VY;
      player.y += player.vy;

      // clamp
      const half = player.h / 2;
      if (player.y < half) {
        player.y = half;
        player.vy = 0;
      }
      if (player.y > BASE_H - half) {
        player.y = BASE_H - half;
        player.vy = 0;
        running = false;
        showGameOver();
      }

      if (player.vy > 4) player.frame = "down";

      // spawn
      spawnAcc += dt;
      if (spawnAcc > SPAWN_INTERVAL) {
        spawnAcc = 0;
        spawnMouette();
      }

      updateMouettes(dt);
      checkCollisions();
      elapsed += dt;
    }

    drawMouettes();
    drawPlayer();
    drawHUD();
  }

  // ---------------- FLOW ----------------
  function startGame() {
    // cancel previous loop to avoid accumulation
    if (loopId) cancelAnimationFrame(loopId);
    lastTime = 0;
    spawnAcc = 0;
    elapsed = 0;
    bgX = 0;

    player = createPlayer();
    mouettes = [];

    // Remove any previous Game Over overlay
    const oldGO = container.querySelector(".go-overlay");
    if (oldGO) oldGO.remove();

    menuEl.style.display = "none";
    running = true;
    inMenu = false;
    loopId = requestAnimationFrame(loop);
  }

  function showGameOver() {
    const go = document.createElement("div");
    go.className = "go-overlay";

    const title = document.createElement("div");
    title.className = "go-title";
    title.textContent = "Perdu, vous avez percuté une mouette !";
    go.appendChild(title);

    const time = document.createElement("div");
    time.className = "go-time";
    time.textContent = "Temps : " + formatTime(elapsed);
    go.appendChild(time);

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
    menuEl.style.display = "flex";
  }

  // ---------------- PUBLIC INIT ----------------
  window.startGameEngine = async function () {
    setupDOM();
    await preload();
    resize();
    window.addEventListener("resize", resize);

    menuEl.style.display = "flex";
    inMenu = true;

    loopId = requestAnimationFrame(loop);
  };
})();
