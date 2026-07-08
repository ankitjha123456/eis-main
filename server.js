request js






// API Request Module
const PRESETS = {
  'get-health': { m: 'GET', u: 'http://10.177.44.29:4415/api/health', b: '' },
  'get-users': { m: 'GET', u: 'http://10.177.44.29:4415/api/users', b: '' },
  'post-user': { m: 'POST', u: 'http://10.177.44.29:4415/api/users', b: '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "role": "user"\n}' },
  'put-user': { m: 'PUT', u: 'http://10.177.44.29:4415/api/users/1', b: '{\n  "name": "John Updated",\n  "status": "active"\n}' },
  'del-user': { m: 'DELETE', u: 'http://10.177.44.29:4415/api/users/1', b: '' },
  'post-ace': { m: 'POST', u: 'http://10.177.44.29:4415/api/depositAccShort/details/accounts', b: '{\n  "FETCH_FLAG": "Y",\n  "FIELD_NAME": "EIS_CONFIG",\n  "CACHE": "1800"\n}' },
  'get-orders': { m: 'GET', u: 'http://10.177.44.29:4415/api/orders', b: '' },
  'post-login': { m: 'POST', u: 'http://10.177.44.29:4415/auth/login', b: '{\n  "username": "admin",\n  "password": "secret"\n}' },
  'post-refresh': { m: 'POST', u: 'http://10.177.44.29:4415/auth/refresh', b: '{\n  "refresh_token": "eyJhb..."\n}' },
};

function loadReq(key, el) {
  const p = PRESETS[key];
  if (!p) return;
  document.getElementById('req-method').value = p.m;
  document.getElementById('req-url').value = p.u;
  document.getElementById('body-ed').value = p.b;
  styleM();
  updateRouteDisplay();
  document.querySelectorAll('.ci').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
}

function styleM() {
  const s = document.getElementById('req-method');
  const c = { GET: '#2ecc71', POST: '#fb923c', PUT: '#60a5fa', PATCH: '#a78bfa', DELETE: '#f87171', HEAD: '#94a3b8', OPTIONS: '#94a3b8' };
  s.style.color = c[s.value] || '#e2e8f0';
}

