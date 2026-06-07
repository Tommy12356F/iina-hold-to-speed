// Hold to Speed — IINA Plugin
// Hold Space = 2x speed (like YouTube). Tap Space = play/pause.
//
// Strategy: use mpv.set("pause", ...) and mpv.set("speed", ...) directly,
// and track pause state ourselves via the mpv.pause.changed event.

const { core, input, mpv, event, menu, console: log } = iina;

const getHoldSpeed = () => iina.preferences.get("holdSpeed") ?? 2.0;
const getHoldDelay = () => iina.preferences.get("holdDelay") ?? 250;

let holdTimer      = null;
let isHolding      = false;
let spaceDown      = false;
let savedSpeed     = 1.0;
let isPaused       = false;

// ── Track pause state via mpv event ─────────────────────────────────────────
event.on("mpv.pause.changed", () => {
  isPaused = mpv.getFlag("pause");
  log.log("[hold-to-speed] pause changed: " + isPaused);
});

event.on("iina.file-loaded", () => {
  isPaused   = mpv.getFlag("pause");
  savedSpeed = mpv.getNumber("speed") || 1.0;
});

// ── Space DOWN ───────────────────────────────────────────────────────────────
input.onKeyDown("Space", (data) => {
  if (data.isRepeat) return true; // eat repeats — stops IINA toggling pause on hold
  if (spaceDown)     return true;

  spaceDown  = true;
  isHolding  = false;
  savedSpeed = mpv.getNumber("speed") || 1.0;

  holdTimer = setTimeout(() => {
    if (!spaceDown) return;
    isHolding = true;

    const speed = getHoldSpeed();
    if (isPaused) mpv.set("pause", false);
    mpv.set("speed", speed);
    core.osd("▶▶  " + speed + "× Speed");
    log.log("[hold-to-speed] boosted to " + speed + "×");
  }, getHoldDelay());

  return true; // consume — IINA's default Space handler never fires
}, input.PRIORITY_HIGH);

// ── Space UP ─────────────────────────────────────────────────────────────────
input.onKeyUp("Space", () => {
  spaceDown = false;

  if (holdTimer !== null) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  if (isHolding) {
    mpv.set("speed", savedSpeed);
    isHolding = false;
    core.osd("▶  Normal Speed");
    log.log("[hold-to-speed] restored speed");
  } else {
    // Short tap → toggle pause ourselves
    mpv.set("pause", !isPaused);
    log.log("[hold-to-speed] tap: pause=" + !isPaused);
  }

  return true;
}, input.PRIORITY_HIGH);

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
