import {accessCookie,hasSiteAccess,makeSiteSession,verifySiteCode} from '@/lib/site-access';

const headers={'Cache-Control':'no-store'};

export async function GET(request:Request){
  return Response.json({authorized:await hasSiteAccess(request)},{headers});
}

export async function POST(request:Request){
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(!origin||origin!==url.origin)return Response.json({error:'잘못된 접근입니다.'},{status:403,headers});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'입장 코드를 확인해 주세요.'},{status:400,headers});
  const raw=await request.text();
  if(raw.length>256)return Response.json({error:'입장 코드를 확인해 주세요.'},{status:400,headers});
  let code='';
  try{const body=JSON.parse(raw);code=typeof body.code==='string'?body.code.trim():'';}catch{}
  if(!code||!(await verifySiteCode(code)))return Response.json({error:'입장 코드가 맞지 않아요.'},{status:401,headers});
  const token=await makeSiteSession();
  return Response.json({authorized:true},{headers:{...headers,...(token?{'Set-Cookie':`${accessCookie}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`}:{})}});
}
