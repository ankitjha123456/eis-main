<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>EIS DevSuite — IBM ACE Toolkit | by ANKIT</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js"></script>
<link rel="stylesheet" href="css/style.css"/>
</head>
<body>

<!-- ══ LOGIN SCREEN ══ -->
<div id="login-screen">
  <div class="login-card">
    <div class="login-logo">
      <div class="t-gem">⬡</div>
      <div class="ll-txt">EIS DevSuite</div>
    </div>
    <div class="login-tag">IBM ACE Developer Toolkit · built by <b>ANKIT</b> for the EIS Team</div>
    <div class="login-err" id="login-err">Invalid username or password. Please try again.</div>
    <div class="login-fg">
      <div class="login-fl">Username</div>
      <input class="login-fi" id="login-user" placeholder="Enter your username" autocomplete="username"/>
    </div>
    <div class="login-fg">
      <div class="login-fl">Password</div>
      <input class="login-fi" id="login-pass" type="password" placeholder="Enter your password" autocomplete="current-password"/>
    </div>
    <button class="login-btn" onclick="doLogin()"><i class="fa-solid fa-right-to-bracket"></i> Sign In</button>
    <div class="login-hint">
      <b>Demo credentials</b><br>
      Username: <b>ankit.eis</b><br>
      Password: <b>EIS@Ankit2026</b>
    </div>
    <div class="login-foot">Developed by <b>ANKIT</b> · EIS Team internal tool</div>
  </div>
</div>

