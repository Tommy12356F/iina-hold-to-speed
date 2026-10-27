// Hold to Speed — IINA Plugin
// Hold Space or mouse button = boost speed (like YouTube). Tap Space = play/pause.

const { core, input, mpv, event, menu, console: log } = iina;

const getHoldSpeed = () => iina.preferences.get("holdSpeed") ?? 2.0;
const getHoldDelay = () => iina.preferences.get("holdDelay") ?? 250;

let holdTimer   = null;
let isHolding   = false;
let savedSpeed  = 1.0;
let isPaused    = false;

// Track which trigger is currently down (space or mouse)
let spaceDown   = false;
let mouseDown   = false;

// ── Pause state tracking ─────────────────────────────────────────────────────
event.on("mpv.pause.changed", () => {
  isPaused = mpv.getFlag("pause");
});

event.on("iina.file-loaded", () => {
  isPaused   = mpv.getFlag("pause");
  savedSpeed = mpv.getNumber("speed") || 1.0;
});

// ── Shared hold logic ────────────────────────────────────────────────────────
function startHold() {
  isHolding  = false;
  savedSpeed = mpv.getNumber("speed") || 1.0;

  holdTimer = setTimeout(() => {
    if (!spaceDown && !mouseDown) return;
    isHolding = true;

    const speed = getHoldSpeed();
    if (isPaused) mpv.set("pause", false);
    mpv.set("speed", speed);
    core.osd("▶▶  " + speed + "× Speed");
    log.log("[hold-to-speed] boosted to " + speed + "×");
  }, getHoldDelay());
}

function endHold(wasTap) {
  if (holdTimer !== null) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  // Only restore/toggle if neither trigger is still held
  if (spaceDown || mouseDown) return;

  if (isHolding) {
    mpv.set("speed", savedSpeed);
    isHolding = false;
    core.osd("▶  Normal Speed");
    log.log("[hold-to-speed] restored speed");
  } else if (wasTap) {
    mpv.set("pause", !isPaused);
    log.log("[hold-to-speed] tap: pause=" + !isPaused);
  }
}

// ── Space DOWN ───────────────────────────────────────────────────────────────
input.onKeyDown("Space", (data) => {
  if (data.isRepeat) return true;
  if (spaceDown)     return true;
  spaceDown = true;
  startHold();
  return true;
}, input.PRIORITY_HIGH);

// ── Space UP ─────────────────────────────────────────────────────────────────
input.onKeyUp("Space", () => {
  if (!spaceDown) return true;
  spaceDown = false;
  endHold(true); // tap = toggle pause
  return true;
}, input.PRIORITY_HIGH);

// ── Mouse/Trackpad DOWN ──────────────────────────────────────────────────────
input.onKeyDown("MBTN_LEFT", (data) => {
  if (data.isRepeat) return true;
  if (mouseDown)     return true;
  mouseDown = true;
  startHold();
  return true;
}, input.PRIORITY_HIGH);

// ── Mouse/Trackpad UP ────────────────────────────────────────────────────────
input.onKeyUp("MBTN_LEFT", () => {
  if (!mouseDown) return true;
  mouseDown = false;
  endHold(false); // tap click = don't toggle pause (let IINA handle normal click)
  return true;
}, input.PRIORITY_HIGH);

// ── Speed preset menu ────────────────────────────────────────────────────────
const SPEED_PRESETS = [1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

function buildSpeedMenu() {
  menu.removeAllItems();
  const current = getHoldSpeed();
  const parent = menu.item("Set Hold Speed", null);

  SPEED_PRESETS.forEach((speed) => {
    parent.addSubMenuItem(
      menu.item(speed + "×", () => {
        iina.preferences.set("holdSpeed", speed);
        iina.preferences.persist();
        core.osd("Hold speed: " + speed + "×");
        buildSpeedMenu();
      }, { selected: speed === current })
    );
  });

  menu.addItem(parent);
}

buildSpeedMenu();

log.log("[hold-to-speed] loaded");