function updateRouteDisplay() {
  const ssh = document.getElementById('req-sship').value || '?';
  const url = document.getElementById('req-url').value;
  let target = '?';
  try { const u = new URL(url); target = u.host; } catch (e) { target = url.replace(/^https?:\/\//, '').split('/')[0]; }
  document.getElementById('route-display').textContent = `Client → ${ssh} (SSH) → ${target}`;
  document.getElementById('route-hint').textContent = ssh;
}

function swRT(el, t) {
  el.closest('.tabbar').querySelectorAll('.tabb').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  ['p', 'a', 'h', 'b', 's'].forEach(k => {
    const c = document.getElementById('rt-' + k);
    if (c) c.classList.toggle('on', k === t);
  });
}

function swRespT(el, t) {
  el.closest('.tabbar').querySelectorAll('.tabb').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  const m = { b: 'rr-b', h: 'rr-h', c: 'rr-c', t: 'rr-t' };
  Object.values(m).forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  document.getElementById(m[t]).style.display = '';
}

function addP(tbId, k = '', v = '', d = '', en = true) {
  const tb = document.getElementById(tbId);
  const tr = document.createElement('tr');
  tr.innerHTML =
    `<td><input type="checkbox" class="pchk" ${en ? 'checked' : ''} onchange="updCnt()"></td>
     <td><input class="pi" placeholder="Key" value="${esc(k)}" oninput="updCnt()"></td>
     <td><input class="pi" placeholder="Value" value="${esc(v)}"></td>
     <td><input class="pi" placeholder="Desc" value="${esc(d)}" style="color:var(--t3)"></td>
     <td><button class="dbtn" onclick="this.closest('tr').remove();updCnt()">×</button></td>`;
  tb.appendChild(tr);
  updCnt();
}

function updCnt() {
  const pc = [...document.querySelectorAll('#pt tr')].filter(r => r.querySelector('.pchk')?.checked && r.querySelectorAll('.pi')[0]?.value).length;
  const hc = [...document.querySelectorAll('#ht tr')].filter(r => r.querySelector('.pchk')?.checked && r.querySelectorAll('.pi')[0]?.value).length;
  document.getElementById('pc').textContent = pc;
  document.getElementById('hc').textContent = hc;
}

function setBody(t, btn) {
  document.querySelectorAll('#btypes .tabb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('body-ed').style.display = t === 'none' ? 'none' : '';
}

function updAuth() {
  const t = document.getElementById('auth-type').value;
  const tpls = {
    none: '',
    bearer: `<div class="fg"><div class="fl">Token</div><input class="fi" placeholder="Enter bearer token"></div>`,
    basic: `<div class="r2"><div class="fg"><div class="fl">Username</div><input class="fi" placeholder="Username"></div><div class="fg"><div class="fl">Password</div><input class="fi" type="password" placeholder="Password"></div></div>`,
    apikey: `<div class="r2"><div class="fg"><div class="fl">Key Name</div><input class="fi" placeholder="X-API-Key"></div><div class="fg"><div class="fl">Key Value</div><input class="fi" placeholder="api-key"></div></div><div class="fg"><div class="fl">Add To</div><select class="fs" style="width:160px"><option>Header</option><option>Query Param</option></select></div>`,
    oauth2: `<div class="fg"><div class="fl">Token URL</div><input class="fi" placeholder="https://auth.server/token"></div><div class="r2"><div class="fg"><div class="fl">Client ID</div><input class="fi" placeholder="client_id"></div><div class="fg"><div class="fl">Secret</div><input class="fi" type="password" placeholder="client_secret"></div></div>`
  };
  document.getElementById('auth-fields').innerHTML = tpls[t] || '';
}

function buildUrl() {
  let url = document.getElementById('req-url').value.trim();
  const params = [];
  document.querySelectorAll('#pt tr').forEach(r => {
    if (!r.querySelector('.pchk')?.checked) return;
    const ins = r.querySelectorAll('.pi');
    const k = ins[0]?.value.trim();
    const v = ins[1]?.value.trim();
    if (k) params.push(encodeURIComponent(k) + '=' + encodeURIComponent(v || ''));
  });
  if (params.length) url += (url.includes('?') ? '&' : '?') + params.join('&');
  return url;
}

async function sendReq() {
  const btn = document.getElementById('req-send');
  const method = document.getElementById('req-method').value;
  const sship = document.getElementById('req-sship').value.trim();
  const url = buildUrl();
  if (!url) { toast('Enter a URL first', 'warn'); return; }

  btn.disabled = true;
  btn.innerHTML = `<div class="ld" style="color:#1a0800"><div class="ldd"></div><div class="ldd"></div><div class="ldd"></div></div>`;
  document.getElementById('tunnel-status').textContent = 'Connecting via SSH…';
  document.getElementById('resp-empty').style.display = 'flex';
  document.getElementById('resp-json').style.display = 'none';
  document.getElementById('resp-sbadge').innerHTML = '';
  document.getElementById('resp-meta').textContent = '';
  
  const oldCb = document.getElementById('req-cache-block');
  if (oldCb) oldCb.remove();
  
  const reqPgh = apiProgressStart('req', ['Connecting via SSH tunnel…', 'Sending request…', 'Waiting for response (TTFB)…', 'Receiving & relaying data…']);

  const headers = {};
  if (sship) headers['X-SSH-Tunnel'] = sship;
  
  document.querySelectorAll('#ht tr').forEach(r => {
    if (!r.querySelector('.pchk')?.checked) return;
    const ins = r.querySelectorAll('.pi');
    const k = ins[0]?.value.trim();
    const v = ins[1]?.value.trim();
    if (k) headers[k] = v;
  });

  const at = document.getElementById('auth-type').value;
  if (at === 'bearer') {
    const t = document.querySelector('#auth-fields input')?.value;
    if (t) headers['Authorization'] = 'Bearer ' + t;
  } else if (at === 'basic') {
    const ins = document.querySelectorAll('#auth-fields input');
    if (ins[0]?.value) headers['Authorization'] = 'Basic ' + btoa(ins[0].value + ':' + (ins[1]?.value || ''));
  } else if (at === 'apikey') {
    const ins = document.querySelectorAll('#auth-fields input');
    if (ins[0]?.value && ins[1]?.value) headers[ins[0].value] = ins[1].value;
  }

  const bActive = document.querySelector('#btypes .on')?.textContent;
  let parsedBody = {};
  if (!['GET', 'HEAD'].includes(method) && bActive !== 'none') {
    const bt = document.getElementById('body-ed').value.trim();
    if (bt) {
      try { parsedBody = JSON.parse(bt); } catch { parsedBody = bt; }
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
  }

  const t0 = performance.now();
  try {
    const headersArr = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
    const backendUrl = 'http://10.177.44.29:4415/curl';
    if (!backendUrl) throw new Error('Set the "via backend" field to your ssh-proxy-server URL');
    
    const proxyResp = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sshIp: sship, url, method, headers: headersArr, body: parsedBody })
    });

    if (!proxyResp.ok) {
      const errText = await proxyResp.text().catch(() => '');
      throw new Error(`Backend proxy responded ${proxyResp.status}${errText ? ': ' + errText.slice(0, 200) : ''}`);
    }

    const elapsed = Math.round(performance.now() - t0);
    const text = await proxyResp.text();
    ST.lastResp = text;
    const size = new TextEncoder().encode(text).length;

    const cat = Math.floor(proxyResp.status / 100);
    const bcls = { 2: 's-2xx', 3: 's-2xx', 4: 's-4xx', 5: 's-5xx' }[cat] || 's-4xx';
    const lbl = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved', 302: 'Found',
                  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
                  422: 'Unprocessable', 500: 'Internal Error', 502: 'Bad Gateway', 503: 'Unavailable' };
    
    document.getElementById('resp-sbadge').innerHTML =
      `<div class="sbadge ${bcls}"><span class="sdot"></span>${proxyResp.status} ${lbl[proxyResp.status] || proxyResp.statusText || ''}</div>`;
    document.getElementById('resp-meta').textContent = `${elapsed}ms · ${fmtSz(size)}`;
    document.getElementById('tunnel-status').innerHTML = `<span style="color:var(--green)">✓ Via ${sship}</span>`;
    document.getElementById('resp-empty').style.display = 'none';
    document.getElementById('resp-json').style.display = '';

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(text);
      document.getElementById('resp-json-c').innerHTML = jhl(JSON.stringify(parsedJson, null, 2));
    } catch {
      document.getElementById('resp-json-c').textContent = text;
    }

    const rhb = document.getElementById('rhb');
    rhb.innerHTML = '';
    proxyResp.headers.forEach((v, k) => { rhb.innerHTML += `<tr><td>${k}</td><td>${v}</td></tr>`; });

    const oldCb2 = document.getElementById('req-cache-block');
    if (oldCb2) oldCb2.remove();
    document.getElementById('rr-b').appendChild(buildReqCacheBlock(proxyResp, parsedJson));

    apiProgressFinish(reqPgh, true);
    document.getElementById('rr-t').innerHTML =
      `<div style="color:var(--teal)">▸ Client → backend proxy …… initiated</div>
       <div style="color:var(--sky)">▸ SSH connection to ${sship} ……… ~${Math.floor(elapsed * .12)}ms (est.)</div>
       <div style="color:var(--blue)">▸ TCP connect to target ……… ~${Math.floor(elapsed * .18)}ms (est.)</div>
       <div style="color:var(--t2)">▸ Request forwarded via tunnel</div>
       <div style="color:var(--purple)">▸ Waiting (TTFB) …………… ~${Math.floor(elapsed * .52)}ms (est.)</div>
       <div style="color:var(--green)">▸ Response received & relayed ~${Math.floor(elapsed * .08)}ms (est.)</div>
       <div style="margin-top:8px;border-top:1px solid var(--b1);padding-top:8px">
         <span style="color:var(--t1)">Total: <strong>${elapsed}ms</strong></span>
         <span style="color:var(--t3);margin-left:12px">SSH: ${sship}</span>
         <span style="color:var(--t3);margin-left:12px">Size: ${fmtSz(size)}</span>
       </div>`;

    // Save to history
    const hEntry = { m: method, u: url, s: proxyResp.status, ms: elapsed, ssh: sship, ts: Date.now(), ok: cat === 2 };
    ST.reqHist.unshift(hEntry);
    if (ST.reqHist.length > 50) ST.reqHist.pop();
    localStorage.setItem('devSuiteHist', JSON.stringify(ST.reqHist));
    renderHist();
    toast(`${proxyResp.status} · ${elapsed}ms via ${sship}`);
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    document.getElementById('tunnel-status').innerHTML = `<span style="color:var(--red)">✗ Tunnel failed</span>`;
    document.getElementById('resp-empty').style.display = 'none';
    document.getElementById('resp-json').style.display = '';
    document.getElementById('resp-json-c').innerHTML =
      `<span style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>
       \n\n<span style="color:var(--t3)">This tool runs entirely in your browser, which cannot open raw SSH sockets.
       Real SSH routing needs the companion backend (ssh-proxy-server) running on a
       machine with network access, e.g. on/near ${sship}.
       Check that:
       1. ssh-proxy-server is running and reachable at the "via backend" URL above
       2. It has SSH access to ${sship}
       3. ${sship} can reach the final target host/port
       4. CORS is enabled on the backend for this page's origin</span>`;
    document.getElementById('resp-sbadge').innerHTML = `<div class="sbadge s5"><span class="sdot"></span>Error</div>`;
    apiProgressFinish(reqPgh, false);
    
    const hEntry = { m: method, u: url, s: 'ERR', ms: elapsed, ssh: sship, ts: Date.now(), ok: false };
    ST.reqHist.unshift(hEntry);
    if (ST.reqHist.length > 50) ST.reqHist.pop();
    localStorage.setItem('devSuiteHist', JSON.stringify(ST.reqHist));
    renderHist();
    toast('Request failed', 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
  }
}

