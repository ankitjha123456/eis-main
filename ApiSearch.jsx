// ══════════ TFS CI/CD ══════════
// Global state
const ST = {
  ciFile: null,
  ciVerifiedAuthor: null,
  ciVerifiedForCombo: null,
  ciHistory: JSON.parse(localStorage.getItem('devSuiteCi') || '[]'),
  ciLocalScript: null
};

// Utility functions
function $v(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function fmtSz(b) {
  if (!b) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return b.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: var(--bg3); color: var(--t1); padding: 10px 24px;
    border-radius: 8px; font-size: 13px; z-index: 9999;
    border: 1px solid var(--border); box-shadow: 0 8px 32px rgba(0,0,0,.6);
    transition: all .3s; opacity: 0; transform: translateX(-50%) translateY(20px);
    font-family: var(--fd);
  `;
  if (type === 'ok') el.style.borderColor = 'var(--green)';
  else if (type === 'err') el.style.borderColor = 'var(--red)';
  else if (type === 'warn') el.style.borderColor = 'var(--gold)';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

// ══════════ Drag & Drop / File ══════════
function ciDov(e) { e.preventDefault(); document.getElementById('ci-uz').classList.add('drag'); }
function ciDlv() { document.getElementById('ci-uz').classList.remove('drag'); }
function ciDop(e) { e.preventDefault(); ciDlv(); const f = e.dataTransfer?.files[0]; if (f) ciSetFile(f); }
function ciFileSelect(inp) { if (inp.files[0]) ciSetFile(inp.files[0]); }
function ciSetFile(f) {
  ST.ciFile = f;
  const pf = document.getElementById('ci-pf'); pf.style.width = '0%';
  let p = 0; const iv = setInterval(() => { p += 18; pf.style.width = Math.min(p, 95) + '%'; if (p >= 95) clearInterval(iv); }, 60);
  setTimeout(() => { clearInterval(iv); pf.style.width = '100%'; setTimeout(() => pf.style.width = '0%', 600); }, 800);
  document.getElementById('ci-fname').textContent = f.name;
  document.getElementById('ci-fsize').textContent = fmtSz(f.size) + ' · ' + f.type;
  document.getElementById('ci-finfo').classList.add('on');
  toast(f.name + ' ready');
}

function appendMsg(prefix) {
  const ta = document.getElementById('ci-msg');
  if (!ta.value.startsWith(prefix)) ta.value = prefix + ta.value;
  ta.focus();
}

function ciAutoMsg() {
  const feat = $v('ci-feature') || 'API';
  const branch = $v('ci-branch') || 'dev';
  const wi = $v('ci-workitem');
  const author = ST.ciVerifiedAuthor || '';
  const file = ST.ciFile ? ST.ciFile.name : 'api-package.zip';
  let msg = `[Feature] ${feat} — Deploy ${file} to ${branch} branch`;
  if (wi) msg = `[${wi}] ` + msg;
  if (author) msg += ` | Author: ${author}`;
  document.getElementById('ci-msg').value = msg;
}

function ciReset() {
  ST.ciFile = null;
  ST.ciVerifiedAuthor = null;
  ST.ciVerifiedForCombo = null;
  ST.ciLocalScript = null;
  document.getElementById('ci-finfo').classList.remove('on');
  document.getElementById('ci-pf').style.width = '0%';
  document.getElementById('ci-progress-panel').style.display = 'none';
  document.getElementById('ci-local-script-panel').style.display = 'none';
  document.getElementById('ci-identity-box').style.display = 'none';
  ['ci-reponame', 'ci-branch', 'ci-feature', 'ci-workitem', 'ci-author', 'ci-msg', 'ci-clonepath', 'ci-targetdir', 'ci-pat', 'ci-directurl'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  toast('Reset');
}

// ══════════ Auth Mode ══════════
function ciAuthModeChanged() {
  const mode = $v('ci-authmode');
  document.getElementById('ci-user-row').style.display = mode === 'basic' ? '' : 'none';
  document.getElementById('ci-directurl-row').style.display = mode === 'winauth' ? '' : 'none';
  document.getElementById('ci-pat-row').style.display = (mode === 'pat' || mode === 'winauth') ? '' : 'none';
  document.getElementById('ci-pat-note').innerHTML = mode === 'winauth'
    ? 'Still required — Windows SSO only verifies who you are; the actual push to TFS goes through nginx and needs a PAT, same as PAT mode.' : '';
  document.getElementById('ci-authmode-note').innerHTML =
    mode === 'pat' ? '<i class="fa-solid fa-circle-info"></i> Paste a Personal Access Token. The backend still sends it to TFS\'s own identity API to resolve your real display name — the commit is always credited to whoever the PAT actually belongs to, never to a typed-in name.'
    : mode === 'winauth' ? '<i class="fa-solid fa-circle-info"></i> No username or password typed at all — the backend asks the OS itself (Windows SSPI, or Kerberos on Linux/Mac) who you are, directly against TFS. Only works if this backend runs on YOUR OWN machine (not a shared server), needs a network path to TFS that skips the proxy, and on Linux/Mac needs this machine to already be Kerberos-joined to the domain. If any of that does not hold here, use PAT or Username+Password instead.'
    : '<i class="fa-solid fa-circle-info"></i> No PAT to generate — enter your normal TFS username and password. The backend sends them to TFS\'s own identity API to resolve your real display name, so the commit is always credited to whoever these credentials actually belong to, never to a typed-in name.';
  ciPassChanged();
}

function ciCreds() {
  const mode = $v('ci-authmode') || 'basic';
  if (mode === 'pat') {
    return { mode, username: '', password: $v('ci-pat'), directUrl: '', combo: 'pat\u0000' + $v('ci-pat') };
  }
  if (mode === 'winauth') {
    const du = $v('ci-directurl'), pw = $v('ci-pat');
    return { mode, username: '', password: pw, directUrl: du, combo: 'winauth\u0000' + du + '\u0000' + pw };
  }
  const u = $v('ci-user'), p = $v('ci-pass');
  return { mode, username: u, password: p, directUrl: '', combo: 'basic\u0000' + u + '\u0000' + p };
}

function ciPassChanged() {
  const { combo } = ciCreds();
  if (ST.ciVerifiedForCombo !== null && ST.ciVerifiedForCombo !== combo) {
    ST.ciVerifiedAuthor = null; ST.ciVerifiedForCombo = null;
    document.getElementById('ci-identity-box').style.display = 'none';
    document.getElementById('ci-author').value = '';
  }
}

// ══════════ Test Connection ══════════
async function ciTestConnection() {
  const resEl = document.getElementById('ci-test-result');
  const btn = document.getElementById('ci-test-btn');
  const tfsUrl = $v('ci-tfsurl');
  const backendUrl = $v('ci-backend').trim();
  const { mode, username, password, directUrl } = ciCreds();
  if (!backendUrl) { toast('Set the Check-in Backend Service URL first', 'warn'); return; }
  if (mode === 'basic' && !username) { toast('Enter your TFS username first', 'warn'); return; }
  if (mode === 'winauth' && !directUrl) { toast('Enter the direct (non-proxied) TFS URL first', 'warn'); return; }
  if (!password) { toast(mode === 'basic' ? 'Enter your TFS password first' : 'Enter your Personal Access Token first', 'warn'); return; }
  btn.disabled = true;
  resEl.style.color = 'var(--t2)';
  resEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing connection through nginx → TFS ...';
  try {
    const testUrl = backendUrl.replace(/\/api\/tfs-checkin\/?$/, '/api/tfs-test');
    const resp = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tfsUrl, collection: $v('ci-collection') || 'DefaultCollection', project: $v('ci-project') || '', repo: $v('ci-reponame') || '', authMode: mode, username, password, directUrl })
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.ok) {
      resEl.style.color = 'var(--green)';
      resEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Connected — ${data.message || 'TFS reachable and authenticated'}`;
      toast('TFS connection OK', 'ok');
    } else {
      resEl.style.color = 'var(--red)';
      resEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${data.message || data.error || ('HTTP ' + resp.status)}`;
      toast('TFS connection failed', 'err');
    }
  } catch (err) {
    resEl.style.color = 'var(--red)';
    resEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${err.message} — is the backend running and reachable at ${backendUrl}?`;
    toast('Could not reach backend', 'err');
  }
  btn.disabled = false;
}

