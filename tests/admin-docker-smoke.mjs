// Run against an isolated local Docker web service configured with the dedicated MFA fixture.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { createRequire } from 'node:module';
const { encodeReply } = createRequire(import.meta.url)('next/dist/compiled/react-server-dom-webpack/client.node');
const prisma = new PrismaClient();
const base = 'http://localhost:3000';
assert.equal(process.env.ALLOW_LOCAL_SMOKE, '1', 'Explicit local smoke-test opt-in required');
assert.equal(process.env.NEXT_PUBLIC_APP_URL, base, 'Run only against the local application');
const tag = `qa-${randomUUID()}`;
const password = randomUUID() + 'Ab!';
const ids = [];
const adminEmail = process.env.SMOKE_TOTP_EMAIL;
assert(adminEmail?.endsWith('@example.invalid'), 'Configure a dedicated local MFA fixture account');

function fixtureCode(step) {
 const counter = Buffer.alloc(8);
 counter.writeBigUInt64BE(BigInt(step));
 const digest = createHmac('sha1', '12345678901234567890').update(counter).digest();
 const value = digest.readUInt32BE(digest.at(-1) & 15) & 0x7fffffff;
 return String(value % 1_000_000).padStart(6, '0');
}
function decode(s) { return s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
async function page(path, cookie='') {
 const r = await fetch(base+path,{headers:{cookie},redirect:'manual'});
 return {r,html:await r.text()};
}
async function submit(path, html, values, cookie='', formId, extraHeaders={}) {
 const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)];
 const form = formId === 'logout' ? forms.find(m=>m[2].includes('Cerrar sesi')) : formId ? forms.find(m=>m[1].includes(`id="${formId}"`)) : forms.find(m=>m[2].includes('name="email"') || m[2].includes('name="title"'));
 assert(form,'Rendered action form exists');
 const body = new FormData();
 for (const m of form[2].matchAll(/<input\b([^>]*)>/g)) {
  const attrs=Object.fromEntries([...m[1].matchAll(/([\w:$-]+)="([^"]*)"/g)].map(a=>[a[1],decode(a[2])]));
  if(attrs.type==='hidden' && attrs.name) body.append(attrs.name,attrs.value||'');
 }
 for(const [key,value] of Object.entries(values)) body.set(key,value);
 const r=await fetch(base+path,{method:'POST',headers:{cookie,Origin:base,...extraHeaders},body,redirect:'manual'});
 return {r,html:await r.text()};
}
const proxyToken = process.env.TRUSTED_PROXY_TOKEN;
const proxyHeaders = proxyToken ? {
 'x-studio-proxy-token': proxyToken,
 'x-studio-client-ip': '192.0.2.10',
 'x-forwarded-for': '192.0.2.99',
} : {};
async function attemptLogin(email, totp, sourceHeaders = proxyHeaders) {
 const {html}=await page('/es/login');
 return (await submit('/es/login',html,{email,password,locale:'es',...(totp ? {totp} : {})}, '', undefined, sourceHeaders)).r;
}
async function login(email, totp) {
 const r=await attemptLogin(email, totp);
 assert.equal(r.status,303,'Login redirects');
 const cookie=r.headers.getSetCookie().find(value=>value.startsWith('vs_session='))?.split(';')[0];
 assert(cookie?.startsWith('vs_session='),'Login sets session');
 return cookie;
}
(async()=>{
 try {
  const hash=await bcrypt.hash(password,12);
  for(const role of ['ADMIN','CLIENT']) {
   const u=await prisma.user.create({data:{email:role==='ADMIN' ? adminEmail : `${tag}-client@example.invalid`,name:tag+role,passwordHash:hash,role}});ids.push(u.id);
  }
  {
   for (const invalidCode of [undefined, 'invalid', fixtureCode(Math.floor(Date.now()/30_000)-2)]) {
    const rejected = await attemptLogin(adminEmail, invalidCode);
    assert.notEqual(rejected.status,303);
    assert.equal(rejected.headers.getSetCookie().some(value=>value.startsWith('vs_session=')),false);
   }
  }
  const unconfigured = await prisma.user.create({
   data:{email:`${tag}-unconfigured@example.invalid`,name:tag,passwordHash:hash,role:'ADMIN'},
  });
  ids.push(unconfigured.id);
  const unconfiguredLogin = await attemptLogin(unconfigured.email,fixtureCode(Math.floor(Date.now()/30_000)));
  assert.notEqual(unconfiguredLogin.status,303);
  assert.equal(unconfiguredLogin.headers.getSetCookie().some(value=>value.startsWith('vs_session=')),false);
  const code = fixtureCode(Math.floor(Date.now()/30_000));
  const admin=await login(adminEmail,code);
  {
   const replay = await attemptLogin(adminEmail,code);
   assert.notEqual(replay.status,303);
   assert.equal(replay.headers.getSetCookie().some(value=>value.startsWith('vs_session=')),false);
   assert.equal((await prisma.authSession.updateMany({
     where:{userId:ids[0]},data:{adminVerified:false}
   })).count,1);
   assert.equal((await page('/api/photos/download-zip',admin)).r.status,401);
   await prisma.authSession.updateMany({where:{userId:ids[0]},data:{adminVerified:true}});
   console.log('PASS admin MFA, missing code, replay, and unverified session rejection');
  }
  const client=await login(`${tag}-client@example.invalid`);
  if (proxyToken) {
    const blocked = await attemptLogin(`${tag}-client@example.invalid`, undefined, {
      'x-forwarded-for': '192.0.2.10',
      'x-studio-client-ip': '192.0.2.10',
    });
    assert.notEqual(blocked.status, 303);
    assert.equal(blocked.headers.getSetCookie().some(value => value.startsWith('vs_session=')), false);
    const ipKey = ip => 'login-ip:' + createHash('sha256').update(ip).digest('hex');
    assert((await prisma.rateLimitBucket.findUnique({ where: { key: ipKey('192.0.2.10') } })).count > 1);
    assert.equal(await prisma.rateLimitBucket.findUnique({ where: { key: ipKey('192.0.2.99') } }), null);
    console.log('PASS login rejects unauthenticated forwarding and successful login preserves the trusted IP bucket');
  }
  for(const locale of ['es','en','fr']) {
   for(const route of ['admin','admin/clients','admin/projects/new','admin/vault']) {
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
    status:["DRAFT","DELIVERED","ARCHIVED"][i%3], downloadsEnabled: true,
    updatedAt:new Date(Date.now()+i*1000),sessionDate:new Date("2026-11-08T12:00:00Z"),
  }}));
  const defaults = await prisma.project.create({ data: { clientId: profile.id, title: 'Protected defaults' } });
  assert.equal(defaults.downloadsEnabled, false);
  assert.equal(defaults.watermarkEnabled, true);
  await prisma.project.delete({ where: { id: defaults.id } });
  for(const locale of ['es','en','fr']) {
    const {html,r}=await page(`/${locale}/admin`,admin);assert.equal(r.status,200);
    for(let i=1;i<7;i++) assert(html.includes(`${tag}-project-${i}`),'Six newest projects render');
    const recent=html.match(/<ul class="studio-project-list">([\s\S]*?)<\/ul>/)?.[1];
    assert(recent, 'Recent photography collections render');
    assert(!recent.includes(`${tag}-project-0`),'Oldest project is outside recent list');
    const labels={es:['Borrador','Entregado','Archivado'],en:['Draft','Delivered','Archived'],fr:['Brouillon','Livré','Archivé']}[locale];
    for(const label of labels) assert(html.includes(label),'Localized status renders');
    const detail=await page(`/${locale}/admin/projects/${projects[1].id}`,admin);
    assert.equal(detail.r.status,200);assert(detail.html.includes(labels[1]));
  }
  console.log('PASS persisted dashboard data, six-project limit, and localized detail/status rendering');
  for(const locale of ['es','en','fr']) {
    const portal=await page(`/${locale}/app`,client);assert.equal(portal.r.status,200);
    assert(portal.html.includes(`${tag}-project-1`) && portal.html.includes(`${tag}-project-4`),'Delivered client sessions render');
    assert(!portal.html.includes(`${tag}-project-0`) && !portal.html.includes(`${tag}-project-2`),'Draft and archived sessions stay out of the client portal');
  }
  console.log('PASS private client portal delivered-only sessions in ES/EN/FR');

  const vault = await page(`/es/admin/vault?client=${profile.id}`, admin);
  assert.equal(vault.r.status, 200);
  assert(vault.html.includes(projects[0].title));
  const folder = await page(`/es/admin/vault?client=${profile.id}&project=${projects[0].id}`, admin);
  assert.equal(folder.r.status, 200);
  assert(folder.html.includes(projects[0].title));
  const mismatch = await page(`/es/admin/vault?client=${profile.id}&project=missing`, admin);
  assert.equal(mismatch.r.status, 404);
  const {r:denied}=await page('/api/photos/'+projects[0].id+'/download',client);
  assert([403,404].includes(denied.status));
  const image=await sharp({create:{width:8,height:6,channels:3,background:'#c5a37d'}}).jpeg().withMetadata({ orientation: 6 }).withExifMerge({ IFD0: { ImageDescription: 'Private capture metadata' } }).toBuffer();
  assert((await sharp(image).metadata()).exif);
  const assertDelivery = async (bytes) => {
    const info = await sharp(bytes).metadata();
    assert.equal(info.exif, undefined);
    assert.equal(info.xmp, undefined);
    assert.equal(info.orientation, undefined);
    assert.deepEqual([info.width, info.height], [6, 8]);
  };
  const firstZipEntry = (bytes) => {
    const directory = bytes.readUInt32LE(bytes.length - 6);
    const length = bytes.readUInt32LE(directory + 20);
    const offset = bytes.readUInt32LE(directory + 42);
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    return bytes.subarray(start, start + length);
  };
  const body=new FormData();body.set('projectId',projects[0].id);body.append('files',new File([image],'qa-photo.jpg',{type:'image/jpeg'}));body.append('files',new File([image],'qa-photo.jpg',{type:'image/jpeg'}));
  const uploadForm = (files) => {
    const form = new FormData();
    form.set('projectId', projects[0].id);
    for (const file of files) form.append('files', file);
    return fetch(base + '/api/photos/upload', { method: 'POST', headers: { cookie: admin, Origin: base }, body: form });
  };
  const uploadFile = (data, name = 'qa-limit.jpg') => new File([data], name, { type: 'image/jpeg' });
  const storageEntries = async () => (await Promise.all(['originals', 'thumbs'].map(folder =>
    readdir(`/app/storage/${folder}`)))).flat().sort();
  const entriesBefore = await storageEntries();
  const malformed = await fetch(base + '/api/photos/upload', {
    method: 'POST', headers: { cookie: admin, Origin: base, 'Content-Type': 'multipart/form-data; boundary=qa' },
    body: 'not multipart',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await uploadForm([uploadFile(Buffer.alloc(20 * 1024 * 1024 + 1))])).status, 413);
  assert.equal((await uploadForm(Array.from({ length: 11 }, () => uploadFile(image)))).status, 400);
  const largeImage = await sharp({ create: { width: 8001, height: 8000, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  assert.equal((await uploadForm([uploadFile(largeImage)])).status, 400);
  assert.equal((await uploadForm([uploadFile(image), uploadFile(Buffer.from('invalid image'))])).status, 400);
  assert.equal(await prisma.photo.count({ where: { projectId: projects[0].id } }), 0);
  assert.deepEqual(await storageEntries(), entriesBefore);
  console.log('PASS malformed, oversized and over-dimension uploads rejected; failed batch rolled back');
  let r=await fetch(base+'/api/photos/upload',{method:'POST',headers:{cookie:admin,Origin:base},body});
  assert.equal(r.status,200);const upload=await r.json();assert.equal(upload.count,2);
  const photoId=upload.ids[0];
  const projectId = projects[0].id;
  const adminZip = `/api/photos/download-zip?projectId=${projectId}`;
  const deletePath = `/api/photos/${photoId}/delete`;
  const verificationPage = `/es/admin/projects/${projectId}`;
  const verificationForm = `vault-verify-${projectId}`;
  const verify = async (candidate) => {
    const { html } = await page(verificationPage, admin);
    return submit(verificationPage, html, { password: candidate }, admin, verificationForm);
  };
  const exportRequest = (cookie = admin, origin = base) => fetch(base + adminZip, {
    method: 'POST', headers: { cookie, ...(origin ? { Origin: origin } : {}) },
  });
  const deleteRequest = (origin) => fetch(base + deletePath, {
    method: 'DELETE', headers: { cookie: admin, ...(origin ? { Origin: origin } : {}) },
  });
  {
    assert.equal((await exportRequest()).status, 403);
    assert.equal((await deleteRequest(base)).status, 403);
    await verify(password + 'wrong');
    assert.equal((await exportRequest()).status, 403);
    assert.equal(await prisma.photoAuditEvent.count({ where: { actorId: ids[0] } }), 0);
    await verify(password);
    assert.equal((await page(adminZip, admin)).r.status, 403);
    assert.equal((await exportRequest(client)).status, 403);
    assert.equal((await exportRequest(admin, null)).status, 403);
    assert.equal((await exportRequest(admin, 'https://untrusted.invalid')).status, 403);
    const exported = await exportRequest();
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get('content-type'), 'application/zip');
    const adminArchive = Buffer.from(await exported.arrayBuffer());
    assert.equal(adminArchive.readUInt32LE(0), 0x04034b50);
    assert.deepEqual(firstZipEntry(adminArchive), image);
    assert.equal((await deleteRequest()).status, 403);
    assert.equal((await deleteRequest('https://untrusted.invalid')).status, 403);
    await prisma.authSession.updateMany({
      where: { userId: ids[0] }, data: { vaultVerifiedUntil: new Date(0) },
    });
    assert.equal((await exportRequest()).status, 403);
    assert.equal((await deleteRequest(base)).status, 403);
    await verify(password);
    console.log('PASS sensitive actions require recent verification and deletion requires a trusted origin');
    const photo=await prisma.photo.findUnique({where:{id:photoId}});assert(photo?.thumbKey);
    r=await fetch(base+'/api/media/'+photo.thumbKey,{headers:{cookie:admin}});assert.equal(r.status,200);assert(r.headers.get('content-type').startsWith('image/'));assert(r.headers.get('cache-control').includes('no-store'));
    await prisma.user.update({where:{id:ids[0]},data:{role:'CLIENT'}});
    try {
      const revoked = await page('/api/media/'+photo.thumbKey,admin);
      assert.equal(revoked.r.status,401);
    } finally {
      await prisma.user.update({where:{id:ids[0]},data:{role:'ADMIN'}});
    }
    r=await fetch(base+'/api/photos/reorder',{method:'POST',headers:{cookie:admin,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({projectId:projects[0].id,photoIds:[...upload.ids].reverse()})});assert.equal(r.status,200);
    console.log('PASS upload, stored thumbnail delivery and photo reorder');
    const photoPath=`/api/photos/${photoId}`;
    const jsonHeaders={cookie:client,Origin:base,'Content-Type':'application/json'};
    for (const [path, cookie, bytes] of [
      [photoPath + '/comment', client, 17 * 1024],
      ['/api/photos/reorder', admin, 161 * 1024],
      ['/api/editorial/es/hero', admin, 481_000],
    ]) {
      const rejected = await fetch(base + path, {
        method: 'POST', headers: { cookie, Origin: base, 'Content-Type': 'application/json' },
        body: JSON.stringify({ padding: 'x'.repeat(bytes) }),
      });
      assert.equal(rejected.status, 413, 'Oversized authenticated JSON is rejected before parsing');
    }
    assert.equal(await prisma.comment.count({ where: { photoId } }), 0);
    assert.equal(await prisma.editorialModule.count(), 0);
    console.log('PASS bounded JSON rejects oversized comment, reorder and editorial requests without writes');
    for(const route of ['favorite','select','comment']) {
      const denied=await fetch(base+photoPath+'/'+route,{method:'POST',headers:jsonHeaders,body:JSON.stringify({body:'draft must stay private'})});
      assert.equal(denied.status,403,'Draft projects are not accessible to their client');
    }
    let zip=await fetch(base+`/api/photos/download-zip?projectId=${projects[0].id}`,{headers:{cookie:client}});assert.equal(zip.status,403);
    await prisma.project.update({where:{id:projects[0].id},data:{status:'DELIVERED'}});
    for(const [route,key] of [['favorite','favorite'],['select','selected']]) {
      r=await fetch(base+photoPath+'/'+route,{method:'POST',headers:jsonHeaders});assert.equal(r.status,200);assert.equal((await r.json())[key],true);
    }
    r=await fetch(base+photoPath+'/favorite',{method:'POST',headers:{cookie:client,Origin:'https://untrusted.invalid'}});assert.equal(r.status,403);
    r=await fetch(base+photoPath+'/comment',{method:'POST',headers:jsonHeaders,body:JSON.stringify({body:'  Comment from client  '})});assert.equal(r.status,200);assert.equal((await r.json()).comment.body,'Comment from client');
    for(const text of ['   ','x'.repeat(2001)]) {
      r=await fetch(base+photoPath+'/comment',{method:'POST',headers:jsonHeaders,body:JSON.stringify({body:text})});assert.equal(r.status,400);
    }
    const gallery=await page(`/es/app/projects/${projects[0].id}`,client);assert.equal(gallery.r.status,200);assert(gallery.html.includes('Comment from client'));
    r=await fetch(base+photoPath+'/download',{headers:{cookie:client}});assert.equal(r.status,200);await assertDelivery(Buffer.from(await r.arrayBuffer()));
    const mediaCopy = await fetch(base + '/api/media/' + photo.storageKey, { headers: { cookie: client } });
    assert.equal(mediaCopy.status, 200);
    await assertDelivery(Buffer.from(await mediaCopy.arrayBuffer()));
    const original = await fetch(base + photoPath + '/download', { headers: { cookie: admin } });
    assert.equal(original.status, 200);
    assert.deepEqual(Buffer.from(await original.arrayBuffer()), image);
    for(const fallback of ['selection','favorites','all']) {
      zip=await fetch(base+`/api/photos/download-zip?projectId=${projects[0].id}`,{headers:{cookie:client}});assert.equal(zip.status,200);assert.equal(zip.headers.get('content-type'),'application/zip');
      const bytes=Buffer.from(await zip.arrayBuffer());assert.equal(bytes.readUInt32LE(0),0x04034b50);assert(bytes.includes(Buffer.from('qa-photo.jpg')));assert.equal(bytes.readUInt16LE(bytes.length-12),fallback==='all'?2:1,'ZIP contains only the selected/favorite photos before falling back to all');if(fallback==='all') assert(bytes.includes(Buffer.from('qa-photo-2.jpg')),'Duplicate filenames are disambiguated');
      await assertDelivery(firstZipEntry(bytes));
      if(fallback==='selection') {r=await fetch(base+photoPath+'/select',{method:'POST',headers:jsonHeaders});assert.equal((await r.json()).selected,false);}
      if(fallback==='favorites') {r=await fetch(base+photoPath+'/favorite',{method:'POST',headers:jsonHeaders});assert.equal((await r.json()).favorite,false);}
    }
    console.log('PASS client favorites, album selection, comments, original download, ZIP fallbacks and draft/origin restrictions');

    const organize = (payload, cookie = admin, origin = base) => fetch(base + `/api/projects/${projectId}/organization`, {
      method: 'POST', headers: { cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    assert.equal((await organize({ action: 'create', name: 'Denied' }, client)).status, 401);
    assert.equal((await organize({ action: 'create', name: 'Denied' }, '')).status, 401);
    assert.equal((await organize({ action: 'create', name: 'Denied' }, admin, 'https://untrusted.invalid')).status, 403);
    const albumAResponse = await organize({ action: 'create', name: 'Ceremonia' });
    assert.equal(albumAResponse.status, 200);
    const albumA = await albumAResponse.json();
    const albumB = await (await organize({ action: 'create', name: 'Retratos' })).json();
    const foreignAlbum = await prisma.galleryAlbum.create({ data: { projectId: projects[1].id, name: 'Other session' } });
    assert.equal((await organize({ action: 'assign', albumId: foreignAlbum.id, photoIds: upload.ids })).status, 400);
    assert.equal((await organize({ action: 'assign', albumId: albumA.id, photoIds: upload.ids })).status, 200);
    assert.equal(await prisma.photo.count({ where: { projectId, albumId: albumA.id } }), 2);
    await assert.rejects(prisma.photo.update({ where: { id: photoId }, data: { albumId: foreignAlbum.id } }));
    assert.equal((await organize({ action: 'rename', albumId: foreignAlbum.id, name: 'Intrusion' })).status, 400);
    assert.equal((await organize({ action: 'delete', albumId: foreignAlbum.id })).status, 400);
    const foreignPhoto = await prisma.photo.create({ data: { projectId: projects[1].id, storageKey: 'originals/qa-nonexistent.jpg', filename: 'foreign.jpg' } });
    assert.equal((await organize({ action: 'cover', photoId: foreignPhoto.id })).status, 400);
    assert.equal((await organize({ action: 'assign', albumId: albumA.id, photoIds: [photoId, foreignPhoto.id] })).status, 400);
    assert.equal((await organize({ action: 'reorder', albumIds: [albumB.id, foreignAlbum.id] })).status, 400);
    assert.equal((await organize({ action: 'reorder', albumIds: [albumB.id, albumA.id] })).status, 200);
    assert.equal((await organize({ action: 'rename', albumId: albumA.id, name: 'Ceremonia final' })).status, 200);
    const cover = await prisma.photo.findUniqueOrThrow({ where: { id: upload.ids[1] } });
    assert.equal((await organize({ action: 'cover', photoId: cover.id })).status, 200);
    for (const locale of ['es', 'en', 'fr']) {
      const g = await page(`/${locale}/app/projects/${projectId}`, client);
      assert.equal(g.r.status, 200);
      assert(g.html.includes('Ceremonia final') && g.html.includes('Retratos'));
      assert(g.html.indexOf('Retratos') < g.html.indexOf('Ceremonia final'), 'Albums appear in the saved order');
      assert(g.html.split('portal-gallery-cover')[1].includes(cover.thumbKey), 'Gallery uses the chosen active cover');
      const portal = await page(`/${locale}/app`, client);
      assert(portal.html.includes(cover.thumbKey));
    }
    assert.equal((await organize({ action: 'delete', albumId: albumA.id })).status, 200);
    assert.equal(await prisma.photo.count({ where: { projectId, albumId: null } }), 2);
    assert.equal(await prisma.comment.count({ where: { photoId } }), 1);
    assert.equal((await page(photoPath + '/download', client)).r.status, 200);
    await organize({ action: 'delete', albumId: albumB.id });
    await organize({ action: 'cover', photoId: null });
    console.log('PASS albums: admin-only CRUD, cross-session rejection and database constraint, saved ordering, localized galleries, cover, and deletion without file or comment loss');

    const selectionPath = `/api/projects/${projectId}/selection`;
    const confirmation = (payload, cookie = client, origin = base) => fetch(base + selectionPath, {
      method: 'POST', headers: { cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const otherClient = await prisma.user.create({ data: { email: `${tag}-other@example.invalid`, name: tag, role: 'CLIENT', passwordHash: hash } });
    ids.push(otherClient.id);
    const otherCookie = await login(otherClient.email);
    const selectedAgain = await fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders });
    assert.equal((await selectedAgain.json()).selected, true);
    const version = (await prisma.project.findUnique({ where: { id: projectId } })).selectionVersion;
    const payload = { version, photoIds: [photoId] };
    assert.equal((await confirmation(payload, '')).status, 401);
    assert.equal((await confirmation(payload, otherCookie)).status, 403);
    assert.equal((await confirmation(payload, admin)).status, 403);
    assert.equal((await confirmation(payload, client, 'https://untrusted.invalid')).status, 403);
    assert.equal((await confirmation({ version, photoIds: [] })).status, 400);
    assert.equal((await confirmation({ ...payload, version: version - 1 })).status, 409);
    assert.equal((await confirmation({ version, photoIds: upload.ids })).status, 409);
    const confirmed = await Promise.all([confirmation(payload), confirmation(payload)]);
    assert.deepEqual(confirmed.map(r => r.status).sort(), [200, 409]);
    assert.equal(await prisma.selectionSubmission.count({ where: { projectId } }), 1);
    const snapshot = await prisma.selectionSubmission.findFirst({ where: { projectId } });
    assert.deepEqual(snapshot.items.map(p => p.id), [photoId]);
    assert.equal((await fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders })).status, 409);
    assert.equal((await page(selectionPath + '?format=csv', client)).r.status, 401);
    assert.equal((await page(selectionPath + '?format=txt')).r.status, 401);
    const csv = await page(selectionPath + '?format=csv', admin);
    assert.equal(csv.r.status, 200); assert(csv.html.includes(photoId) && csv.html.includes(photo.filename));
    assert(!csv.html.includes(photo.storageKey));
    assert(csv.r.headers.get('cache-control').includes('no-store'));
    assert.equal((await page(selectionPath + '?format=txt', admin)).html.trim(), photo.filename);
    assert.equal((await confirmation({ action: 'reopen', version }, client)).status, 403);
    assert.equal((await confirmation({ action: 'reopen', version: version - 1 }, admin)).status, 409);
    assert.equal((await confirmation({ action: 'reopen', version }, admin)).status, 200);
    assert.equal((await page(selectionPath, admin)).r.status, 409);
    const toggles = await Promise.all([
      fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders }),
      fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders }),
    ]);
    assert(toggles.every(r => r.status === 200));
    assert.equal(await prisma.selection.count({ where: { userId: ids[1], photoId } }), 1);
    const currentVersion = (await prisma.project.findUnique({ where: { id: projectId } })).selectionVersion;
    assert.equal((await confirmation({ version: currentVersion, photoIds: [photoId] })).status, 200);
    assert.equal(await prisma.selectionSubmission.count({ where: { projectId } }), 2);
    assert.deepEqual((await prisma.selectionSubmission.findUnique({ where: { id: snapshot.id } })).items, snapshot.items);
    assert.equal((await confirmation({ action: 'reopen', version: currentVersion }, admin)).status, 200);
    const clearSelection = await fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders });
    assert.equal((await clearSelection.json()).selected, false);
    await fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders });
    const raceVersion = (await prisma.project.findUnique({ where: { id: projectId } })).selectionVersion;
    const [raceConfirm, raceToggle] = await Promise.all([
      confirmation({ version: raceVersion, photoIds: [photoId] }),
      fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders }),
    ]);
    assert([200, 409].includes(raceConfirm.status));
    assert.deepEqual([raceConfirm.status, raceToggle.status].sort(), [200, 409]);
    const afterRace = await prisma.project.findUnique({ where: { id: projectId } });
    if (afterRace.selectionConfirmedAt) {
      assert.equal(await prisma.selection.count({ where: { userId: ids[1], photoId } }), 1);
      await confirmation({ action: 'reopen', version: afterRace.selectionVersion }, admin);
      await fetch(base + photoPath + '/select', { method: 'POST', headers: jsonHeaders });
    }
    console.log('PASS final selection: permissions, stale and wrong-set rejection, concurrent confirmation/toggles, immutable snapshots, CSV/TXT exports and admin reopening');

    const settingsPage = `/es/admin/projects/${projectId}`;
    const settingsHtml = (await page(settingsPage, admin)).html;
    assert(settingsHtml.includes('id="gallery-delivery-settings"'), 'Delivery settings are integrated into the existing project panel');
    const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8'));
    const actionId = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === 'updateDeliverySettings')?.[0];
    assert(actionId);
    const settings = async (cookie, downloads, expiresOn = '', watermark = true) => {
      const form = new FormData();
      if (downloads) form.set('downloadsEnabled', 'on');
      form.set('expiresOn', expiresOn);
      form.set('watermarkText', 'QA Protected');
      if (watermark) form.set('watermarkEnabled', 'on');
      const response = await fetch(base + settingsPage, {
        method: 'POST', headers: { cookie, Origin: base, 'Next-Action': actionId },
        body: await encodeReply(['es', projectId, form]), redirect: 'manual',
      });
      const responseText = await response.text();
      assert.equal(response.status, cookie === admin ? 200 : 307, responseText.slice(-300));
    };
    await settings(client, false);
    assert.equal((await prisma.project.findUnique({ where: { id: projectId } })).downloadsEnabled, true);
    await settings(admin, false);
    assert.equal((await prisma.project.findUnique({ where: { id: projectId } })).downloadsEnabled, false);
    const protectedUrl = '/api/media/' + photo.thumbKey;
    const marked = await page(protectedUrl, client);
    assert.equal(marked.r.status, 200);
    assert.equal(marked.r.headers.get('content-type'), 'image/webp');
    assert(marked.r.headers.get('cache-control').includes('no-store'));
    assert(marked.r.headers.get('cache-control').includes('no-transform'));
    const markedBytes = Buffer.from(await (await fetch(base + protectedUrl, { headers: { cookie: client } })).arrayBuffer());
    const bypass = await fetch(base + protectedUrl + '?watermark=false&original=true', { headers: { cookie: client } });
    assert.equal(bypass.status, 200);
    assert.deepEqual(Buffer.from(await bypass.arrayBuffer()), markedBytes, 'Query parameters cannot remove the watermark');
    const adminPreview = Buffer.from(await (await fetch(base + protectedUrl, { headers: { cookie: admin } })).arrayBuffer());
    assert(!markedBytes.equals(adminPreview), 'Only client previews carry the personalized mark');
    const reviewLogs = await prisma.photoDeliveryLog.findMany({ where: { projectId, actorId: ids[1], kind: 'PREVIEW' } });
    assert(reviewLogs.length > 0);
    assert(reviewLogs.some(log => log.requests > 1));
    assert(reviewLogs.every(log => /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(log.clientCode)));
    const activityPage = await page(`/es/admin/projects/${projectId}`, admin);
    assert(activityPage.html.includes(reviewLogs[0].clientCode));
    await settings(admin, false, '', false);
    const unmarked = Buffer.from(await (await fetch(base + protectedUrl, { headers: { cookie: client } })).arrayBuffer());
    assert.deepEqual(unmarked, adminPreview, 'Only the admin can explicitly disable preview watermarking');
    await settings(admin, false);
    console.log('PASS automatic protected previews, tamper resistance, admin opt-out, client review codes and grouped delivery logs');
    {
      const keys = ['preview', 'download', 'zip'].map(kind => `photo-delivery:${kind}:${ids[1]}`);
      const seed = (key, count, resetAt = new Date(Date.now() + 60_000)) => prisma.rateLimitBucket.upsert({
        where: { key }, create: { key, count, resetAt }, update: { count, resetAt },
      });
      try {
        await seed(keys[0], 599);
        assert.equal((await page(protectedUrl, client)).r.status, 200, 'Last allowed preview succeeds');
        const denied = await Promise.all([page(protectedUrl, client), page(protectedUrl + '?view=large&nonce=1', client)]);
        assert(denied.every(({r}) => r.status === 429), 'Parallel requests and URL variants share the account quota');
        assert(denied.every(({r}) => Number(r.headers.get('retry-after')) >= 1));
        assert.equal((await page(protectedUrl, admin)).r.status, 200, 'Client quota does not restrict the photographer');
        assert.equal((await page(protectedUrl)).r.status, 401);
        assert.equal((await prisma.rateLimitBucket.findUniqueOrThrow({where:{key:keys[0]}})).count, 602, 'Anonymous and admin requests do not consume client quota');
        await seed(keys[0], 600, new Date(0));
        assert.equal((await page(protectedUrl, client)).r.status, 200, 'Expired quota resets');
        await settings(admin, true);
        await seed(keys[1], 60);
        assert.equal((await page(photoPath + '/download', client)).r.status, 429);
        assert.equal((await page('/api/media/' + photo.storageKey + '?download=1', client)).r.status, 429, 'Direct media cannot bypass download quota');
        await seed(keys[2], 6);
        assert.equal((await page(adminZip, client)).r.status, 429, 'ZIP quota applies before streaming');
        await settings(admin, false);
        assert.equal((await page(photoPath + '/download', client)).r.status, 403, 'Permission rejection precedes quota');
        assert.equal((await prisma.rateLimitBucket.findUniqueOrThrow({where:{key:keys[1]}})).count, 62);
        console.log('PASS persistent client photo quotas, parallel requests, URL bypass rejection, reset and authorization precedence');
      } finally {
        await prisma.rateLimitBucket.deleteMany({where:{key:{in:keys}}});
      }
    }
    const legacyPhoto = await prisma.photo.findUniqueOrThrow({ where: { id: upload.ids[1] } });
    await prisma.photo.update({ where: { id: legacyPhoto.id }, data: { thumbKey: null } });
    try {
      const legacyPreview = await page('/api/media/' + legacyPhoto.storageKey, client);
      assert.equal(legacyPreview.r.status, 200);
      assert.equal(legacyPreview.r.headers.get('content-type'), 'image/webp');
      assert.equal((await page(`/api/photos/${legacyPhoto.id}/download`, client)).r.status, 403);
    } finally { await prisma.photo.update({ where: { id: legacyPhoto.id }, data: { thumbKey: legacyPhoto.thumbKey } }); }
    assert.equal((await page(photoPath + '/download', client)).r.status, 403);
    assert.equal((await page(adminZip, client)).r.status, 403);
    assert.equal((await page('/api/media/' + photo.storageKey, client)).r.status, 403);
    assert.equal((await page('/api/media/' + photo.thumbKey, client)).r.status, 200);
    const reviewGallery = await page(`/es/app/projects/${projectId}`, client);
    assert.equal(reviewGallery.r.status, 200);
    assert(!reviewGallery.html.includes('/api/photos/download-zip?'));
    assert.equal((await page(photoPath + '/download', admin)).r.status, 200);
    await settings(admin, true, '2000-01-01');
    const expiredVersion = (await prisma.project.findUnique({ where: { id: projectId } })).selectionVersion;
    assert.equal((await confirmation({ version: expiredVersion, photoIds: [photoId] })).status, 403);
    assert.equal((await page('/api/media/' + photo.thumbKey, client)).r.status, 403);
    const expiredDownload = (await page(photoPath + '/download', client)).r;
    assert.equal(expiredDownload.status, 404);
    assert(expiredDownload.headers.get('cache-control')?.includes('no-store'), 'Denied files must not be cached across gallery reopening');
    assert.equal((await page(adminZip, client)).r.status, 403);
    assert.equal((await page(`/es/app/projects/${projectId}`, client)).r.status, 307);
    assert(!(await page('/es/app', client)).html.includes(`/es/app/projects/${projectId}`));
    for (const operation of ['favorite', 'select', 'comment']) {
      assert.equal((await fetch(base + photoPath + '/' + operation, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ body: 'Expired gallery' }),
      })).status, 403);
    }
    assert.equal((await page('/api/media/' + photo.thumbKey, admin)).r.status, 200);
    await settings(admin, true);
    assert.equal((await prisma.project.findUnique({ where: { id: projectId } })).expiresAt, null);
    assert.equal((await page(`/es/app/projects/${projectId}`, client)).r.status, 200);
    assert.equal((await page(photoPath + '/download', client)).r.status, 200);
    console.log('PASS integrated delivery settings: admin-only updates, review-only downloads, expiry on every client route, reopening and preserved photographer access');

    const restorePath = `/api/photos/${photoId}/restore`;
    const restore = (cookie, origin = base) => fetch(base + restorePath, {
      method: 'POST', headers: { cookie, ...(origin ? { Origin: origin } : {}) },
    });
    assert.equal((await organize({ action: 'cover', photoId })).status, 200);
    assert.equal((await deleteRequest(base)).status, 200);
    assert.equal((await deleteRequest(base)).status, 404);
    assert((await prisma.photo.findUnique({ where: { id: photoId } })).trashedAt);
    assert.equal((await restore(client)).status, 401);
    assert.equal((await restore(admin, null)).status, 403);
    assert.equal((await restore(admin, 'https://untrusted.invalid')).status, 403);
    for (const cookie of [client, admin]) {
      assert.equal((await page('/api/media/' + photo.thumbKey, cookie)).r.status, 404);
      assert.equal((await page('/api/media/' + photo.storageKey, cookie)).r.status, 404);
      const download = await page(photoPath + '/download', cookie);
      assert([403,404].includes(download.r.status));
    }
    for (const operation of ['favorite', 'select', 'comment']) {
      const response = await fetch(base + photoPath + '/' + operation, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ body: 'Hidden photo' }),
      });
      assert([403,404].includes(response.status));
    }
    const orderWithTrashedPhoto = await fetch(base + '/api/photos/reorder', {
      method: 'POST', headers: { cookie: admin, Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, photoIds: upload.ids }),
    });
    assert.equal(orderWithTrashedPhoto.status, 400);
    const hiddenGallery = await page(`/es/app/projects/${projectId}`, client);
    assert(!hiddenGallery.html.includes(photoId));
    assert(!hiddenGallery.html.includes(photo.thumbKey), 'Trashed cover falls back without exposing the hidden photo');
    const trashPage = await page(`/es/admin/vault?client=${profile.id}&project=${projectId}`, admin);
    assert(trashPage.html.includes('Papelera') && trashPage.html.includes('Restaurar'));
    assert(!trashPage.html.includes(photo.thumbKey));
    for (const archive of [
      await exportRequest(),
      await fetch(base + adminZip, { headers: { cookie: client } }),
    ]) {
      assert.equal(archive.status, 200);
      const bytes = Buffer.from(await archive.arrayBuffer());
      assert.equal(bytes.readUInt16LE(bytes.length - 12), 1);
    }
    await prisma.authSession.updateMany({
      where: { userId: ids[0] }, data: { vaultVerifiedUntil: new Date(0) },
    });
    assert.equal((await restore(admin)).status, 403);
    await verify(password);
    const attempts = await Promise.all([restore(admin), restore(admin)]);
    assert.deepEqual(attempts.map(response => response.status).sort(), [200, 404]);
    assert.equal((await prisma.photo.findUnique({ where: { id: photoId } })).trashedAt, null);
    const restored = await fetch(base + photoPath + '/download', { headers: { cookie: client } });
    assert.equal(restored.status, 200);
    await assertDelivery(Buffer.from(await restored.arrayBuffer()));
    const restoredGallery = await page(`/es/app/projects/${projectId}`, client);
    assert(restoredGallery.html.includes('Comment from client'));
    const audit = await prisma.photoAuditEvent.findMany({ where: { actorId: ids[0], projectId } });
    assert.deepEqual(audit.filter(event => event.action === 'ZIP_REQUESTED').map(event => event.photoCount).sort(), [1, 2]);
    for (const action of ['PHOTO_TRASHED', 'PHOTO_RESTORED']) {
      const events = audit.filter(event => event.action === action);
      assert.equal(events.length, 1);
      assert.equal(events[0].photoId, photoId);
      assert.equal(events[0].photoCount, 1);
    }
    console.log('PASS trash access isolation, filtered galleries and ZIPs, concurrent restore, preserved original and audit records');
  }

  const fixtureKey = 'originals/zip-limit-fixture.jpg';
  await prisma.photo.createMany({
    data: Array.from({ length: 501 }, (_, i) => ({
      projectId, storageKey: fixtureKey, filename: `limit-${i}.jpg`, sortOrder: 1000 + i,
    })),
  });
  try {
    const previousAuditCount = await prisma.photoAuditEvent.count({ where: { actorId: ids[0] } });
    assert.equal((await exportRequest()).status, 413);
    assert.equal((await page(adminZip, client)).r.status, 413);
    assert.equal(await prisma.photoAuditEvent.count({ where: { actorId: ids[0] } }), previousAuditCount);
  } finally {
    await prisma.photo.deleteMany({ where: { projectId, storageKey: fixtureKey } });
  }
  const nextExport = await exportRequest();
  assert.equal(nextExport.status, 200);
  await nextExport.arrayBuffer();
  console.log('PASS ZIP photo count limit for both roles and slot release after rejection');


  const editorialId = 'es/hero';
  const heroValues = {
    location: 'Barcelona', brand: 'Editorial fixture', specialty: 'Fotografia',
    tagline: 'Private editorial draft', subtitle: 'Draft text',
    ctaWhatsapp: 'Contacto', ctaPortfolio: 'Portfolio',
  };
  const editorialPath = base + '/api/editorial/es/hero';
  const edit = async (cookie, payload) => fetch(editorialPath, {
    method: 'POST', headers: { cookie, Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  try {
    assert.equal((await page('/es/studio', client)).r.status, 307);
    assert.equal((await edit(client, { action: 'save', revision: 0, values: heroValues })).status, 401);
    await prisma.user.update({ where: { id: ids[1] }, data: { editorialDesigner: true } });
    const studioPage = await page('/es/studio', client);
    assert.equal(studioPage.r.status, 200);
    assert.equal((await page('/es/studio/present')).r.status, 307);
    let edited = await edit(client, { action: 'save', revision: 0, values: heroValues });
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).revision, 1);
    assert(!(await page('/es')).html.includes('Private editorial draft'));
    assert((await page('/es/studio/present', client)).html.includes('Private editorial draft'));
    assert.equal((await edit(client, { action: 'publish', revision: 1 })).status, 409);
    assert.equal((await edit(admin, { action: 'save', revision: 0, values: heroValues })).status, 409);
    const concurrent = await Promise.all([
      edit(client, { action: 'save', revision: 1, values: { ...heroValues, subtitle: 'Concurrent edit' } }),
      edit(client, { action: 'save', revision: 1, values: { ...heroValues, subtitle: 'Concurrent edit' } }),
    ]);
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
    assert.equal((await edit(admin, { action: 'publish', revision: 1 })).status, 409);
    assert.equal((await edit(admin, { action: 'publish', revision: 2 })).status, 200);
    assert((await page('/es')).html.includes('Private editorial draft'));
    const firstRevision = await prisma.editorialRevision.findFirst({ where: { moduleId: editorialId, revision: 1 } });
    assert(firstRevision);
    assert.equal((await edit(admin, { action: 'restore', revision: 3, historyId: firstRevision.id })).status, 200);
    const restored = await prisma.editorialModule.findUnique({ where: { id: editorialId } });
    assert.equal(restored.draft.subtitle, 'Draft text');
    assert.equal(restored.published.subtitle, 'Concurrent edit');

    const imageForm = new FormData();
    imageForm.set('file', new File([image], 'editorial.jpg', { type: 'image/jpeg' }));
    const assetResponse = await fetch(base + '/api/editorial/assets', { method: 'POST', headers: { cookie: client, Origin: base }, body: imageForm });
    assert.equal(assetResponse.status, 200);
    const { url } = await assetResponse.json();
    const assetId = url.split('/').at(-1);
    const asset = await prisma.editorialAsset.findUniqueOrThrow({ where: { id: assetId } });
    try {
      assert.equal((await page(url)).r.status, 404);
      assert.equal((await page(url, client)).r.status, 200);
      await prisma.editorialModule.create({ data: { id: 'es/media', draft: {}, published: { heroImage: url } } });
      assert.equal((await page(url)).r.status, 200);
      await prisma.user.update({ where: { id: ids[1] }, data: { editorialDesigner: false } });
      assert.equal((await page('/es/studio/present', client)).r.status, 307);
    } finally {
      const storageRoot = process.env.STORAGE_LOCAL_PATH || '/app/storage';
      const { unlink } = await import('node:fs/promises');
      await unlink(storageRoot + '/' + asset.storageKey);
      await prisma.editorialAsset.delete({ where: { id: assetId } });
    }
    const launch = async (cookie, payload) => fetch(base + '/api/editorial/es/launch', {
      method: 'POST', headers: { cookie, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const launchValues = { publicMode: 'coming-soon', comingSoon: 'Editorial launch fixture', contactEnabled: 'false' };
    assert.equal((await launch(admin, { action: 'save', revision: 0, values: launchValues })).status, 200);
    assert.equal((await launch(admin, { action: 'publish', revision: 1 })).status, 200);
    assert((await page('/es')).html.includes('Editorial launch fixture'));
    assert(!(await page('/es')).html.includes('Private editorial draft'));
    assert((await page('/es/studio/present', admin)).html.includes('Private editorial draft'));
    const preview = await page('/es/studio/preview', admin);
    assert.equal(preview.r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert(preview.r.headers.get('cache-control').includes('no-store'));
    assert(preview.html.includes('Escritorio') && preview.html.includes('Tablet') && preview.html.includes('Actualizar'));
    assert((await page('/es/studio/present', admin)).html.includes('Galería de demostración'));
    console.log('PASS editorial designer permissions, private drafts, concurrent save, publication, restore and asset privacy');
  } finally {
    await prisma.editorialRevision.deleteMany({ where: { moduleId: { in: [editorialId, 'es/launch'] } } });
    await prisma.editorialModule.deleteMany({ where: { id: { in: [editorialId, 'es/media', 'es/launch'] } } });
    await prisma.user.update({ where: { id: ids[1] }, data: { editorialDesigner: false } });
  }

  {
    const email = `${tag}-onboarding@example.invalid`;
    const account = await prisma.user.create({ data: { email, name: 'Password onboarding fixture',
      passwordHash: await bcrypt.hash(password, 12), role: 'CLIENT', mustChangePassword: true,
      clientProfile: { create: {} } }, include: { clientProfile: true } });
    ids.push(account.id);
    assert.equal(account.mustChangePassword, true, 'New clients must replace their temporary password');
    const pending = await login(email);
    const secondPending = await login(email);
    assert.equal((await page('/es/app', pending)).r.headers.get('location'), '/es/account/password');
    assert.equal((await page('/api/photos/download-zip?projectId=' + projectId, pending)).r.status, 401);
    assert.equal((await page('/api/media/originals/private-probe.jpg', pending)).r.status, 401);
    const path = '/es/account/password';
    const passwordPage = await page(path, pending);
    assert.equal(passwordPage.r.status, 200);
    const nextPassword = randomUUID() + 'New!';
    const values = { currentPassword: password, newPassword: nextPassword, confirmation: nextPassword };
    const wrong = await submit(path, passwordPage.html, { ...values, currentPassword: password + 'wrong' }, pending, 'password-change');
    assert.equal(wrong.r.status, 200);
    const long = '😀'.repeat(19);
    assert.equal((await submit(path, passwordPage.html, { ...values, newPassword: long, confirmation: long }, pending, 'password-change')).r.status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({where:{id:account.id}})).passwordHash, account.passwordHash);
    const csrf = await submit(path, passwordPage.html, values, pending, 'password-change', { Origin: 'https://untrusted.example' });
    assert.notEqual(csrf.r.status, 303);
    const key = `password-change:${account.id}`;
    await prisma.rateLimitBucket.upsert({ where:{key}, create:{key,count:6,resetAt:new Date(Date.now()+900_000)}, update:{count:6,resetAt:new Date(Date.now()+900_000)} });
    assert.equal((await submit(path, passwordPage.html, values, pending, 'password-change')).r.status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({where:{id:account.id}})).passwordHash, account.passwordHash);
    await prisma.rateLimitBucket.deleteMany({where:{key}});
    const [changed, racingLogin] = await Promise.all([
      submit(path, passwordPage.html, values, pending, 'password-change'), attemptLogin(email),
    ]);
    assert.equal(changed.r.status, 303);
    assert(changed.r.headers.get('location').includes('passwordChanged=1'));
    const updated = await prisma.user.findUniqueOrThrow({where:{id:account.id}});
    assert.equal(updated.mustChangePassword, false);
    assert(await bcrypt.compare(nextPassword, updated.passwordHash));
    assert.equal(await prisma.authSession.count({where:{userId:account.id}}), 0, 'Password change revokes concurrent old-password logins');
    const racedCookie = racingLogin.headers.getSetCookie().find(c=>c.startsWith('vs_session='))?.split(';')[0];
    for(const oldCookie of [pending, secondPending, ...(racedCookie?[racedCookie]:[])]) {
      assert.equal((await page(path, oldCookie)).r.status, 307);
    }
    assert.notEqual((await attemptLogin(email)).status, 303);
    const loginPage = await page('/es/login');
    const fresh = await submit('/es/login', loginPage.html, { email, password: nextPassword, locale:'es' });
    assert.equal(fresh.r.status, 303);
    const freshCookie = fresh.r.headers.getSetCookie().find(c=>c.startsWith('vs_session='))?.split(';')[0];
    assert(freshCookie);
    assert.equal((await page('/es/app', freshCookie)).r.status, 200);
    console.log('PASS forced password onboarding, byte limits, current-password verification, origin/rate rejection, all-session revocation and concurrent login protection');
  }

  const secondAdmin = await login(adminEmail,fixtureCode(Math.floor(Date.now()/30_000)+1));
  assert.equal((await exportRequest(secondAdmin)).status, 403);
  const logoutPage = await page('/es/admin/vault', admin);
  assert.equal(logoutPage.r.status, 200);
  const logout = await submit('/es/admin/vault', logoutPage.html, {}, admin, 'logout');
  assert.equal(logout.r.status, 303);
  assert.equal((await page('/es/admin/vault', admin)).r.status, 307);
  assert.equal((await page('/api/photos/download-zip', admin)).r.status, 401);
  assert.equal((await page('/es/admin/vault', secondAdmin)).r.status, 200);
  assert.equal((await prisma.authSession.updateMany({
    where: { userId: ids[0] },
    data: { expiresAt: new Date(0) },
  })).count, 1);
  assert.equal((await page('/es/admin/vault', secondAdmin)).r.status, 307);
  assert.equal((await page('/api/photos/download-zip', secondAdmin)).r.status, 401);
  console.log('PASS logout revokes only the active session and expired sessions cannot access vault or ZIP');

 } finally {
  await prisma.rateLimitBucket.deleteMany({where:{key:{in:ids.flatMap(id=>['preview','download','zip'].map(kind=>`photo-delivery:${kind}:${id}`))}}});
  await prisma.rateLimitBucket.deleteMany({where:{key:{in:ids.map(id=>`password-change:${id}`)}}});
  await prisma.photoAuditEvent.deleteMany({where:{actorId:{in:ids}}});
  await prisma.user.deleteMany({where:{id:{in:ids}}});
  await prisma.$disconnect();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