function buildReqCacheBlock(resp, json) {
  const entries = [];
  ['cache-control', 'etag', 'age', 'expires', 'x-cache', 'x-cache-hits'].forEach(h => {
    const v = resp.headers.get(h);
    if (v) entries.push([h, v]);
  });

  function scan(obj, prefix) {
    if (!obj || typeof obj !== 'object') return;
    Object.entries(obj).forEach(([k, v]) => {
      if (/cache/i.test(k)) entries.push([prefix + k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
      else if (v && typeof v === 'object' && !Array.isArray(v)) scan(v, prefix + k + '.');
    });
  }
  if (json) scan(json, '');

  const wrap = document.createElement('div');
  wrap.className = 'cache-block';
  wrap.id = 'req-cache-block';
  const body = entries.length ?
    entries.map(([k, v]) => `  <span class="cb-key">-${esc(k)}</span>: <span class="cb-val">${esc(v)}</span>`).join(',\n') :
    '  <span class="cb-val">no cache headers or fields found in this response</span>';
  wrap.innerHTML =
    `<div class="cb-h"><i class="fa-solid fa-layer-group"></i>Cache</div>
     <div class="cb-body">Cache:{\n${body}\n}</div>`;
  return wrap;
}

function renderHist() {
  const h = document.getElementById('req-hist');
  document.getElementById('hist-count').textContent = `(${ST.reqHist.length})`;
  if (!ST.reqHist.length) {
    h.innerHTML = '<div style="padding:10px 13px;font-size:10.5px;color:var(--t3)">No requests yet</div>';
    return;
  }
  h.innerHTML = ST.reqHist.slice(0, 20).map((r, i) => {
    const age = Math.floor((Date.now() - r.ts) / 1000);
    const as = age < 60 ? age + 's' : age < 3600 ? Math.floor(age / 60) + 'm' : Math.floor(age / 3600) + 'h';
    const mc = { GET: 'mg', POST: 'mp', PUT: 'mu', PATCH: 'mpa', DELETE: 'md' }[r.m] || 'mg';
    let path = r.u;
    try { path = new URL(r.u).pathname; } catch (e) {}
    const sc = r.ok ? 'ok' : r.s === 'ERR' ? 'err' : 'warn';
    return `<div class="hi" onclick="loadFromHist(${i})" title="${r.u}">
      <span class="mt ${mc}">${r.m}</span>
      <span class="hi-url">${path}</span>
      <span class="hi-s ${sc}">${r.s}</span>
      <span class="hi-t">${as}</span>
    </div>`;
  }).join('');
}

function loadFromHist(i) {
  const r = ST.reqHist[i];
  if (!r) return;
  document.getElementById('req-method').value = r.m;
  document.getElementById('req-url').value = r.u;
  if (r.ssh) document.getElementById('req-sship').value = r.ssh;
  styleM();
  updateRouteDisplay();
  toast('Loaded from history');
}

function saveReq() {
  const m = document.getElementById('req-method').value;
  const u = document.getElementById('req-url').value;
  const b = document.getElementById('body-ed').value;
  const ssh = document.getElementById('req-sship').value;
  if (!u) { toast('Enter a URL first', 'warn'); return; }
  const name = prompt('Save request as:', m + ' ' + new URL(u).pathname) || null;
  if (!name) return;
  ST.savedReqs.push({ m, u, b, ssh, name, ts: Date.now() });
  localStorage.setItem('devSuiteReqs', JSON.stringify(ST.savedReqs));
  renderSavedReqs();
  toast('Request saved: ' + name);
}

function renderSavedReqs() {
  const list = document.getElementById('saved-coll-list');
  const wrap = document.getElementById('saved-coll-wrap');
  if (!ST.savedReqs.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  const mc = { GET: 'mg', POST: 'mp', PUT: 'mu', PATCH: 'mpa', DELETE: 'md' };
  list.innerHTML = ST.savedReqs.map((r, i) =>
    `<div class="ci" onclick="loadSaved(${i})" style="justify-content:space-between">
      <span class="mt ${mc[r.m] || 'mg'}">${r.m}</span>
      <span class="rn">${r.name}</span>
      <button onclick="event.stopPropagation();deleteSaved(${i})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:11px;padding:0 2px" title="Delete">×</button>
    </div>`
  ).join('');
}

function loadSaved(i) {
  const r = ST.savedReqs[i];
  if (!r) return;
  document.getElementById('req-method').value = r.m;
  document.getElementById('req-url').value = r.u;
  document.getElementById('body-ed').value = r.b || '';
  if (r.ssh) document.getElementById('req-sship').value = r.ssh;
  styleM();
  updateRouteDisplay();
  toast('Loaded: ' + r.name);
}

function deleteSaved(i) {
  ST.savedReqs.splice(i, 1);
  localStorage.setItem('devSuiteReqs', JSON.stringify(ST.savedReqs));
  renderSavedReqs();
  toast('Deleted');
}

function newReq() {
  document.getElementById('req-url').value = '';
  document.getElementById('body-ed').value = '';
  document.getElementById('req-method').value = 'GET';
  styleM();
  updateRouteDisplay();
  document.querySelectorAll('.ci').forEach(c => c.classList.remove('on'));
}

function filterReqs(v) {
  document.querySelectorAll('.ci').forEach(el => {
    el.style.display = el.querySelector('.rn')?.textContent.toLowerCase().includes(v.toLowerCase()) ? '' : 'none';
  });
}

function toggleColl(el) { el.classList.toggle('op'); }

function copyResp() {
  if (ST.lastResp) { navigator.clipboard.writeText(ST.lastResp); toast('Response copied'); } else toast('No response yet', 'warn');
}

function dlResp() {
  if (!ST.lastResp) { toast('No response', 'warn'); return; }
  const a = document.createElement('a');
  a.href = 'data:application/json,' + encodeURIComponent(ST.lastResp);
  a.download = 'response.json';
  a.click();
  toast('Downloaded');
}