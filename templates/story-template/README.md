# Story Template

This is a template for creating an animated storytelling video series.

## Script Format

Create a file called `script.md` in your project root with this format:

```markdown
## Scene 1: Title
**Duration:** 5
**Background:** backgrounds/scene1-bg.png
**Characters:**
- Hero @ (540, 1200) scale: 1.0
- Villain @ (200, 1200) scale: 1.2
**Narration:** Once upon a time...
**SFX:**
- sounds/thunder.mp3 @ 2.0
**Music:** sounds/epic.mp3
**Transition:** fade -> fade

## Scene 2: Title
**Duration:** 3
**Background:** #1a1a2e
**Characters:**
- Hero @ (540, 900) scale: 1.5
**Narration:** The hero stood alone.
```

## Character Positioning

Use coordinates relative to the canvas:
- `x`: horizontal position (0 to width)
- `y`: vertical position (0 to height)
- `scale`: size multiplier (1.0 = original size)

For a 1080x1920 vertical canvas:
- Center: `(540, 960)`
- Bottom: `(540, 1600)`
- Left: `(270, 960)`
- Right: `(810, 960)`

## Assets

Place assets in your project's `assets/` folder:
- `assets/characters/` - SVG character files
- `assets/backgrounds/` - Background images
- `assets/sounds/` - Sound effects and music
- `assets/voiceovers/` - Pre-recorded narration

## Workflow

1. **Create project**: `node src/cli.mjs create-project my-story --format vertical`
2. **Add assets**: Copy files to `projects/my-story/assets/`
3. **Write script**: Create `script.md`
4. **Import scenes**: `node src/cli.mjs import-script my-story script.md`
5. **Render**: `node src/cli.mjs render my-story --quality final`
