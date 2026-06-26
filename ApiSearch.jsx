// ═══════════════════════════════════════════════════════════════
//  CERTIFICATE DEPLOY ROUTE
//  Add this block into your existing server.js (before app.listen)
//
//  POST /deploy
//  Body: multipart/form-data
//    - certificate  : file
//    - environment  : "UAT" | "SIT"
//    - certPath     : "RSAkeystore" | "Endpoint"
// ═══════════════════════════════════════════════════════════════

const CERT_SAVE_DIR = "/tmp/cert_uploads";

const ENV_RANGES = {
  UAT: ["10.177.44.60","10.177.44.61","10.177.44.62","10.177.44.63",
        "10.177.44.64","10.177.44.65","10.177.44.66","10.177.44.67"],
  SIT: ["10.177.44.34","10.177.44.35","10.177.44.36","10.177.44.37",
        "10.177.44.38","10.177.44.39","10.177.44.40","10.177.44.41"],
};

const CERT_PATHS = {
  RSAkeystore: "/opt/IBM/RSAkeystore",
  Endpoint:    "/opt/IBM/EndPoint_Public",
};

const CERT_SSH_KEY  = "/home/eisuser/.ssh/id_rsa";
const CERT_SCP_USER = "eisuser";

// Ensure local temp dir exists
if (!fs.existsSync(CERT_SAVE_DIR)) {
  fs.mkdirSync(CERT_SAVE_DIR, { recursive: true });
}

// ── Helper: run ssh command on remote host ────────────────────────────────────
function sshExec(ip, command) {
  return new Promise((resolve, reject) => {
    execFile("ssh", [
      "-i", CERT_SSH_KEY,
      "-o", "StrictHostKeyChecking=no",
      "-o", "ConnectTimeout=10",
      `${CERT_SCP_USER}@${ip}`,
      command
    ], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
}

// ── Helper: scp file to remote host ──────────────────────────────────────────
function scpFile(localPath, ip, remotePath) {
  return new Promise((resolve, reject) => {
    execFile("scp", [
      "-i", CERT_SSH_KEY,
      "-o", "StrictHostKeyChecking=no",
      "-o", "ConnectTimeout=10",
      localPath,
      `${CERT_SCP_USER}@${ip}:${remotePath}`
    ], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve();
    });
  });
}

// ── Helper: deploy cert to ONE server ────────────────────────────────────────
async function deployToServer(ip, localFilePath, fileName, remoteDirPath) {
  const remoteFilePath = `${remoteDirPath}/${fileName}`;
  const result = { ip, status: "pending", backup: null, error: null };

  try {
    // Step 1: Check if file already exists on remote
    const checkCmd = `[ -f "${remoteFilePath}" ] && echo "EXISTS" || echo "NOT_FOUND"`;
    const checkResult = await sshExec(ip, checkCmd);

    // Step 2: If exists, take backup with timestamp
    if (checkResult === "EXISTS") {
      const timestamp = new Date().toISOString()
        .replace(/[-:T]/g, "")
        .split(".")[0]; // e.g. 20260617143022
      const backupPath = `${remoteFilePath}_${timestamp}.bak`;
      await sshExec(ip, `cp "${remoteFilePath}" "${backupPath}"`);
      result.backup = backupPath;
      console.log(`[deploy] ${ip} — backup created: ${backupPath}`);
    }

    // Step 3: SCP new cert to remote dir
    await scpFile(localFilePath, ip, remoteFilePath);
    result.status = "success";
    console.log(`[deploy] ${ip} — cert deployed to ${remoteFilePath}`);

  } catch (err) {
    result.status = "failed";
    result.error  = err;
    console.error(`[deploy] ${ip} — FAILED: ${err}`);
  }

  return result;
}

// ── POST /deploy ──────────────────────────────────────────────────────────────
app.post("/deploy", (req, res) => {
  const contentType = req.headers["content-type"] || "";
  const boundary = contentType.split("boundary=")[1];

  if (!boundary) {
    return res.status(400).json({ error: "No boundary in content-type" });
  }

  let body = Buffer.alloc(0);
  req.on("data", chunk => { body = Buffer.concat([body, chunk]); });

  req.on("end", async () => {
    try {
      const bodyStr = body.toString("binary");

      // ── Parse file ──
      const nameMatch = bodyStr.match(/filename="(.+?)"/);
      if (!nameMatch) return res.status(400).json({ error: "No file in upload" });
      const fileName = nameMatch[1];

      const headerEnd   = bodyStr.indexOf("\r\n\r\n", bodyStr.indexOf("filename=")) + 4;
      const footerStart = bodyStr.lastIndexOf(`\r\n--${boundary}`);
      const fileBuffer  = body.slice(headerEnd, footerStart);

      // ── Parse environment field ──
      const envMatch = bodyStr.match(/name="environment"\r\n\r\n(.+?)\r\n--/);
      const environment = envMatch ? envMatch[1].trim() : null;
      if (!environment || !ENV_RANGES[environment]) {
        return res.status(400).json({ error: "Invalid environment. Use UAT or SIT." });
      }

      // ── Parse certPath field ──
      const pathMatch = bodyStr.match(/name="certPath"\r\n\r\n(.+?)\r\n--/);
      const certPath = pathMatch ? pathMatch[1].trim() : null;
      if (!certPath || !CERT_PATHS[certPath]) {
        return res.status(400).json({ error: "Invalid certPath. Use RSAkeystore or Endpoint." });
      }

      const remoteDirPath = CERT_PATHS[certPath];
      const ipList        = ENV_RANGES[environment];
      const localFilePath = `${CERT_SAVE_DIR}/${fileName}`;

      // ── Save file locally ──
      fs.writeFileSync(localFilePath, fileBuffer);
      console.log(`[deploy] Saved locally: ${localFilePath}`);
      console.log(`[deploy] Environment: ${environment} → ${ipList.length} servers`);
      console.log(`[deploy] Target path: ${remoteDirPath}`);

      // ── Deploy to all IPs in parallel ──
      const results = await Promise.all(
        ipList.map(ip => deployToServer(ip, localFilePath, fileName, remoteDirPath))
      );

      // ── Cleanup local temp file ──
      fs.unlink(localFilePath, () => {});

      // ── Summary ──
      const summary = {
        total:   results.length,
        success: results.filter(r => r.status === "success").length,
        failed:  results.filter(r => r.status === "failed").length,
      };

      console.log(`[deploy] Done — ${summary.success}/${summary.total} succeeded`);

      res.json({
        success: summary.failed === 0,
        environment,
        certPath: remoteDirPath,
        fileName,
        summary,
        results,
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});
