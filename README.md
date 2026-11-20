# iina-hold-to-speed

Hold Space to play at a configurable speed, just like YouTube. Hold Backspace for slow motion. Release to go back to normal. Tap Space to pause/unpause as usual.

## Features

- Hold Space → boost to your chosen speed (default 2×)
- Hold Backspace → slow motion at your chosen speed (default 0.5×)
- Release → back to normal speed
- Tap Space → pause / unpause (unchanged)
- Saves and restores custom speeds (e.g. if you were at 1.5×)
- OSD message on boost and restore
- **Configurable hold speed** via plugin preferences (slider, 1.1×–10×)
- **Configurable slow-mo speed** via plugin preferences (slider, 0.1×–0.9×)
- **Configurable activation delay** via plugin preferences (0–1000ms)
- **Context menu** → Set Hold Speed → choose from presets (1.5×, 2×, 2.5×, 3×, 4×, 5×), and Set Slow-Mo Speed (0.1×, 0.25×, 0.5×, 0.75×)

## Installation

1. Open IINA and go to **Settings → Plugins** from the menu bar
2. Click **Install from GitHub...**
3. Paste `Tommy12356F/iina-hold-to-speed` and install
4. Restart IINA

### ⚠️ Required: Remove the default Space key binding

IINA's built-in Space binding intercepts the key before the plugin can see it. You need to remove it once:

1. Go to **IINA Settings → Key Bindings**
2. Find the binding for **Space** (play/pause)
3. Delete it

The plugin handles play/pause itself on a short tap, so you won't lose any functionality.

## Requirements

- IINA 1.4.0 or later

## License

MIT
