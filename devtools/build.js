import { build } from 'esbuild';

await build({
    entryPoints: ['./devtools/raw/feedback/fetch.js'],
    bundle: true,
    outfile: './functions/feedback/fetch.js', // Overwrites with bundled version
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    allowOverwrite: true
});