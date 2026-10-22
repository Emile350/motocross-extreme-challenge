const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const speedEl = document.getElementById('speed');
const livesEl = document.getElementById('lives');
const levelNameEl = document.getElementById('levelName');
const gameTitleEl = document.getElementById('gameTitle');
const gameNameInput = document.getElementById('gameNameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
const gameOverlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const restartBtn = document.getElementById('restartBtn');

const levelConfigs = [
  { name: 'Prairie sauvage', speed: 6, spawn: 1.15, obstacles: ['rock', 'log', 'barrier'] },
  { name: 'Forêt des épines', speed: 7.2, spawn: 1.05, obstacles: ['rock', 'log', 'barrier', 'tree'] },
  { name: 'Désert de poussière', speed: 8.5, spawn: 0.9, obstacles: ['rock', 'barrier', 'crate', 'dune'] },
  { name: 'Neige glissante', speed: 10, spawn: 0.82, obstacles: ['ice', 'barrier', 'rock', 'log'] },
  { name: 'Volcan sauvage', speed: 11.5, spawn: 0.72, obstacles: ['lava', 'barrier', 'rock', 'crate'] },
  { name: 'Finale MX', speed: 13, spawn: 0.64, obstacles: ['lava', 'barrier', 'rock', 'ice', 'crate'] },
];

const track = {
  groundY: 330,
  horizon: 180,
};

const state = {
  score: 0,
  distance: 0,
  level: 1,
  lives: 3,
  speed: 6,
  spawnTimer: 0.9,
  isGameOver: false,
  player: {
    x: 110,
    y: track.groundY - 50,
    width: 72,
    height: 50,
    velocityY: 0,
    onGround: true,
    crouching: false,
  },
  obstacles: [],
  clouds: [],
  particles: [],
  lastFrame: 0,
};

const input = {
  left: false,
  right: false,
  jump: false,
  crouch: false,
};

function resetGame() {
  state.score = 0;
  state.distance = 0;
  state.level = 1;
  state.lives = 3;
  state.speed = levelConfigs[0].speed;
  state.spawnTimer = 1;
  state.isGameOver = false;
  state.player.x = 110;
  state.player.y = track.groundY - 50;
  state.player.velocityY = 0;
  state.player.onGround = true;
  state.player.crouching = false;
  state.obstacles = [];
  state.particles = [];
  gameOverlay.classList.add('hidden');
  updateHud();
}

function getCurrentLevelConfig() {
  const safeLevel = Math.min(state.level - 1, levelConfigs.length - 1);
  return levelConfigs[safeLevel];
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  levelEl.textContent = String(state.level);
  speedEl.textContent = `${(state.speed / levelConfigs[0].speed).toFixed(1)}x`;
  livesEl.textContent = String(state.lives);
  levelNameEl.textContent = getCurrentLevelConfig().name;
  document.title = `${gameNameInput.value} | Moto Rush Xtreme`;
}

function setGameName() {
  const name = gameNameInput.value.trim() || 'Moto Rush Xtreme';
  gameTitleEl.textContent = name;
  document.title = `${name} | Moto Rush Xtreme`;
}

function jump() {
  const player = state.player;
  if (player.onGround) {
    player.velocityY = -18;
    player.onGround = false;
  }
}

function createObstacle() {
  const config = getCurrentLevelConfig();
  const type = config.obstacles[Math.floor(Math.random() * config.obstacles.length)];
  const size = {
    rock: { w: 52, h: 36 },
    log: { w: 96, h: 20 },
    barrier: { w: 80, h: 38 },
    tree: { w: 56, h: 88 },
    crate: { w: 58, h: 58 },
    dune: { w: 110, h: 34 },
    ice: { w: 70, h: 18 },
    lava: { w: 82, h: 28 },
  }[type];

  state.obstacles.push({
    type,
    x: canvas.width + 40,
    y: track.groundY - size.h,
    w: size.w,
    h: size.h,
    hit: false,
  });
}

function createParticles(x, y, color, amount = 8) {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 4 - 1,
      life: 25 + Math.random() * 20,
      color,
      radius: 2 + Math.random() * 3,
    });
  }
}

