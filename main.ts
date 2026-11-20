// Leonida Legend — entry for gta6-trophy-guide-01 ("Build the best GTA 6 trophy guide").
// Built for this bounty: an offline GTA VI trophy guide & tracker living in app/ as plain static
// files (ES module, CSS, no build step, nothing loaded over the network). app/data/trophies.json
// holds all 55 official PlayStation trophies, each with an original cited guide, a kind, a
// missable flag and a roadmap stage; the app adds progress tracking in localStorage with
// export/import, kind/grade/search filters, a spoiler mode for hidden trophies, and a
// five-stage Road to Platinum. This program hands the entry in: it copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge reads
// (the screenshots, the first load's files and bytes, and the source), built with the vendored
// make.fun library. vendor/makefun-frontend.ts stays untouched: the scorer requires dossier.json
// to be byte for byte what its own copy writes.
//
// Serve the guide locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