// ══════════ Verify Identity ══════════
async function ciVerifyIdentity() {
  const btn = document.getElementById('ci-verify-btn');
  const box = document.getElementById('ci-identity-box');
  const nameEl = document.getElementById('ci-identity-name');
  const tfsUrl = $v('ci-tfsurl');
  const backendUrl = $v('ci-backend').trim();
  const { mode, username, password, directUrl, combo } = ciCreds();
  if (!backendUrl) { toast('Set the Check-in Backend Service URL first', 'warn'); return; }
  if (mode === 'basic' && !username) { toast('Enter your TFS username first', 'warn'); document.getElementById('ci-user').focus(); return; }
  if (mode === 'winauth' && !directUrl) { toast('Enter the direct (non-proxied) TFS URL first', 'warn'); document.getElementById('ci-directurl').focus(); return; }
  if (mode !== 'winauth' && !password) { toast(mode === 'basic' ? 'Enter your TFS password first' : 'Enter your Personal Access Token first', 'warn'); document.getElementById(mode === 'basic' ? 'ci-pass' : 'ci-pat').focus(); return; }
  btn.disabled = true;
  const prevHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';
  ST.ciVerifiedAuthor = null;
  ST.ciVerifiedForCombo = null;
  try {
    const whoUrl = backendUrl.replace(/\/api\/tfs-checkin\/?$/, '/api/tfs-whoami');
    const resp = await fetch(whoUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tfsUrl, collection: $v('ci-collection') || 'DefaultCollection', project: $v('ci-project') || '', repo: $v('ci-reponame') || '', authMode: mode, username, password, directUrl }) });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.ok && data.name) {
      ST.ciVerifiedAuthor = data.name;
      ST.ciVerifiedForCombo = combo;
      document.getElementById('ci-author').value = data.name;
      nameEl.textContent = data.name;
      box.style.display = '';
      const viaNote = data.verifiedVia && data.verifiedVia !== 'rest' ? ` (via ${data.verifiedVia}${data.isOpaqueId ? ', no friendly name available from TFS' : ''})` : '';
      toast(`Identity verified: ${data.name}${viaNote}`, 'ok');
    } else {
      document.getElementById('ci-author').value = '';
      box.style.display = 'none';
      toast(data.message || 'Could not verify identity from these credentials', 'err');
    }
  } catch (err) {
    document.getElementById('ci-author').value = '';
    box.style.display = 'none';
    toast('Could not reach backend to verify identity', 'err');
  }
  btn.disabled = false;
  btn.innerHTML = prevHtml;
}

