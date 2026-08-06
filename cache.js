// ─────────────────────────────────────────────────────────────────────────
// route: POST /api/tfs-whoami — resolves the real name behind either a PAT
// or a username+password (whichever authMode the frontend is using).
// The frontend calls this BEFORE check-in so the user sees exactly whose
// name will appear on the commit. check-in itself re-resolves independently
// (never trusts a name sent from the browser), so this is a preview, not
// the source of truth.
// ─────────────────────────────────────────────────────────────────────────
async function handleWhoami(body, res) {
  const { tfsUrl, collection, project, repo, authMode, username, password, directUrl } = body;
  const mode = ['pat', 'winauth'].includes(authMode) ? authMode : 'basic';
  
  // FIX: Accept either tfsUrl OR directUrl
  if (mode === 'winauth') {
    if (!directUrl) return sendJson(res, 200, { ok: false, message: 'A direct (non-proxied) TFS URL is required for Windows Login verification' });
  } else {
    // Check if either tfsUrl or directUrl is provided
    if (!tfsUrl && !directUrl) {
      return sendJson(res, 200, { ok: false, message: 'Either tfsUrl or directUrl is required to verify identity' });
    }
    if (mode === 'basic' && !username) {
      return sendJson(res, 200, { ok: false, message: 'TFS username is required to verify identity' });
    }
    if (!password) {
      return sendJson(res, 200, { ok: false, message: mode === 'basic' ? 'Password is required to verify identity' : 'PAT is required to verify identity' });
    }
  }
  
  try {
    // Use directUrl if provided, otherwise use tfsUrl
    const effectiveTfsUrl = directUrl || tfsUrl;
    const identity = await resolveIdentity({ 
      tfsUrl: effectiveTfsUrl, 
      collection, 
      project, 
      repo, 
      authMode: mode, 
      username, 
      password, 
      directUrl 
    });
    return sendJson(res, 200, { 
      ok: true, 
      name: identity.name, 
      verifiedVia: identity.verifiedVia, 
      isOpaqueId: !!identity.isOpaqueId 
    });
  } catch (err) {
    return sendJson(res, 200, { ok: false, message: err.message });
  }
}










async function resolveIdentity({ tfsUrl, collection, project, repo, authMode, username, password, directUrl }) {
  if (authMode === 'winauth') {
    return resolveIdentityWindows({ directUrl, collection });
  }
  const mode = authMode === 'pat' ? 'pat' : 'basic';
  const errors = [];

  // Use directUrl if provided, otherwise use tfsUrl
  const effectiveTfsUrl = directUrl || tfsUrl;

  // Tier 1: REST API
  try {
    let authHeader;
    if (mode === 'pat') {
      if (!password) throw new Error('A Personal Access Token (PAT) is required to verify identity');
      authHeader = 'Basic ' + Buffer.from(`:${password}`).toString('base64');
    } else {
      if (!username) throw new Error('TFS username is required to verify identity');
      if (!password) throw new Error('Password is required to verify identity');
      authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    }
    // Use effectiveTfsUrl here instead of tfsUrl
    const url = `${buildApiBase({ tfsUrl: effectiveTfsUrl, collection })}/_apis/connectionData?api-version=1.0`;
    const json = await httpGetJson(url, authHeader);
    const user = json && json.authenticatedUser;
    const name = user && (user.providerDisplayName || user.customDisplayName || user.displayName);
    if (!name) throw new Error(`TFS responded but returned no identity for ${mode === 'pat' ? 'this PAT' : 'these credentials'}`);
    return { name, id: (user && user.id) || null, verifiedVia: 'rest' };
  } catch (e1) {
    errors.push(`REST API: ${e1.message}`);
  }

  // Tier 2: git-header extraction (reuses the already-working git connection)
  if (effectiveTfsUrl && repo && password) {
    try {
      const gitUsername = mode === 'basic' ? username : 'pat';
      const remote = withCreds(buildRemoteUrl({ tfsUrl: effectiveTfsUrl, collection, project, repo }), gitUsername, password);
      const identity = await resolveIdentityFromGitHeaders(remote);
      return Object.assign(identity, { verifiedVia: 'git-header' });
    } catch (e2) {
      errors.push(`Git connection header: ${e2.message}`);
    }
  } else {
    errors.push('Git connection header: skipped (need tfsUrl, repo, and password/PAT to open a connection)');
  }

  // Tier 3: authenticated-username stamp — 'basic' mode only
  if (mode === 'basic' && username) {
    return { name: username, id: null, verifiedVia: 'authenticated-username', isOpaqueId: true };
  }

  throw new Error(
    `Could not verify identity through any available method. ${errors.join(' | ')}` +
    (mode === 'pat' ? ' — try Username+Password mode instead, which has an extra fallback (the authenticated username itself).' : '')
  );
}









curl -X POST http://10.177.44.29:4416/api/tfs-whoami \
  -H "Content-Type: application/json" \
  -d '{
    "directUrl": "https://10.177.56.207:443/tfs",
    "collection": "SBIEIS",
    "project": "EISGITREPO",
    "repo": "misc-thirdpartyoauthprovide-sapi",
    "authMode": "pat",
    "username": "pat",
    "password": "yxyfz2aq3b4ahjqceeikzbqpyhbo7wduedjxxil2ano6vd3znxa"
  }'