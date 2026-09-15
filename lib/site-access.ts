import {env} from 'cloudflare:workers';

export const accessCookie='repro_site_access';

function configuredCode(){
  return String((env as unknown as Record<string,unknown>).SITE_ACCESS_CODE||'');
}

async function digest(value:string){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}

async function sameValue(a:string,b:string){
  const [left,right]=await Promise.all([digest(a),digest(b)]);
  let different=left.length^right.length;
  for(let i=0;i<Math.max(left.length,right.length);i++)different|=(left[i]||0)^(right[i]||0);
  return different===0;
}

async function sessionToken(code:string){
  const bytes=await digest(`reproduce-please:${code}:access`);
  return Array.from(bytes).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function hasSiteAccess(request:Request){
  const code=configuredCode();
  if(!code)return true;
  const token=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(`${accessCookie}=`))?.slice(accessCookie.length+1)||'';
  return sameValue(token,await sessionToken(code));
}

export async function verifySiteCode(input:string){
  const code=configuredCode();
  return !code||sameValue(input,code);
}

export async function makeSiteSession(){
  const code=configuredCode();
  return code?sessionToken(code):'';
}
