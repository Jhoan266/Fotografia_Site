// Run only against the local Docker web service: Get-Content -Raw tests/admin-docker-smoke.mjs | docker compose exec -T -e ALLOW_LOCAL_SMOKE=1 web node --input-type=module
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
const prisma = new PrismaClient();
const base = 'http://localhost:3000';
assert.equal(process.env.ALLOW_LOCAL_SMOKE, '1', 'Explicit local smoke-test opt-in required');
assert.equal(process.env.NEXT_PUBLIC_APP_URL, base, 'Run only against the local application');
const tag = `qa-${randomUUID()}`;
const password = randomUUID() + 'Ab!';
const ids = [];
function decode(s) { return s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
async function page(path, cookie='') {
 const r = await fetch(base+path,{headers:{cookie},redirect:'manual'});
 return {r,html:await r.text()};
}
async function submit(path, html, values, cookie='', formId) {
 const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)];
 const form = formId ? forms.find(m=>m[1].includes(`id="${formId}"`)) : forms.find(m=>m[2].includes('name="email"') || m[2].includes('name="title"'));
 assert(form,'Rendered action form exists');
 const body = new FormData();
 for (const m of form[2].matchAll(/<input\b([^>]*)>/g)) {
  const attrs=Object.fromEntries([...m[1].matchAll(/([\w:$-]+)="([^"]*)"/g)].map(a=>[a[1],decode(a[2])]));
  if(attrs.type==='hidden' && attrs.name) body.append(attrs.name,attrs.value||'');
 }
 for(const [key,value] of Object.entries(values)) body.set(key,value);
 const r=await fetch(base+path,{method:'POST',headers:{cookie,Origin:base},body,redirect:'manual'});
 return {r,html:await r.text()};
}
async function login(email) {
 const {html}=await page('/es/login');
 const {r}=await submit('/es/login',html,{email,password,locale:'es'});
 assert.equal(r.status,303,'Login redirects');
 const cookie=r.headers.getSetCookie().find(value=>value.startsWith('vs_session='))?.split(';')[0];
 assert(cookie?.startsWith('vs_session='),'Login sets session');
 return cookie;
}
(async()=>{
 try {
  const hash=await bcrypt.hash(password,12);
  for(const role of ['ADMIN','CLIENT']) {
   const u=await prisma.user.create({data:{email:`${tag}-${role.toLowerCase()}@example.invalid`,name:tag+role,passwordHash:hash,role}});ids.push(u.id);
  }
  const admin=await login(`${tag}-admin@example.invalid`);
  const client=await login(`${tag}-client@example.invalid`);
  for(const locale of ['es','en','fr']) {
   for(const route of ['admin','admin/clients','admin/projects/new']) {
    for(const cookie of ['',client]) {
     const {r}=await page(`/${locale}/${route}`,cookie);
     assert.equal(r.status,307);assert.equal(new URL(r.headers.get('location'),base).pathname,`/${locale}/${cookie ? "app" : "login"}`);
    }
    const {r,html}=await page(`/${locale}/${route}`,admin);assert.equal(r.status,200);assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'));
   }
  }
  console.log('PASS login, admin access and CLIENT/anonymous rejection across ES/EN/FR');
  const profile=await prisma.clientProfile.create({data:{userId:ids[1]}});
  const projects=[];
  for(let i=0;i<7;i++) projects.push(await prisma.project.create({data:{
    clientId:profile.id,title:`${tag}-project-${i}`,
    status:["DRAFT","DELIVERED","ARCHIVED"][i%3],
    updatedAt:new Date(Date.now()+i*1000),sessionDate:new Date("2026-11-08T12:00:00Z"),
  }}));
  for(const locale of ['es','en','fr']) {
    const {html,r}=await page(`/${locale}/admin`,admin);assert.equal(r.status,200);
    for(let i=1;i<7;i++) assert(html.includes(`${tag}-project-${i}`),'Six newest projects render');
    assert(!html.includes(`${tag}-project-0`),'Oldest project is outside recent list');
    const labels={es:['Borrador','Entregado','Archivado'],en:['Draft','Delivered','Archived'],fr:['Brouillon','Livré','Archivé']}[locale];
    for(const label of labels) assert(html.includes(label),'Localized status renders');
    const detail=await page(`/${locale}/admin/projects/${projects[1].id}`,admin);
    assert.equal(detail.r.status,200);assert(detail.html.includes(labels[1]));
  }
  console.log('PASS persisted dashboard data, six-project limit, and localized detail/status rendering');
  const {r:denied}=await page('/api/photos/'+projects[0].id+'/download',client);
  assert([403,404].includes(denied.status));
  const image=await sharp({create:{width:8,height:8,channels:3,background:'#c5a37d'}}).jpeg().toBuffer();
  const body=new FormData();body.set('projectId',projects[0].id);body.append('files',new File([image],'qa-photo.jpg',{type:'image/jpeg'}));
  let r=await fetch(base+'/api/photos/upload',{method:'POST',headers:{cookie:admin,Origin:base},body});
  assert.equal(r.status,200);const upload=await r.json();assert.equal(upload.count,1);
  const photoId=upload.ids[0];
  try {
    const photo=await prisma.photo.findUnique({where:{id:photoId}});assert(photo?.thumbKey);
    r=await fetch(base+'/api/media/'+photo.thumbKey,{headers:{cookie:admin}});assert.equal(r.status,200);assert(r.headers.get('content-type').startsWith('image/'));
    r=await fetch(base+'/api/photos/reorder',{method:'POST',headers:{cookie:admin,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({projectId:projects[0].id,photoIds:[photoId]})});assert.equal(r.status,200);
    console.log('PASS upload, stored thumbnail delivery and photo reorder');
  } finally {
    r=await fetch(base+`/api/photos/${photoId}/delete`,{method:'DELETE',headers:{cookie:admin,Origin:base}});assert.equal(r.status,200);assert.equal((await r.json()).orphanedObjects,0);
  }
  assert.equal(await prisma.photo.count({where:{projectId:projects[0].id}}),0);
  console.log('PASS photo deletion and temporary data cleanup');

 } finally {
  await prisma.user.deleteMany({where:{id:{in:ids}}});
  await prisma.$disconnect();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
