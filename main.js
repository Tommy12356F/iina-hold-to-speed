// Hold to Speed — IINA Plugin
// Hold Space or mouse button = boost speed (like YouTube). Tap Space = play/pause.
// Hold Backspace = slow motion.

const { core, input, mpv, event, menu, console: log } = iina;

const getHoldSpeed = () => iina.preferences.get("holdSpeed") ?? 2.0;
const getSlowSpeed = () => iina.preferences.get("slowSpeed") ?? 0.5;
const getHoldDelay = () => iina.preferences.get("holdDelay") ?? 250;

const speedKey = "Space";
const slowKey  = "BS";   // Backspace

let holdTimer   = null;
let appliedMode = null;   // null | "fast" | "slow" — the hold speed currently in effect
let savedSpeed  = 1.0;
let isPaused    = false;

// Track which triggers are currently down
let speedDown   = false;
let mouseDown   = false;
let slowDown    = false;

// ── Pause state tracking ─────────────────────────────────────────────────────
event.on("mpv.pause.changed", () => {
  isPaused = mpv.getFlag("pause");
});

event.on("iina.file-loaded", () => {
  isPaused = mpv.getFlag("pause");
  if (appliedMode === null) savedSpeed = mpv.getNumber("speed") || 1.0;
});

// ── Shared hold logic ────────────────────────────────────────────────────────
// Slow-mo wins if both a speed-up trigger and the slow-mo key are held.
function wantedMode() {
  if (slowDown) return "slow";
  if (speedDown || mouseDown) return "fast";
  return null;
}

// Bring the playback speed in line with whichever triggers are held right now.
function applyMode() {
  const mode = wantedMode();
  if (mode === appliedMode) return;
  appliedMode = mode;

  if (mode === null) {
    mpv.set("speed", savedSpeed);
    core.osd("▶  Normal Speed");
    log.log("[hold-to-speed] restored speed");
  } else if (mode === "slow") {
    const speed = getSlowSpeed();
    mpv.set("speed", speed);
    core.osd("◀◀  " + speed + "× Slow Motion");
    log.log("[hold-to-speed] slowed to " + speed + "×");
  } else {
    const speed = getHoldSpeed();
    mpv.set("speed", speed);
    core.osd("▶▶  " + speed + "× Speed");
    log.log("[hold-to-speed] boosted to " + speed + "×");
  }
}

function startHold() {
  // Already in a hold: switch modes immediately, keeping the original saved speed
  if (appliedMode !== null) { applyMode(); return; }
  // Another trigger is already waiting out the delay; the timer picks the mode
  if (holdTimer !== null) return;

  savedSpeed = mpv.getNumber("speed") || 1.0;

  holdTimer = setTimeout(() => {
    holdTimer = null;
    if (wantedMode() === null) return;
    if (isPaused) mpv.set("pause", false);
    applyMode();
  }, getHoldDelay());
}

function endHold(wasTap) {
  // In a hold: switch to the other mode if its trigger is still down, else restore
  if (appliedMode !== null) { applyMode(); return; }
  // Another trigger is still waiting out the delay
  if (wantedMode() !== null) return;

  if (holdTimer !== null) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  if (wasTap) {
    mpv.set("pause", !isPaused);
    log.log("[hold-to-speed] tap: pause=" + !isPaused);
  }
}

// ── Speed key DOWN ───────────────────────────────────────────────────────────
input.onKeyDown(speedKey, (data) => {
  if (data.isRepeat) return true;
  if (speedDown)     return true;
  speedDown = true;
  startHold();
  return true;
}, input.PRIORITY_HIGH);

// ── Speed key UP ─────────────────────────────────────────────────────────────
input.onKeyUp(speedKey, () => {
  if (!speedDown) return true;
  speedDown = false;
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

// ── Slow-mo key DOWN ─────────────────────────────────────────────────────────
input.onKeyDown(slowKey, (data) => {
  if (data.isRepeat) return true;
  if (slowDown)      return true;
  slowDown = true;
  startHold();
  return true;
}, input.PRIORITY_HIGH);

// ── Slow-mo key UP ───────────────────────────────────────────────────────────
input.onKeyUp(slowKey, () => {
  if (!slowDown) return true;
  slowDown = false;
  endHold(false); // a tap of the slow-mo key does nothing
  return true;
}, input.PRIORITY_HIGH);

// ── Speed preset menus ───────────────────────────────────────────────────────
const SPEED_PRESETS = [1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
const SLOW_PRESETS  = [0.1, 0.25, 0.5, 0.75];

function addPresetMenu(title, osdLabel, prefKey, presets, current) {
  const parent = menu.item(title, null);

  presets.forEach((speed) => {
    parent.addSubMenuItem(
      menu.item(speed + "×", () => {
        iina.preferences.set(prefKey, speed);
        iina.preferences.persist();
        core.osd(osdLabel + ": " + speed + "×");
        buildSpeedMenu();
      }, { selected: speed === current })
    );
  });

  menu.addItem(parent);
}

function buildSpeedMenu() {
  menu.removeAllItems();
  addPresetMenu("Set Hold Speed", "Hold speed", "holdSpeed", SPEED_PRESETS, getHoldSpeed());
  addPresetMenu("Set Slow-Mo Speed", "Slow-mo speed", "slowSpeed", SLOW_PRESETS, getSlowSpeed());
}

buildSpeedMenu();

log.log("[hold-to-speed] loaded");
