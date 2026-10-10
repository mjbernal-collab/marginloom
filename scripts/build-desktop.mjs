import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {existsSync} from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function run(relative,args=[],cwd=root){
  const result=spawnSync(process.execPath,[path.join(root,relative),...args],{cwd,stdio:'inherit',env:process.env,windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
// Package from current source, never from a stale dist directory.
run('scripts/prepare-assets.mjs');
run('node_modules/vite/bin/vite.js',['build']);
const electronDist=path.join(root,'desktop/node_modules/electron/dist');
// Reuse the installed runtime; archive extraction renames can fail in synced Windows folders.
const packagingArgs=['--win','nsis','--x64'];
if(existsSync(path.join(electronDist,'electron.exe')))packagingArgs.push(`--config.electronDist=${electronDist}`);
run('desktop/node_modules/electron-builder/cli.js',packagingArgs,path.join(root,'desktop'));
