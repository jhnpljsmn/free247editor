# Free Personal AI Video Editor - Automation Engine

This fork adds a **deterministic, token-efficient video automation engine** to the original free247editor, enabling automated storytelling video generation from scripts, SVG characters, and pre-generated voiceovers.

## New Capabilities

- **Multi-project workspace**: Organize episodes in separate project folders
- **Script-to-scene pipeline**: Parse Markdown scripts into structured scene JSON
- **SVG character animation**: Simple transform-based animation (position, scale, opacity, rotation)
- **FFmpeg-based rendering**: Deterministic, fast, no AI inference during rendering
- **Audio synchronization**: Mix narration, sound effects, and background music
- **Subtitle burn-in**: Automated subtitle generation and overlay
- **Token-efficient**: AI used only for creative planning, everything else runs locally

## Quick Start

### 1. Create a Project
```bash
node src/cli.mjs create-project zombie-in-manila --format vertical
```

### 2. Add Assets
Place your files in the project folder:
```
projects/zombie-in-manila/assets/
  characters/hero.svg
  characters/zombie.svg
  backgrounds/manila-street.png
  sounds/zombie-growl.mp3
  voiceovers/episode-01.mp3
```

### 3. Create Scenes

**Option A: Import from script**
```bash
node src/cli.mjs import-script zombie-in-manila script.md
```

**Option B: Interactive builder**
```bash
node src/cli.mjs build-scenes zombie-in-manila
```

**Option C: Manual JSON**
Edit `projects/zombie-in-manila/scenes/scene-01.json` directly.

### 4. Render
```bash
# Preview (fast, lower quality)
node src/cli.mjs render zombie-in-manila --quality preview

# Final (slow, high quality)
node src/cli.mjs render zombie-in-manila --quality final
```

## Script Format

```markdown
## Scene 1: The Encounter
**Duration:** 5
**Background:** backgrounds/manila-street.png
**Characters:**
- Hero @ (540, 1200) scale: 1.0
- Zombie @ (200, 1200) scale: 1.2
**Narration:** It was a quiet night in Manila, until they came.
**SFX:**
- sounds/zombie-growl.mp3 @ 2.5
**Music:** sounds/tension.mp3
**Transition:** fade -> fade
```

## Architecture

The automation engine consists of:

- `src/project.mjs` - Project CRUD operations
- `src/asset-registry.mjs` - Reusable asset catalog
- `src/script-parser.mjs` - Script parsing (Markdown → Scene JSON)
- `src/scene-planner.mjs` - Scene plan generation and validation
- `src/svg-converter.mjs` - SVG → PNG conversion for FFmpeg
- `src/render-engine.mjs` - FFmpeg-based scene rendering and concatenation
- `src/subtitle-gen.mjs` - Subtitle generation and burn-in
- `src/cli.mjs` - Command-line interface

## Scene JSON Schema

Each scene is a JSON file with:
- `id`, `title`, `duration`
- `background`: image/video/color
- `characters`: array with position, scale, opacity, rotation, animations
- `narration`: text + audio file
- `soundEffects`: timed SFX
- `music`: background music with fade
- `subtitle`: text overlay
- `transitions`: in/out fade or slide

## Asset Resolution

Assets are resolved in this order:
1. `projects/<id>/assets/<path>` (project-specific)
2. `shared-assets/<path>` (reusable library)
3. Root-relative paths

## Original free247editor

The original motion-graphics editing capabilities via Herk Edit Kit are preserved. Use `kit/` for advanced motion graphics and the agent-driven "edit this" workflow.

## License

MIT