function handleInput() {
  const player = state.player;

  if (input.left) {
    player.x -= 7.5;
  }
  if (input.right) {
    player.x += 7.5;
  }

  if (input.crouch && player.onGround) {
    player.crouching = true;
  } else {
    player.crouching = false;
  }

  player.x = Math.max(30, Math.min(canvas.width - player.width - 30, player.x));
}

function update(delta) {
  if (state.isGameOver) return;

  const player = state.player;
  const config = getCurrentLevelConfig();

  handleInput();

  player.velocityY += 0.7;
  player.y += player.velocityY;

  const groundTop = track.groundY - (player.crouching ? 22 : 50);
  if (player.y >= groundTop) {
    player.y = groundTop;
    player.velocityY = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  state.distance += state.speed * delta * 10;
  state.score += state.speed * delta * 16;
  state.spawnTimer -= delta;

  if (state.spawnTimer <= 0) {
    createObstacle();
    state.spawnTimer = Math.max(0.46, config.spawn - (state.level * 0.02));
  }

  state.obstacles.forEach((obstacle) => {
    obstacle.x -= state.speed * 2.5 * delta * 60;
  });

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -20);

  state.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);

  const playerRect = {
    x: player.x + 8,
    y: player.y + 4,
    w: player.width - 12,
    h: player.height - 10,
  };

  for (const obstacle of state.obstacles) {
    const obstacleRect = { x: obstacle.x, y: obstacle.y, w: obstacle.w, h: obstacle.h };
    const intersects =
      playerRect.x < obstacleRect.x + obstacleRect.w &&
      playerRect.x + playerRect.w > obstacleRect.x &&
      playerRect.y < obstacleRect.y + obstacleRect.h &&
      playerRect.y + playerRect.h > obstacleRect.y;

    if (intersects && !obstacle.hit) {
      obstacle.hit = true;
      state.lives -= 1;
      createParticles(player.x + player.width / 2, player.y + 20, '#ff3d57', 18);

      if (state.lives <= 0) {
        state.isGameOver = true;
        overlayTitle.textContent = 'Game Over';
        overlayText.textContent = `Score final : ${Math.floor(state.score)} — appuie sur R ou le bouton pour rejouer`;
        gameOverlay.classList.remove('hidden');
      }
    }
  }

  const newLevel = Math.floor(state.score / 1100) + 1;
  if (newLevel > state.level) {
    state.level = newLevel;
    state.speed = levelConfigs[Math.min(state.level - 1, levelConfigs.length - 1)].speed;
    createParticles(canvas.width / 2, 70, '#ffb703', 18);
  }

  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#7bd8ff');
  gradient.addColorStop(0.45, '#c6efff');
  gradient.addColorStop(1, '#ecf9ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const config = getCurrentLevelConfig();
  const skyTint = ['#d0f3ff', '#dfeeff', '#ffe7d4', '#dfeaf8', '#ffd9c0', '#fce8bf'][Math.min(state.level - 1, 5)];
  ctx.fillStyle = skyTint;
  ctx.fillRect(0, 0, canvas.width, track.horizon);

  for (let i = 0; i < 8; i += 1) {
    const x = (i * 200 + (state.distance * 0.8) % 240) - 80;
    const y = 60 + (i % 3) * 28;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 18, y + 5, 18, 0, Math.PI * 2);
    ctx.arc(x - 18, y + 5, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#7ca85d';
  ctx.fillRect(0, 210, canvas.width, 20);
  ctx.fillStyle = '#5a8f47';
  ctx.fillRect(0, 230, canvas.width, 10);

  ctx.fillStyle = '#3d5d34';
  for (let i = 0; i < 20; i += 1) {
    const x = (i * 120 - ((state.distance * 1.5) % 140)) - 20;
    ctx.fillRect(x, track.groundY - 30, 50, 30);
  }

  ctx.fillStyle = '#7f8a62';
  ctx.fillRect(0, track.groundY, canvas.width, canvas.height - track.groundY);

  if (config.name === 'Volcan sauvage' || config.name === 'Finale MX') {
    ctx.fillStyle = '#d5533a';
    ctx.fillRect(0, track.groundY + 12, canvas.width, canvas.height - track.groundY - 12);
  }
}

function drawPlayer() {
  const player = state.player;
  const bodyColor = '#1c2b59';
  const accentColor = '#ffb703';

  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.crouching) {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(12, 22, 42, 18);
    ctx.fillStyle = accentColor;
    ctx.fillRect(52, 22, 20, 12);
  } else {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(10, 10, 52, 20);
    ctx.fillStyle = accentColor;
    ctx.fillRect(58, 10, 16, 10);
    ctx.fillStyle = '#2a3b64';
    ctx.fillRect(16, 28, 42, 12);
  }

  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(48, 4, 14, 8);
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(50, 6, 4, 4);

  ctx.restore();
}

