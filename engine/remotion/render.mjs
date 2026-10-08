// node render.mjs <props.json> <out.mp4|outdir> [--stills=f1,f2,...] [--concurrency=N]
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs'; import path from 'path'; import os from 'os';
const [propsPath, out] = process.argv.slice(2);
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
const inputProps = JSON.parse(fs.readFileSync(propsPath, 'utf-8'));
const here = path.dirname(new URL(import.meta.url).pathname);
const browserExecutable = process.env.REMOTION_CHROME || fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium_headless_shell')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/headless_shell`).find((p) => fs.existsSync(p)) || null;
const serveUrl = await bundle({entryPoint: path.join(here, 'src/index.ts'), publicDir: path.join(here, 'public')});
const composition = await selectComposition({serveUrl, id: 'Main', inputProps, browserExecutable});
const stills = arg('stills');
if (stills) {
  fs.mkdirSync(out, {recursive: true});
  for (const fr of stills.split(',').map(Number)) {
    await renderStill({serveUrl, composition, inputProps, frame: Math.min(fr, composition.durationInFrames - 1), output: path.join(out, `still_${fr}.png`), browserExecutable});
  }
  console.log('stills ok');
} else {
  let last = -1;
  await renderMedia({serveUrl, composition, inputProps, codec: 'h264', crf: 20, muted: true, outputLocation: out, browserExecutable,
    concurrency: Number(arg('concurrency')) || os.cpus().length,
    onProgress: ({progress}) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`render ${p * 10}%`); } }});
  console.log('render ok', out);
}
