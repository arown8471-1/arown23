import {DEFAULT_DATA} from './default-data.js';
import {loadSiteData} from './data-service.js';

const CACHE='arownV3YtCache';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const date=s=>s?new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'short',day:'numeric'}).format(new Date(s)):'';
let data=structuredClone(DEFAULT_DATA);

async function api(url){const r=await fetch(url),j=await r.json();if(!r.ok)throw Error(j?.error?.message||r.status);return j}
async function getVideos(force=false){
  const y=data.youtube||{};if(!y.apiKey)throw Error('NO_KEY');
  let c;try{c=JSON.parse(localStorage.getItem(CACHE)||'null')}catch{}
  if(!force&&c&&Date.now()-c.time<(y.cacheHours||6)*3600000)return c.items;
  const ch=await api(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(y.channelId)}&key=${encodeURIComponent(y.apiKey)}`);
  const playlist=ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;if(!playlist)throw Error('找不到頻道上傳清單');
  const list=await api(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlist)}&maxResults=${y.maxResults||9}&key=${encodeURIComponent(y.apiKey)}`);
  const items=(list.items||[]).filter(x=>x.contentDetails?.videoId&&x.snippet?.title!=='Private video').map(x=>({id:x.contentDetails.videoId,title:x.snippet.title,publishedAt:x.contentDetails.videoPublishedAt||x.snippet.publishedAt,thumbnail:x.snippet.thumbnails?.high?.url||x.snippet.thumbnails?.medium?.url}));
  localStorage.setItem(CACHE,JSON.stringify({time:Date.now(),items}));return items;
}
function ytId(url){try{const u=new URL(url);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.pathname.startsWith('/shorts/'))return u.pathname.split('/')[2]||'';return u.searchParams.get('v')||''}catch{return ''}}
function videoCard(v){return `<article class="card"><div class="thumb" data-id="${esc(v.id)}" data-title="${esc(v.title)}"><img src="${esc(v.thumbnail)}" alt="${esc(v.title)}"><div class="play">▶</div></div><div class="body"><div class="meta">${date(v.publishedAt)}</div><h3>${esc(v.title)}</h3><a class="btn ghost small" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${esc(v.id)}">前往 YouTube</a></div></article>`}
function manualCards(){return (data.manualVideos||[]).map(v=>{const id=ytId(v.url);return id?videoCard({id,title:v.title,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,publishedAt:''}):''}).filter(Boolean)}
async function renderYoutube(force=false){
  $('ytStatus').textContent='讀取中';
  try{const videos=await getVideos(force);$('videoGrid').innerHTML=videos.map(videoCard).join('');$('videoCount').textContent=videos.length;$('ytStatus').textContent=`已更新 ${videos.length} 支影片`;$('hint').classList.add('hidden')}
  catch(e){const manual=manualCards();$('videoGrid').innerHTML=manual.join('')||'<div class="panel">尚未取得影片；請至後台設定 API Key 或加入手動備援影片。</div>';$('videoCount').textContent=manual.length;$('ytStatus').textContent=e.message==='NO_KEY'?'尚未設定 API':'讀取失敗';$('hint').classList.toggle('hidden',e.message!=='NO_KEY')}
  document.querySelectorAll('.thumb').forEach(x=>x.onclick=()=>openVideo(x.dataset.id,x.dataset.title));
}
function openVideo(id,title){const origin=location.protocol.startsWith('http')?`&origin=${encodeURIComponent(location.origin)}`:'';$('player').src=`https://www.youtube.com/embed/${id}?autoplay=1&rel=0${origin}`;$('modalTitle').textContent=title;$('modal').classList.add('open')}
function closeVideo(){$('player').src='about:blank';$('modal').classList.remove('open')}
function render(){
 const s=data.site||DEFAULT_DATA.site,c=s.contacts||{};document.title=s.name||'Arown Ride';$('heroTitle').textContent=s.heroTitle;$('heroSubtitle').textContent=s.heroSubtitle;$('heroImage').src=s.heroImage||'assets/hero-ride.svg';$('aboutText').textContent=s.about;$('footerName').textContent=s.name;$('routeCount').textContent=(data.routes||[]).length;$('productCount').textContent=(data.products||[]).length;
 $('routeGrid').innerHTML=(data.routes||[]).map(r=>`<article class="card"><img src="${esc(r.image)}" alt="${esc(r.name)}"><div class="body"><div class="chips"><span class="chip">${esc(r.region)}</span><span class="chip">${esc(r.difficulty)}</span><span class="chip">${esc(r.distance)}</span></div><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p><a class="btn ghost small" target="_blank" rel="noopener" href="${esc(r.url)}">查看路線</a></div></article>`).join('');
 $('productGrid').innerHTML=(data.products||[]).map(p=>`<article class="card"><img src="${esc(p.image)}" alt="${esc(p.name)}"><div class="body"><div class="chips"><span class="chip">${esc(p.category)}</span><span class="chip">${esc(p.badge)}</span></div><h3>${esc(p.name)}</h3><div class="price">${esc(p.price)}</div><p>${esc(p.description)}</p><a class="btn primary small" target="_blank" rel="noopener" href="${esc(p.url)}">前往購買</a></div></article>`).join('');
 $('storeGrid').innerHTML=(data.stores||[]).map(s=>`<a class="card store" target="_blank" rel="noopener" href="${esc(s.url)}"><strong>${esc(s.name)}</strong><span>${esc(s.type)}｜${esc(s.region)}</span><span>${esc(s.description)}</span></a>`).join('');
 $('contacts').innerHTML=`<a href="mailto:${esc(c.email)}">Email：${esc(c.email)}</a><a target="_blank" rel="noopener" href="${esc(c.line)}">LINE</a><a target="_blank" rel="noopener" href="${esc(c.youtube)}">YouTube</a><a target="_blank" rel="noopener" href="${esc(c.tiktok)}">TikTok</a>`;$('year').textContent=new Date().getFullYear();
}
$('menu').onclick=()=>$('nav').classList.toggle('open');$('refresh').onclick=()=>renderYoutube(true);document.querySelectorAll('[data-close]').forEach(x=>x.onclick=closeVideo);
const loaded=await loadSiteData(DEFAULT_DATA);data=loaded.data;render();renderYoutube();
