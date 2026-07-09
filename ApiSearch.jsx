https://10.177.56.207/tfs/SBIEIS/EISGITREPO/_git/misc-thirdpartyepay-sys-sapi
this is a correct URL

this is my nginx:
   location /tfs/ {
        rewrite ^/tfs/(.*)$ /$1 break;

        proxy_pass https://10.177.56.207:443/tfs/SBIEIS/EISGITREPO/_git/;

        # --- required for NTLM to work through the proxy ---
        proxy_http_version 1.1;
        proxy_set_header Connection "";     # let the keepalive upstream manage it

        # --- TLS between nginx and the real TFS server ---
        proxy_ssl_server_name on;


        # --- preserve headers TFS needs to build correct URLs in responses ---
        proxy_set_header Host 10.177.56.207;
        proxy_set_header X-Forwarded-Host $host:$server_port;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        include snippets/cors_proxy_ssl.conf;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
this is my server.js:



/**
 * EIS DevSuite — TFS Check-in Backend (companion service)
 * ---------------------------------------------------------
 * ZERO NPM DEPENDENCIES. Uses only Node's built-in modules (http, fs, path,
 * os, child_process) plus the `git` command-line client that's already on
 * your machine. Nothing to `npm install` — if your environment blocks
 * package installs, this still runs.
 *
 * It does exactly what you already do by hand at the command prompt:
 *   git clone / git init  →  git add  →  git commit  →  git push
 * just driven from a small HTTP endpoint instead of typed manually, and
 * pointed at TFS THROUGH the nginx proxy instead of the raw TFS URL.
 *
 *   Browser (final07072026_fixed.html)
 *        │  POST JSON { zipBase64, repo, branch, credentials, ... }
 *        ▼
 *   THIS SERVICE   (run: node server.js)
 *        │  git clone/push  (plain HTTPS, credentials in the remote URL)
 *        ▼
 *   nginx  10.177.44.29:4415   ──proxy_pass──▶   TFS  10.177.56.207:443
 *
 * PREREQUISITES:
 *   1. Node.js 18+ (for fs.cpSync / fs.rmSync — both built in, no install)
 *   2. `git` on PATH (already installed per your message)
 *   3. Network access from this machine to http://10.177.44.29:4415
 *
 * RUN:
 *   node server.js
 * (No `npm install` step at all.)
 *
 * Listens on port 5000 by default — must match the "Check-in Backend
 * Service URL" field in the frontend, e.g. http://<this-host>:4416/api/tfs-checkin
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 4416;
const GIT = process.env.GIT_EXE || 'git'; // override if git isn't on PATH

// ─────────────────────────────────────────────────────────────────────────
// tiny helpers (no libraries)
// ─────────────────────────────────────────────────────────────────────────

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  });
  res.end(body);
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function run(args, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(
      GIT,
      args,
      { cwd, maxBuffer: 1024 * 1024 * 50, timeout: timeoutMs || 60000 },
      (err, stdout, stderr) => {
        const out = (stdout || '').toString();
        const errOut = (stderr || '').toString();
        if (err) return reject(new Error(errOut.trim() || out.trim() || err.message));
        resolve((out + errOut).trim());
      }
    );
  });
}

// Runs a raw OS command (used only for zip extraction, not git).
function runCmd(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, maxBuffer: 1024 * 1024 * 50, timeout: timeoutMs || 60000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || stdout || err.message || '').toString().trim()));
      resolve((stdout || '').toString());
    });
  });
}

// Extracts a zip using tools already on the OS — no unzip library needed.
//   Windows: PowerShell's Expand-Archive (built into Windows 10+/Server 2016+)
//   Linux/Mac: the `unzip` command (near-universally preinstalled)
async function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    const safe = (s) => s.replace(/'/g, "''");
    const psCmd = `Expand-Archive -LiteralPath '${safe(zipPath)}' -DestinationPath '${safe(destDir)}' -Force`;
    await runCmd('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], undefined, 120000);
  } else {
    await runCmd('unzip', ['-o', zipPath, '-d', destDir], undefined, 120000);
  }
}

// Builds the plain TFS Git remote URL (no credentials in it yet).
function buildRemoteUrl({ tfsUrl, collection, project, repo }) {
  let base = (tfsUrl || '').replace(/\/+$/, '');
  base = base.replace(/\/tfs$/i, '') + '/tfs'; // normalize trailing /tfs once
  const col = encodeURIComponent(collection || 'DefaultCollection');
  const proj = project ? `/${encodeURIComponent(project)}` : '';
  const repoEnc = encodeURIComponent(repo);
  return `${base}/${col}${proj}/_git/${repoEnc}`;
}

// Embeds username/password into an https:// URL so `git` authenticates
// the same way a Basic-auth prompt at the command line would.
function withCreds(url, username, password) {
  const m = url.match(/^(https?:\/\/)(.*)$/i);
  if (!m) return url;
  const user = encodeURIComponent(username || 'pat');
  const pass = encodeURIComponent(password || '');
  return `${m[1]}${user}:${pass}@${m[2]}`;
}

function safeName(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// ─────────────────────────────────────────────────────────────────────────
// route: POST /api/tfs-test — quick auth/connectivity check (git ls-remote)
// ─────────────────────────────────────────────────────────────────────────
async function handleTest(body, res) {
  const { tfsUrl, collection, project, repo, username, password } = body;
  if (!tfsUrl) return sendJson(res, 200, { ok: false, message: 'tfsUrl is required' });
  if (!repo) return sendJson(res, 200, { ok: false, message: 'repo (repository name) is required to build the git URL' });
  if (!password) return sendJson(res, 200, { ok: false, message: 'password/PAT is required' });

  const remote = withCreds(buildRemoteUrl({ tfsUrl, collection, project, repo }), username, password);
  try {
    const out = await run(['ls-remote', remote], undefined, 15000);
    const refCount = out.split('\n').filter(Boolean).length;
    return sendJson(res, 200, { ok: true, message: `Connected — found ${refCount} ref(s) on the remote` });
  } catch (err) {
    return sendJson(res, 200, { ok: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// route: POST /api/tfs-checkin — the real pipeline (git clone/add/commit/push)
// ─────────────────────────────────────────────────────────────────────────
async function handleCheckin(body, res) {
  const {
    zipBase64, zipName, repo, branch, feature, workItem, author, message,
    tfsUrl, clonePath, targetDir, collection, project, username, password
  } = body;

  if (!zipBase64) return sendJson(res, 200, { ok: false, message: 'No zip data received' });
  if (!repo) return sendJson(res, 200, { ok: false, message: 'repo is required' });
  if (!branch) return sendJson(res, 200, { ok: false, message: 'branch is required' });
  if (!password) return sendJson(res, 200, { ok: false, message: 'password/PAT is required' });

  const plainRemote = buildRemoteUrl({ tfsUrl, collection, project, repo });
  const remote = withCreds(plainRemote, username, password);

  const workDir = clonePath && path.isAbsolute(clonePath)
    ? clonePath
    : path.join(os.tmpdir(), 'tfs-ci', safeName(repo));

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-ci-zip-'));
  const zipPath = path.join(tmpRoot, zipName || 'package.zip');
  const extractDir = path.join(tmpRoot, 'extracted');

  const log = [];
  const step = (s) => log.push(s);

  try {
    // 1. Decode & extract the uploaded zip
    step('Decoding uploaded zip...');
    fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));
    step('Extracting zip (Expand-Archive / unzip)...');
    await extractZip(zipPath, extractDir);

    // 2. Ensure we have a local clone pointed at the (nginx-proxied) remote
    fs.mkdirSync(path.dirname(workDir), { recursive: true });
    if (fs.existsSync(path.join(workDir, '.git'))) {
      step(`Reusing existing clone at ${workDir}`);
      await run(['remote', 'set-url', 'origin', remote], workDir);
      await run(['fetch', 'origin'], workDir);
    } else {
      step(`git clone ${plainRemote} -> ${workDir}`);
      try {
        await run(['clone', remote, workDir], undefined, 120000);
      } catch (e) {
        // Repo might be empty / brand new on the server — init locally instead
        step('clone failed (likely an empty new repo) — falling back to git init');
        fs.mkdirSync(workDir, { recursive: true });
        await run(['init'], workDir);
        await run(['remote', 'add', 'origin', remote], workDir);
        await run(['fetch', 'origin'], workDir).catch(() => {});
      }
    }

    // 3. Checkout (or create) the target branch
    step(`Checking out branch "${branch}"`);
    try {
      await run(['checkout', branch], workDir);
      await run(['reset', '--hard', `origin/${branch}`], workDir).catch(() => {});
    } catch (e) {
      try {
        await run(['checkout', '-b', branch, `origin/${branch}`], workDir);
      } catch (e2) {
        await run(['checkout', '-b', branch], workDir);
      }
    }

    // 4. Copy extracted files into the working copy (optionally under targetDir)
    const dest = targetDir ? path.join(workDir, targetDir) : workDir;
    fs.mkdirSync(dest, { recursive: true });
    step(`Copying extracted files into ${dest}`);
    fs.cpSync(extractDir, dest, { recursive: true, force: true });

    // 5. Stage, commit, push
    await run(['add', '-A'], workDir);
    const statusOut = await run(['status', '--porcelain'], workDir);
    if (!statusOut.trim()) {
      return sendJson(res, 200, { ok: false, message: 'Nothing to commit — no file changes detected after copying the zip', log });
    }

    step('Committing...');
    const commitMsg = message || `[${workItem || feature || 'CI'}] Automated check-in for ${feature || repo}`;
    const commitArgs = ['commit', '-m', commitMsg];
    if (author) commitArgs.push('--author', `${author} <${safeName(author).toLowerCase()}@local>`);
    await run(commitArgs, workDir);

    step(`Pushing to origin/${branch}...`);
    await run(['push', 'origin', `HEAD:${branch}`], workDir, 120000);

    const shortHash = await run(['rev-parse', '--short', 'HEAD'], workDir);
    const filesChanged = statusOut.split('\n').filter(Boolean).length;

    return sendJson(res, 200, {
      ok: true,
      commit: shortHash,
      branch,
      filesChanged,
      message: `Checked in as commit ${shortHash}`,
      buildTriggered: false,
      log
    });
  } catch (err) {
    return sendJson(res, 200, { ok: false, message: err.message, log });
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// server
// ─────────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }
  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, git: GIT, platform: process.platform });
  }
  if (req.method === 'POST' && req.url === '/api/tfs-test') {
    try {
      const body = await readJsonBody(req, 1 * 1024 * 1024);
      return handleTest(body, res);
    } catch (e) {
      return sendJson(res, 400, { ok: false, message: e.message });
    }
  }
  if (req.method === 'POST' && req.url === '/api/tfs-checkin') {
    try {
      const body = await readJsonBody(req, 300 * 1024 * 1024); // allow up to ~300MB zip (base64-inflated)
      return handleCheckin(body, res);
    } catch (e) {
      return sendJson(res, 400, { ok: false, message: e.message });
    }
  }
  sendJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`TFS check-in backend (zero-dependency) listening on http://0.0.0.0:${PORT}`);
  console.log(`Using git executable: ${GIT}`);
  console.log(`Platform: ${process.platform}`);
});
