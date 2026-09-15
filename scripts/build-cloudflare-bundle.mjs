import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {extname,join,relative,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const client=join(root,'dist/client');
const output=join(root,'output');
const files=[];
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())await walk(path);else if(!item.name.startsWith('.')&&item.name!=='_headers')files.push(path);}}
await walk(client);
const mime={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const assets={};
for(const file of files){const path='/'+relative(client,file).split('\\').join('/');assets[path]={body:(await readFile(file)).toString('base64'),type:mime[extname(file)]||'application/octet-stream'};}
await mkdir(output,{recursive:true});
await writeFile(join(output,'cloudflare-entry.mjs'),`import app from '../dist/server/index.js';\nconst assets=${JSON.stringify(assets)};\nconst assetBinding={async fetch(request){const url=new URL(request.url);const asset=assets[url.pathname];if(!asset)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':asset.type,'Cache-Control':url.pathname.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'public, max-age=3600'}});}};\nexport default {fetch(request,env,ctx){const asset=assets[new URL(request.url).pathname];if(asset&&(request.method==='GET'||request.method==='HEAD'))return assetBinding.fetch(request);return app.fetch(request,{...env,ASSETS:assetBinding},ctx);}};\n`);
console.log(`Embedded ${files.length} public assets.`);