function drawObstacle(obstacle) {
  const { type } = obstacle;
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);

  if (type === 'rock') {
    ctx.fillStyle = '#666a6d';
    ctx.beginPath();
    ctx.moveTo(10, 36);
    ctx.lineTo(22, 12);
    ctx.lineTo(46, 8);
    ctx.lineTo(52, 36);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'log') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 4, obstacle.w, 16);
    ctx.fillStyle = '#a36d36';
    ctx.fillRect(5, 0, obstacle.w - 10, 6);
  } else if (type === 'barrier') {
    ctx.fillStyle = '#d9d9d9';
    ctx.fillRect(0, 0, obstacle.w, 34);
    ctx.fillStyle = '#ff3d57';
    ctx.fillRect(10, 4, obstacle.w - 20, 6);
    ctx.fillRect(10, 18, obstacle.w - 20, 6);
  } else if (type === 'tree') {
    ctx.fillStyle = '#7d5131';
    ctx.fillRect(18, 20, 16, 68);
    ctx.fillStyle = '#2d9a53';
    ctx.beginPath();
    ctx.arc(26, 12, 26, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'crate') {
    ctx.fillStyle = '#8c4f2d';
    ctx.fillRect(0, 0, obstacle.w, obstacle.h);
    ctx.strokeStyle = '#4b280f';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, obstacle.w, obstacle.h);
  } else if (type === 'dune') {
    ctx.fillStyle = '#d3b067';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.quadraticCurveTo(30, 0, 110, 18);
    ctx.lineTo(110, 34);
    ctx.lineTo(0, 34);
    ctx.fill();
  } else if (type === 'ice') {
    ctx.fillStyle = '#9feaf7';
    ctx.fillRect(0, 8, obstacle.w, 12);
    ctx.strokeStyle = '#d7faff';
    ctx.strokeRect(0, 8, obstacle.w, 12);
  } else if (type === 'lava') {
    ctx.fillStyle = '#ff5d28';
    ctx.fillRect(0, 8, obstacle.w, 20);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(8, 0, obstacle.w - 16, 8);
  }

  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function draw() {
  drawBackground();
  drawParticles();
  state.obstacles.forEach(drawObstacle);
  drawPlayer();
}

function loop(timestamp) {
  const delta = (timestamp - state.lastFrame) / 1000 || 0.016;
  state.lastFrame = timestamp;

  update(delta);
  draw();

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    input.left = true;
  }
  if (event.key === 'ArrowRight') {
    input.right = true;
  }
  if (event.key === 'ArrowUp' || event.key === ' ') {
    event.preventDefault();
    jump();
  }
  if (event.key === 'ArrowDown') {
    input.crouch = true;
  }
  if (event.key.toLowerCase() === 'r') {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') input.left = false;
  if (event.key === 'ArrowRight') input.right = false;
  if (event.key === 'ArrowDown') input.crouch = false;
});

saveNameBtn.addEventListener('click', () => {
  setGameName();
});

gameNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    setGameName();
  }
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

resetGame();
setGameName();
requestAnimationFrame(loop);
