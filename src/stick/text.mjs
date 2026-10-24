import { GlobalFonts } from '@napi-rs/canvas';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FONT = 'Anton';

let registered = false;
export function registerFonts() {
  if (registered) return;
  GlobalFonts.registerFromPath(join(root, 'shared-assets', 'fonts', 'Anton-Regular.ttf'), FONT);
  registered = true;
}
