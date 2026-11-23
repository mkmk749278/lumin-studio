// Prints one composition's metadata as JSON (id, fps, width, height, frames), read from a bundle.
// Used by modal_render.py so it never has to parse the CLI's human table.
// Usage: node scripts/composition_meta.mjs <bundle-dir> <composition-id> [browserExecutable]
import {selectComposition} from '@remotion/renderer';

const [, , serveUrl, id, browserExecutable] = process.argv;
const c = await selectComposition({serveUrl, id, browserExecutable: browserExecutable || null, logLevel: 'error'});
process.stdout.write(JSON.stringify({id: c.id, fps: c.fps, width: c.width, height: c.height, frames: c.durationInFrames}) + '\n');
