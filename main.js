const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const enableMotionBtn = document.getElementById("enable-motion");
const shotsEl = document.getElementById("shots");

const state = {
  width: 0,
  height: 0,
  pixelRatio: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
  yaw: 0,
  targetYaw: 0,
  shots: 0,
  enemies: [],
  lastSpawn: 0,
  fov: Math.PI / 3,
  crosshairSpread: 0.04,
  motionEnabled: false,
};

function resize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * state.pixelRatio);
  canvas.height = Math.floor(state.height * state.pixelRatio);
  ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
}

function wrapAngle(value) {
  const twoPi = Math.PI * 2;
  let next = value % twoPi;
  if (next < -Math.PI) next += twoPi;
  if (next > Math.PI) next -= twoPi;
  return next;
}

function normalizeAngle(value) {
  const twoPi = Math.PI * 2;
  let next = value % twoPi;
  if (next < 0) next += twoPi;
  return next;
}

function spawnEnemy() {
  const distance = 5 + Math.random() * 14;
  const angle = Math.random() * Math.PI * 2;
  const size = 0.9 + Math.random() * 0.7;
  state.enemies.push({ angle, distance, size, hit: false, sway: Math.random() * 2 * Math.PI });
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.angle = normalizeAngle(enemy.angle + dt * 0.15);
    enemy.sway += dt * 1.7;
  }

  state.enemies = state.enemies.filter((enemy) => !enemy.hit);

  if (performance.now() - state.lastSpawn > 1600 && state.enemies.length < 8) {
    spawnEnemy();
    state.lastSpawn = performance.now();
  }
}

function getRelativeAngle(enemyAngle) {
  const diff = wrapAngle(enemyAngle - state.yaw);
  return diff;
}

function drawBackground() {
  const horizon = state.height * 0.55;
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
  skyGradient.addColorStop(0, "#c7e7f2");
  skyGradient.addColorStop(1, "#87b6ca");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, state.width, horizon);

  const groundGradient = ctx.createLinearGradient(0, horizon, 0, state.height);
  groundGradient.addColorStop(0, "#6f7c48");
  groundGradient.addColorStop(1, "#3a3b2c");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizon, state.width, state.height - horizon);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(state.width, horizon);
  ctx.stroke();
}

function drawEnemy(enemy) {
  const angle = getRelativeAngle(enemy.angle);
  const halfFov = state.fov / 2;
  if (Math.abs(angle) > halfFov) return;

  const x = ((angle / halfFov) * 0.5 + 0.5) * state.width;
  const depth = 1 / enemy.distance;
  const wobble = Math.sin(enemy.sway) * 0.08;
  const size = (140 * enemy.size * depth + 18) * (1 + wobble);
  const y = state.height * 0.56 - size * 0.5 + wobble * 10;

  ctx.fillStyle = "#b12d2b";
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.7, size, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b0c0c";
  ctx.beginPath();
  ctx.arc(x - size * 0.15, y - size * 0.1, size * 0.08, 0, Math.PI * 2);
  ctx.arc(x + size * 0.15, y - size * 0.1, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.7, size, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCrosshair() {
  const x = state.width * 0.5;
  const y = state.height * 0.55;
  const gap = 8;
  const len = 14;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - len, y);
  ctx.lineTo(x - gap, y);
  ctx.moveTo(x + gap, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x, y - len);
  ctx.lineTo(x, y - gap);
  ctx.moveTo(x, y + gap);
  ctx.lineTo(x, y + len);
  ctx.stroke();
}

function drawGun() {
  const baseY = state.height * 0.78;
  const centerX = state.width * 0.5;
  ctx.fillStyle = "#2a2a2f";
  ctx.fillRect(centerX - 80, baseY, 160, 120);

  ctx.fillStyle = "#121318";
  ctx.fillRect(centerX - 40, baseY - 60, 80, 80);

  ctx.fillStyle = "#6f3f20";
  ctx.fillRect(centerX - 18, baseY + 40, 36, 60);

  ctx.fillStyle = "#202029";
  ctx.fillRect(centerX - 12, baseY - 90, 24, 40);
}

function drawUI() {
  drawCrosshair();
  drawGun();
}

function render() {
  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground();

  const sorted = [...state.enemies].sort((a, b) => b.distance - a.distance);
  for (const enemy of sorted) {
    drawEnemy(enemy);
  }

  drawUI();
}

function animate(time) {
  const dt = Math.min(0.032, (time - (animate.lastTime || time)) / 1000);
  animate.lastTime = time;

  const diff = wrapAngle(state.targetYaw - state.yaw);
  state.yaw = wrapAngle(state.yaw + diff * Math.min(1, dt * 6));

  updateEnemies(dt);
  render();
  requestAnimationFrame(animate);
}

function handleShot() {
  state.shots += 1;
  shotsEl.textContent = state.shots;

  const halfFov = state.fov / 2;
  const hit = state.enemies.find((enemy) => {
    const angle = Math.abs(getRelativeAngle(enemy.angle));
    return angle < state.crosshairSpread && angle < halfFov;
  });

  if (hit) {
    hit.hit = true;
    statusEl.textContent = "Hit! Rotate to find more.";
  } else {
    statusEl.textContent = "Missed. Keep scanning.";
  }
}

function handleOrientation(event) {
  if (event.alpha == null) return;
  const heading = event.alpha * (Math.PI / 180);
  state.targetYaw = normalizeAngle(heading);
  if (!state.motionEnabled) {
    state.motionEnabled = true;
    statusEl.textContent = "Motion active. Rotate to look around.";
  }
}

function enableMotion() {
  if (typeof DeviceOrientationEvent === "undefined") {
    statusEl.textContent = "Motion sensors unavailable on this device.";
    enableMotionBtn.classList.add("hidden");
    return;
  }

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((result) => {
        if (result === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          enableMotionBtn.classList.add("hidden");
        } else {
          statusEl.textContent = "Motion permission denied.";
        }
      })
      .catch(() => {
        statusEl.textContent = "Unable to enable motion.";
      });
  } else {
    window.addEventListener("deviceorientation", handleOrientation, true);
    enableMotionBtn.classList.add("hidden");
  }
}

function handleKey(event) {
  const step = 0.12;
  if (event.key === "ArrowLeft") state.targetYaw = normalizeAngle(state.targetYaw - step);
  if (event.key === "ArrowRight") state.targetYaw = normalizeAngle(state.targetYaw + step);
}

window.addEventListener("resize", resize);
window.addEventListener("pointerdown", handleShot, { passive: true });
window.addEventListener("keydown", handleKey);

enableMotionBtn.addEventListener("click", enableMotion);

resize();
spawnEnemy();
spawnEnemy();
requestAnimationFrame(animate);