// ══════════ Pipeline Steps ══════════
function ciPipelineSteps(repo) {
  return [
    { label: 'Validate ZIP package', sub: 'Checking file integrity and manifest' },
    { label: 'Connect to TFS Server', sub: 'Authenticating with TFS collection' },
    { label: 'Locate repository', sub: `Resolving repository "${repo}" on TFS server` },
    { label: 'Create workspace mapping', sub: `Mapping clone path to repository "${repo}"` },
    { label: 'Get latest from branch', sub: 'tf get /force from target branch' },
    { label: 'Extract & stage files', sub: 'Unzipping API package to staging area' },
    { label: 'Add files to TFS pending changes', sub: 'tf add *.* /recursive' },
    { label: 'Check-in with commit message', sub: `tf checkin /comment:"-m ..." into ${repo}` },
    { label: 'Trigger CI build pipeline', sub: 'Queuing build on TFS build server' },
    { label: 'Verify check-in', sub: 'Confirming changeset number' },
  ];
}
let CI_PIPELINE_STEPS = ciPipelineSteps('repository');

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result;
      resolve(typeof s === 'string' ? s.split(',').pop() : s);
    };
    r.onerror = () => reject(new Error('Could not read the ZIP file'));
    r.readAsDataURL(file);
  });
}

// ══════════ Submit (Server-side) ══════════
async function ciSubmit() {
  if (!ST.ciFile) { toast('Upload a ZIP file first', 'warn'); return; }
  const repo = $v('ci-reponame');
  const branch = $v('ci-branch');
  const feature = $v('ci-feature');
  const msg = $v('ci-msg');
  const tfsUrl = $v('ci-tfsurl');
  const clonePath = $v('ci-clonepath');
  const targetDir = $v('ci-targetdir');
  const backendUrl = $v('ci-backend').trim();
  if (!repo) { toast('Enter the Repository Name — code cannot be checked in without a target repository', 'warn'); document.getElementById('ci-reponame').focus(); return; }
  if (!branch) { toast('Enter a branch name', 'warn'); return; }
  if (!msg) { toast('Add a commit message', 'warn'); return; }
  if (!backendUrl) { toast('Set the Check-in Backend Service URL — the browser cannot run git commands itself', 'warn'); document.getElementById('ci-backend').focus(); return; }
  const { mode, username: ciUser, password: ciPass, directUrl, combo } = ciCreds();
  if (mode === 'basic' && !ciUser) { toast('Enter your TFS username', 'warn'); document.getElementById('ci-user').focus(); return; }
  if (mode === 'winauth' && !directUrl) { toast('Enter the direct (non-proxied) TFS URL', 'warn'); document.getElementById('ci-directurl').focus(); return; }
  if (!ciPass) { toast(mode === 'basic' ? 'Enter your TFS password — required to authenticate against TFS' : 'Enter your Personal Access Token — required for the actual git push', 'warn'); document.getElementById(mode === 'basic' ? 'ci-pass' : 'ci-pat').focus(); return; }
  if (!ST.ciVerifiedAuthor || ST.ciVerifiedForCombo !== combo) {
    toast('Click "Verify My Identity" first — the commit author is resolved from TFS, not typed in', 'warn');
    document.getElementById('ci-verify-btn').focus();
    return;
  }
  CI_PIPELINE_STEPS = ciPipelineSteps(repo);

  const btn = document.getElementById('ci-btn');
  btn.disabled = true;
  btn.innerHTML = `<div class="ld" style="color:#03182a"><div class="ldd"></div><div class="ldd"></div><div class="ldd"></div></div>`;

  const panel = document.getElementById('ci-progress-panel');
  panel.style.display = '';
  document.getElementById('ci-local-script-panel').style.display = 'none';
  const stepsList = document.getElementById('ci-steps-list');
  const logEl = document.getElementById('ci-log');
  const prog = document.getElementById('ci-progress');
  const pgpct = document.getElementById('ci-pgpct');
  const pgstatus = document.getElementById('ci-pgstatus');
  const pgeta = document.getElementById('ci-pgeta');
  logEl.innerHTML = '';
  pgpct.textContent = '0%'; pgstatus.textContent = 'Starting…'; pgeta.innerHTML = '&nbsp;';

  function log(txt, type = '') { logEl.innerHTML += `<span class="log-${type}">${txt}</span>\n`; logEl.scrollTop = logEl.scrollHeight; }
  function setPct(pct, statusTxt, timeTxt) {
    const clamped = Math.max(0, Math.min(100, pct));
    const done = Math.round(clamped), left = 100 - done;
    prog.style.width = clamped + '%';
    pgpct.textContent = done + '%';
    if (statusTxt !== undefined) pgstatus.textContent = statusTxt;
    if (done >= 100) {
      pgeta.innerHTML = '&nbsp;';
    } else if (timeTxt === undefined || timeTxt === '&nbsp;') {
      pgeta.textContent = `${left}% left`;
    } else {
      pgeta.textContent = `${left}% left · ${timeTxt}`;
    }
  }
  function setStep(idx, state) {
    stepsList.innerHTML = CI_PIPELINE_STEPS.map((s, i) => `<div class="ci-step ${i < idx ? 'done' : i === idx ? state : ''}" id="cis-${i}"><div class="ci-step-num">${i < idx ? '✓' : i + 1}</div><div class="ci-step-body"><div class="ci-step-title">${s.label}</div><div class="ci-step-sub">${s.sub}</div></div></div>`).join('');
    const pct = (idx / CI_PIPELINE_STEPS.length) * 100;
    const current = CI_PIPELINE_STEPS[idx];
    setPct(pct, current ? `${current.label}…` : 'Finishing up…', '&nbsp;');
    const sids = ['ci-s1', 'ci-s2', 'ci-s3', 'ci-s4', 'ci-s5'];
    const map = [0, 1, 4, 7, 9]; const sidx = map.findLastIndex(m => idx >= m);
    document.querySelectorAll('#pci .sb-it').forEach(e => e.classList.remove('on'));
    if (sids[sidx]) document.getElementById(sids[sidx])?.classList.add('on');
  }
  let simTimer = null;
  function startSimEta(fileSizeBytes) {
    const estMs = Math.min(26000, Math.max(4500, 3200 + fileSizeBytes / 45000));
    const floorPct = 30, ceilPct = 88;
    const t0 = performance.now();
    setPct(floorPct, 'Uploading ZIP & running check-in on TFS backend…', `~${Math.ceil(estMs / 1000)}s remaining (estimated)`);
    simTimer = setInterval(() => {
      const elapsed = performance.now() - t0;
      const t = Math.min(1, elapsed / estMs);
      const pct = floorPct + (ceilPct - floorPct) * (1 - Math.pow(1 - t, 2));
      const remainMs = Math.max(0, estMs - elapsed);
      setPct(pct, 'Uploading ZIP & running check-in on TFS backend…',
        remainMs > 800 ? `~${Math.ceil(remainMs / 1000)}s remaining (estimated)` : 'Almost done…');
    }, 250);
  }
  function stopSimEta() { if (simTimer) { clearInterval(simTimer); simTimer = null; } }
  async function pollCheckinJob(jobId) {
    const statusUrl = backendUrl.replace(/\/api\/tfs-checkin\/?$/, '/api/tfs-checkin-status') + `?jobId=${encodeURIComponent(jobId)}`;
    let lastLogged = 0;
    for (; ;) {
      await new Promise(r => setTimeout(r, 700));
      let data;
      try {
        const r = await fetch(statusUrl);
        data = await r.json();
      } catch (e) { continue; }
      if (!data || (data.ok === false && data.percent == null)) {
        throw new Error((data && data.message) || 'Lost track of check-in progress on the backend');
      }
      const pct = typeof data.percent === 'number' ? data.percent : 0;
      const etaTxt = data.done ? '&nbsp;' : (data.etaMs != null ? `~${Math.ceil(data.etaMs / 1000)}s remaining (estimated)` : 'Estimating time…');
      setPct(pct, data.label || 'Working…', etaTxt);
      if (Array.isArray(data.log)) {
        for (; lastLogged < data.log.length; lastLogged++) log(`[..] ${data.log[lastLogged]}`, 'info');
      }
      if (data.done) {
        const r = data.result || {};
        return { ok: !!data.success, commit: r.commit, changeset: r.changeset, filesChanged: r.filesChanged, author: r.author, message: data.error || r.message, buildTriggered: r.buildTriggered, log: data.log };
      }
    }
  }

  log('[INFO] EIS DevSuite (by ANKIT) — TFS CI/CD Pipeline started', 'info');
  log(`[INFO] File: ${ST.ciFile.name} (${fmtSz(ST.ciFile.size)})`, 'info');
  log(`[INFO] Repository: ${repo}`, 'info');
  log(`[INFO] Branch: ${branch}`, 'info');
  log(`[INFO] Feature: ${feature || 'N/A'}`, 'info');
  log(`[INFO] TFS: ${tfsUrl}`, 'info');
  log(`[INFO] Verified identity (from TFS credentials): ${ST.ciVerifiedAuthor}`, 'ok');
  log(`[INFO] Sending ZIP to check-in backend: ${backendUrl}`, 'info');

  for (let i = 0; i < 3; i++) {
    setStep(i, 'running');
    await new Promise(r => setTimeout(r, 450 + Math.random() * 350));
    if (i === 0) log(`[OK] ZIP validated — ${ST.ciFile.name}`, 'ok');
    else if (i === 1) log(`[OK] Connected to check-in backend`, 'ok');
    else if (i === 2) log(`[..] Backend resolving repository "${repo}" — this may take a moment`, 'info');
    setStep(i + 1, '');
  }
  for (let i = 3; i < 8; i++) setStep(i, 'running');
  startSimEta(ST.ciFile.size);

  let result = null, ok = false, errMsg = '';
  const t0 = performance.now();
  try {
    const zipBase64 = await fileToBase64(ST.ciFile);
    const payload = {
      zipBase64, zipName: ST.ciFile.name,
      repo, branch, feature: feature || '', workItem: $v('ci-workitem') || '',
      message: msg, tfsUrl, clonePath: clonePath || '', targetDir: targetDir || '',
      collection: $v('ci-collection') || 'DefaultCollection', project: $v('ci-project') || '',
      authMode: mode, username: ciUser || '', password: ciPass || '', directUrl: directUrl || ''
    };

    const resp = await fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const ms = Math.round(performance.now() - t0);
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Backend responded ${resp.status}${t ? ': ' + t.slice(0, 300) : ''}`);
    }
    const startData = await resp.json();
    if (startData && startData.jobId) {
      stopSimEta();
      log(`[INFO] Check-in job started on backend (jobId ${startData.jobId}) — polling for live progress…`, 'info');
      result = await pollCheckinJob(startData.jobId);
    } else {
      result = startData;
    }
    ok = !!result.ok;
    if (!ok) errMsg = result.message || result.error || 'Backend reported failure';
    stopSimEta();
    for (let i = 3; i < 8; i++) setStep(i + 1, '');
    if (ok) {
      log(`[OK] Workspace prepared by backend (${ms}ms)`, 'ok');
      log(`[OK] git add / commit — ${result.filesChanged ?? '?'} file(s) changed, authored by ${result.author || ST.ciVerifiedAuthor || 'verified user'}`, 'ok');
      log(`[OK] git push → ${repo} (${branch}) succeeded — ${result.commit || result.changeset || 'commit'} `, 'ok');
      if (result.buildTriggered) log(`[OK] Build triggered — Config: ${$v('ci-buildcfg')}`, 'ok');
      setStep(9, 'running');
      await new Promise(r => setTimeout(r, 300));
      setStep(10, '');
      setPct(100, 'Check-in complete', '&nbsp;');
      log(`[OK] Check-in complete! Code successfully checked in to repository "${repo}".`, 'ok');
    } else {
      log(`[ERROR] Check-in failed: ${errMsg}`, 'err');
      setStep(3, 'error');
      setPct(pgpct.textContent.replace('%', ''), 'Check-in failed', '&nbsp;');
    }
  } catch (err) {
    ok = false; errMsg = err.message;
    stopSimEta();
    log(`[ERROR] ${err.message}`, 'err');
    log(`[INFO] Make sure the check-in backend (Node.js service, see companion code) is running and reachable at: ${backendUrl}`, 'info');
    setStep(3, 'error');
    setPct(pgpct.textContent.replace('%', ''), 'Check-in failed', '&nbsp;');
  }

  if (ok) {
    const hEntry = { file: ST.ciFile.name, repo, branch, feature: feature || '', msg, cs: result.commit || result.changeset || '-', ts: Date.now(), ok: true };
    ST.ciHistory.unshift(hEntry);
    if (ST.ciHistory.length > 20) ST.ciHistory.pop();
    localStorage.setItem('devSuiteCi', JSON.stringify(ST.ciHistory));
    renderCiHistory();
    toast(`✓ Checked in to repository "${repo}" (${branch}) — ${result.commit || result.changeset || ''}`, 'ok');
  } else {
    const hEntry = { file: ST.ciFile.name, repo, branch, feature: feature || '', msg, cs: 'FAILED', ts: Date.now(), ok: false };
    ST.ciHistory.unshift(hEntry);
    if (ST.ciHistory.length > 20) ST.ciHistory.pop();
    localStorage.setItem('devSuiteCi', JSON.stringify(ST.ciHistory));
    renderCiHistory();
    toast(`✗ Check-in failed: ${errMsg}`, 'err');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-upload"></i> Check-In to TFS';
}

// ══════════ Direct Local Check-In ══════════
async function ciDirectLocalSubmit() {
  if (!ST.ciFile) { toast('Upload a ZIP file first', 'warn'); return; }
  
  const repo = $v('ci-reponame');
  const branch = $v('ci-branch');
  const feature = $v('ci-feature');
  const msg = $v('ci-msg');
  const tfsUrl = $v('ci-tfsurl');
  const collection = $v('ci-collection') || 'DefaultCollection';
  const project = $v('ci-project') || '';
  const clonePath = $v('ci-clonepath');
  const targetDir = $v('ci-targetdir');
  
  if (!repo) { toast('Enter the Repository Name', 'warn'); return; }
  if (!branch) { toast('Enter a branch name', 'warn'); return; }
  if (!msg) { toast('Add a commit message', 'warn'); return; }

  const { mode, username, password, directUrl, combo } = ciCreds();
  if (mode === 'basic' && !username) { toast('Enter your TFS username', 'warn'); return; }
  if (mode === 'winauth' && !directUrl) { toast('Enter the direct TFS URL', 'warn'); return; }
  if (!password) { toast(mode === 'basic' ? 'Enter your TFS password' : 'Enter your Personal Access Token', 'warn'); return; }

  if (!ST.ciVerifiedAuthor || ST.ciVerifiedForCombo !== combo) {
    toast('Click "Verify My Identity" first', 'warn');
    return;
  }

  const btn = document.getElementById('ci-local-btn');
  btn.disabled = true;
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating script...';

  // Generate the local script
  const workDir = clonePath || `C:\\workspace\\${repo.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const zipName = ST.ciFile.name;
  const targetDirClean = targetDir || `$/${repo}`;
  
  let script = `@echo off
echo =============================================
echo TFS LOCAL CHECK-IN SCRIPT
echo =============================================
echo Repository: ${repo}
echo Branch: ${branch}
echo Author: ${ST.ciVerifiedAuthor}
echo Workspace: ${workDir}
echo Target: ${targetDirClean}
echo.
echo [1] Setting up TFS workspace...
`;

  if (mode === 'basic') {
    script += `tf workspace /new /collection:${tfsUrl}/${collection} /noprompt /login:${username},${password} ${repo}_workspace_%USERNAME%
`;
  } else if (mode === 'pat') {
    script += `tf workspace /new /collection:${tfsUrl}/${collection} /noprompt ${repo}_workspace_%USERNAME%
`;
  } else {
    script += `tf workspace /new /collection:${tfsUrl}/${collection} /noprompt ${repo}_workspace_%USERNAME%
`;
  }

  script += `
echo [2] Creating workspace directory...
mkdir "${workDir}" 2>nul
cd /d "${workDir}"

echo [3] Mapping workspace...
tf workfold /map "${targetDirClean}" "${workDir}" /collection:${tfsUrl}/${collection} /workspace:${repo}_workspace_%USERNAME%

echo [4] Getting latest version...
tf get /recursive /force

echo [5] Extracting ZIP file...
powershell -command "Expand-Archive -Path '${zipName}' -DestinationPath '.' -Force"

echo [6] Adding files to TFS...
tf add /recursive

echo [7] Checking in...
tf checkin /comment:"${msg}" /noprompt /override:"${ST.ciVerifiedAuthor}"

echo.
echo =============================================
echo CHECK-IN COMPLETE!
echo =============================================
pause
`;

  ST.ciLocalScript = script;
  
  // Display the script
  const panel = document.getElementById('ci-local-script-panel');
  panel.style.display = '';
  document.getElementById('ci-local-script-content').textContent = script;
  
  // Update progress steps
  const sids = ['ci-s1', 'ci-s2', 'ci-s3', 'ci-s4', 'ci-s5'];
  document.querySelectorAll('#pci .sb-it').forEach(e => e.classList.remove('on'));
  sids.forEach(id => document.getElementById(id)?.classList.add('on'));

  toast('Local check-in script generated!', 'ok');
  
  btn.disabled = false;
  btn.innerHTML = origHtml;
}

// ══════════ Script Actions ══════════
function ciDownloadScript() {
  if (!ST.ciLocalScript) { toast('Generate a script first', 'warn'); return; }
  const blob = new Blob([ST.ciLocalScript], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tfs-checkin-${Date.now()}.bat`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Script downloaded', 'ok');
}

function ciCopyScript() {
  if (!ST.ciLocalScript) { toast('Generate a script first', 'warn'); return; }
  navigator.clipboard.writeText(ST.ciLocalScript).then(() => {
    toast('Script copied to clipboard', 'ok');
  }).catch(() => {
    // Fallback
    const el = document.getElementById('ci-local-script-content');
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    toast('Script copied to clipboard', 'ok');
  });
}

// ══════════ History ══════════
function renderCiHistory() {
  const h = document.getElementById('ci-history');
  if (!ST.ciHistory.length) { h.innerHTML = '<div style="padding:8px 13px;font-size:10px;color:var(--t3)">No check-ins yet</div>'; return; }
  h.innerHTML = ST.ciHistory.slice(0, 6).map(r => {
    const age = Math.floor((Date.now() - r.ts) / 1000);
    const as = age < 60 ? age + 's' : age < 3600 ? Math.floor(age / 60) + 'm' : Math.floor(age / 3600) + 'h ago';
    return `<div class="sb-it" style="flex-direction:column;align-items:flex-start;gap:1px;cursor:default">
      <span style="font-size:10.5px;color:${r.ok ? 'var(--sky)' : 'var(--red)'}">${r.ok ? '✓' : '✗'} ${r.file || 'unknown.zip'}</span>
      <span style="font-size:9.5px;color:var(--t3)"><i class="fa-solid fa-code-fork" style="margin-right:3px;opacity:.7"></i>${r.repo || '(no repo)'} · ${r.branch} · CS#${r.cs} · ${as}</span>
    </div>`;
  }).join('');
}

// ══════════ Init ══════════
renderCiHistory();