<!-- ══ APP SHELL ══ -->
<div id="app" style="display:none">

  <!-- TOPBAR -->
  <div class="topbar">
    <a class="t-logo" href="#" onclick="goHome();return false">
      <div class="t-gem">⬡</div>
      EIS DevSuite
    </a>
    <div class="t-sep"></div>
    <div class="t-bread" id="bread"><span>Dashboard</span></div>
    <div class="t-space"></div>
    <span style="font-size:10.5px;color:var(--t3);font-family:var(--fm);margin-right:12px;white-space:nowrap">EIS Team · built by <b style="color:var(--sky)">ANKIT</b></span>
    <button class="btn-back" id="bb" onclick="goHome()">
      <i class="fa fa-chevron-left" style="font-size:10px"></i> Back
    </button>
    <div class="t-env"><span class="t-env-dot"></span><span id="env-lbl">IBM ACE Server</span></div>
    <button class="btn-back" style="margin-left:8px" onclick="doLogout()" title="Sign out">
      <i class="fa-solid fa-right-from-bracket" style="font-size:10px"></i> Logout
    </button>
  </div>

  <div class="content">
    
    <!-- ══ HOME PAGE ══ -->
    <div class="page on" id="ph">
      <div class="h-eye">EIS TEAM · IBM ACE DEVELOPER TOOLKIT</div>
      <div class="h-title">Developer Operations<br>Command Center</div>
      <div class="h-sub">Four integrated tools. Zero context switching.<br><b>DB Query · API Client · Swagger Validator · TFS CI/CD</b></div>
      <div style="text-align:center;margin-top:-6px;margin-bottom:18px;font-size:11px;color:var(--t3);font-family:var(--fm)">Designed &amp; developed by <b style="color:var(--sky)">ANKIT</b> for the <b style="color:var(--purple)">EIS Team</b></div>
      <div class="cards">
        <div class="mcard c-db" onclick="openPage('db')">
          <span class="c-arrow"><i class="fa fa-arrow-up-right-from-square"></i></span>
          <div class="ring rt"><i class="fa-solid fa-database" style="color:var(--teal)"></i></div>
          <div class="c-name">DB Query</div>
          <div class="c-desc">Execute queries on IBM ACE database with live field builder, schema explorer and result export.</div>
          <span class="c-badge bt">ACE Database</span>
        </div>
        <div class="mcard c-req" onclick="openPage('req')">
          <span class="c-arrow"><i class="fa fa-arrow-up-right-from-square"></i></span>
          <div class="ring ro"><i class="fa-solid fa-bolt" style="color:var(--coral)"></i></div>
          <div class="c-name">Request Hit</div>
          <div class="c-desc">Full-featured API client routed via SSH tunnel — params, headers, auth, body, history and collections.</div>
          <span class="c-badge bo">API Client</span>
        </div>
        <div class="mcard c-sw" onclick="openPage('sw')">
          <span class="c-arrow"><i class="fa fa-arrow-up-right-from-square"></i></span>
          <div class="ring rp"><i class="fa-solid fa-file-shield" style="color:var(--purple)"></i></div>
          <div class="c-name">Swagger Validation</div>
          <div class="c-desc">Upload XSD/XML and YAML/JSON — auto cross-validate fields and generate a corrected OpenAPI spec.</div>
          <span class="c-badge bp">Schema Validator</span>
        </div>
        <div class="mcard c-ci" onclick="openPage('ci')">
          <span class="c-arrow"><i class="fa fa-arrow-up-right-from-square"></i></span>
          <div class="ring rs"><i class="fa-solid fa-code-branch" style="color:var(--sky)"></i></div>
          <div class="c-name">TFS Check-In</div>
          <div class="c-desc">Upload API zip, set feature/branch details and auto check-in to TFS via CI/CD pipeline with commit message.</div>
          <span class="c-badge bs">CI/CD · TFS</span>
        </div>
      </div>
    </div>

    <!-- ══ DB QUERY PAGE ══ -->
    <div class="page" id="pdb">
      <div class="ws">
        <div class="wsb">
          <div style="padding:10px 12px;border-bottom:1px solid var(--b1)">
            <div class="conn"><span class="cdot"></span>ACE DB Connected</div>
          </div>
          <div class="sb-lbl">Quick Fill</div>
          <div class="sb-it on" onclick="dbQuickFill(this,'fetch')" data-f='{"FETCH_FLAG":"Y"}'><i class="fa-solid fa-filter"></i>Fetch Flag</div>
          <div class="sb-it" onclick="dbQuickFill(this,'cache')" data-f='{"CACHE":"1800","FIELD_NAME":"EIS_CONFIG"}'><i class="fa-solid fa-layer-group"></i>Cache Config</div>
          <div class="sb-it" onclick="dbQuickFill(this,'sys')" data-f='{"SYS_SERVICE":"ACCOUNT","SYS_URL":"http://sys.internal/api"}'><i class="fa-solid fa-server"></i>SYS Service</div>
          <div class="sb-it" onclick="dbQuickFill(this,'tp')" data-f='{"THIRD_PARTY_URL":"https://eis.dmz/partner","HTTPTimeOut":"30000"}'><i class="fa-solid fa-network-wired"></i>Third Party</div>
          <div class="sb-it" onclick="dbQuickFill(this,'cc')" data-f='{"CONTENT_CHECK":"Y","SOURCE_CONFIG":"PROD"}'><i class="fa-solid fa-shield-halved"></i>Content Check</div>
          <div class="sb-lbl">Server</div>
          <div class="sb-it" style="cursor:default"><i class="fa-solid fa-circle-dot" style="color:var(--green)"></i><span style="font-family:var(--fm);font-size:10px">10.177.44.29:4415</span></div>
        </div>
        <div class="wbm">
          <div class="wtb">
            <i class="fa-solid fa-database" style="color:var(--teal);font-size:14px"></i>
            <span style="font-family:var(--fd);font-size:13px;font-weight:600">IBM ACE SQL Query Generator</span>
            <div class="t-space"></div>
            <button class="btn btn-g btn-sm" onclick="dbReset()"><i class="fa-solid fa-rotate-left"></i> Reset</button>
            <button class="btn btn-t" id="db-btn" onclick="dbSubmit()"><i class="fa-solid fa-play"></i> Generate Query</button>
          </div>
          <div class="wbd" style="padding:16px;display:flex;flex-direction:column;gap:14px">
            <div class="panel">
              <div class="pt"><i class="fa-solid fa-plug" style="color:var(--teal)"></i>ACE Server Endpoint</div>
              <div class="r2">
                <div class="fg" style="margin-bottom:0">
                  <div class="fl"><i class="fa-solid fa-globe"></i>API URL</div>
                  <input class="fi" id="ace-url" value="http://10.177.44.29:4415/api/depositAccShort/details/accounts"/>
                </div>
                <div class="fg" style="margin-bottom:0">
                  <div class="fl"><i class="fa-solid fa-arrow-left"></i>Back Link URL</div>
                  <input class="fi" id="ace-back" value="http://10.177.44.29:4415/REPO"/>
                </div>
              </div>
            </div>
            <div class="panel">
              <div class="pt"><i class="fa-solid fa-table-columns" style="color:var(--teal)"></i>Query Parameters</div>
              <div class="ace-grid">
                <div class="fg"><div class="fl"><i class="fa-solid fa-filter"></i>Fetch Flag</div><input class="fi" id="FETCH_FLAG" placeholder="e.g. Y"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-layer-group"></i>Cache For</div><input class="fi" id="CACHE" placeholder="e.g. 1800"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-table-columns"></i>Field Name</div><input class="fi" id="FIELD_NAME" placeholder="e.g. EIS_CONFIG"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-globe"></i>EIS DMZ URL</div><input class="fi" id="EIS_DMZ_URL" placeholder="https://eis.dmz.internal/api"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-server"></i>SYS Service</div><input class="fi" id="SYS_SERVICE" placeholder="e.g. ACCOUNT_SERVICE"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-link"></i>SYS URL</div><input class="fi" id="SYS_URL" placeholder="http://sys.internal/api"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-clock"></i>HTTP Timeout</div><input class="fi" id="HTTPTimeOut" placeholder="e.g. 30000"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-shield-halved"></i>Content Check</div><input class="fi" id="CONTENT_CHECK" placeholder="Y or N"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-gears"></i>Source Config</div><input class="fi" id="SOURCE_CONFIG" placeholder="e.g. PROD"/></div>
                <div class="fg"><div class="fl"><i class="fa-solid fa-network-wired"></i>Third Party URL</div><input class="fi" id="THIRD_PARTY_URL" placeholder="https://partner.api/endpoint"/></div>
                <div class="fg ace-full"><div class="fl"><i class="fa-solid fa-hashtag"></i>Request Reference Number</div><input class="fi" id="REQUEST_REFERENCE_NUMBER" placeholder="e.g. REF-2024-001"/></div>
              </div>
            </div>
            <div class="panel">
              <div class="pt" style="display:flex;align-items:center">
                <i class="fa-solid fa-file-code" style="color:var(--teal)"></i>Generated SQL Queries
                <div class="t-space"></div>
                <span id="db-meta" style="font-size:10.5px;color:var(--t3);font-family:var(--fm);font-weight:400"></span>
              </div>
              <div class="api-pgwrap" id="db-pgwrap">
                <div class="api-pglabel"><span id="db-pglabel-txt">Connecting…</span><span id="db-pgpct">0%</span></div>
                <div class="api-pgtrack"><div class="api-pgfill" id="db-pgfill"></div></div>
              </div>
              <div id="db-out">
                <div style="color:var(--t3);text-align:center;padding:28px;font-size:12px">
                  <i class="fa-solid fa-code" style="font-size:26px;display:block;margin-bottom:8px;opacity:.28"></i>
                  Fill in the fields above and click <strong style="color:var(--teal)">Generate Query</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ REQUEST HIT PAGE ══ -->
    <div class="page" id="preq">
      <!-- Content trimmed for brevity - full content in original -->
      <div class="ws">
        <!-- Sidebar -->
        <div class="wsb">
          <div style="padding:9px">
            <button class="btn btn-o" style="width:100%;justify-content:center;font-size:12px" onclick="newReq()">
              <i class="fa-solid fa-plus"></i> New Request
            </button>
          </div>
          <div style="padding:0 9px 7px">
            <input class="fi" style="font-size:11px;padding:5px 8px" placeholder="Search requests…" oninput="filterReqs(this.value)"/>
          </div>
          <div id="req-colls">
            <div class="cg">
              <div class="ct op" onclick="toggleColl(this)">
                <span class="ar">▶</span><i class="fa-regular fa-folder-open" style="font-size:11px"></i>ACE Server APIs
              </div>
              <div class="ci-list">
                <div class="ci on" onclick="loadReq('get-health',this)"><span class="mt mg">GET</span><span class="rn">Health Check</span></div>
                <div class="ci" onclick="loadReq('get-users',this)"><span class="mt mg">GET</span><span class="rn">Get All Users</span></div>
                <div class="ci" onclick="loadReq('post-user',this)"><span class="mt mp">POST</span><span class="rn">Create User</span></div>
                <div class="ci" onclick="loadReq('put-user',this)"><span class="mt mu">PUT</span><span class="rn">Update User</span></div>
                <div class="ci" onclick="loadReq('del-user',this)"><span class="mt md">DEL</span><span class="rn">Delete User</span></div>
                <div class="ci" onclick="loadReq('post-ace',this)"><span class="mt mp">POST</span><span class="rn">ACE Deposit Query</span></div>
                <div class="ci" onclick="loadReq('get-orders',this)"><span class="mt mg">GET</span><span class="rn">Get Orders</span></div>
              </div>
            </div>
            <div class="cg">
              <div class="ct" onclick="toggleColl(this)">
                <span class="ar">▶</span><i class="fa-regular fa-folder" style="font-size:11px"></i>Auth APIs
              </div>
              <div class="ci-list">
                <div class="ci" onclick="loadReq('post-login',this)"><span class="mt mp">POST</span><span class="rn">Login</span></div>
                <div class="ci" onclick="loadReq('post-refresh',this)"><span class="mt mp">POST</span><span class="rn">Refresh Token</span></div>
              </div>
            </div>
            <div class="cg" id="saved-coll-wrap" style="display:none">
              <div class="ct op" onclick="toggleColl(this)">
                <span class="ar">▶</span><i class="fa-solid fa-bookmark" style="font-size:11px;color:var(--coral)"></i>Saved Requests
              </div>
              <div class="ci-list" id="saved-coll-list"></div>
            </div>
          </div>
          <div class="sb-lbl">History <span id="hist-count" style="font-size:9px;color:var(--t3)"></span></div>
          <div id="req-hist"></div>
        </div>
        <!-- Main content -->
        <div class="wbm" style="overflow:hidden">
          <!-- URL BAR -->
          <div class="wtb" style="gap:7px;flex-wrap:nowrap">
            <select class="msel" id="req-method" onchange="styleM()">
              <option>GET</option><option>POST</option><option>PUT</option>
              <option>PATCH</option><option>DELETE</option><option>HEAD</option><option>OPTIONS</option>
            </select>
            <div class="ssh-pill" title="Requests are tunnelled through this SSH server">
              <i class="fa-solid fa-shield-halved"></i>
              <input id="req-sship" value="10.177.44.58" style="background:none;border:none;color:var(--sky);font-family:var(--fm);font-size:11px;width:96px;outline:none" placeholder="SSH IP"/>
            </div>
            <span style="color:var(--t3);font-size:12px;flex-shrink:0">→</span>
            <input class="urli" id="req-url" placeholder="http://10.177.44.xx/api/endpoint" value="http://10.177.44.29:4415/api/health"/>
            <button class="btn btn-g btn-sm" onclick="saveReq()"><i class="fa-regular fa-floppy-disk"></i> Save</button>
            <button class="btn btn-o" id="req-send" onclick="sendReq()">
              <i class="fa-solid fa-paper-plane"></i> Send
            </button>
          </div>
          <!-- Rest of request page content - same as original -->
        </div>
      </div>
    </div>

    <!-- ══ SWAGGER VALIDATION PAGE ══ -->
    <div class="page" id="psw">
      <!-- Full content as in original -->
    </div>

    <!-- ══ TFS CI/CD PAGE ══ -->
    <div class="page" id="pci">
      <!-- Full content as in original -->
    </div>

  </div>
</div>

<div id="toast"><span id="ti"></span><span id="tm"></span></div>

<!-- ══ JAVASCRIPT ══ -->
<script src="js/state.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<script src="js/db.js"></script>
<script src="js/request.js"></script>
<script src="js/swagger.js"></script>
<script src="js/tfs.js"></script>
<script src="js/app.js"></script>
</body>
</html>