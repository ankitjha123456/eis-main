const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Execute curl via shell script
// Body: { method, url, sshIp, body, headers: ["Key: Val", "Key2: Val2"] }
app.post("/execute", (req, res) => {
  const {
    method = "GET",
    url,
    sshIp,
    body = "",
    headers = [],   // array of strings: ["Content-Type: application/json", "Authorization: Bearer x"]
  } = req.body;

  // Validate mandatory fields
  if (!url)    return res.status(400).json({ error: "url is required" });
  if (!sshIp)  return res.status(400).json({ error: "sshIp is required" });

  const scriptPath = path.join(__dirname, "curl.sh");

  // Build args: METHOD URL SSH_IP BODY header1 header2 ...
  const args = [
    scriptPath,
    method.toUpperCase(),
    url,
    sshIp,
    body,
    ...headers.filter(h => h && h.trim()),  // spread each header as separate arg
  ];

  // Spawn: bash curl.sh METHOD URL SSH_IP BODY [header1] [header2] ...
  const proc = spawn("bash", args);

  let output = "";

  proc.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });

  proc.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  proc.on("close", (code) => {
    // Try to parse output as JSON
    try {
      const json = JSON.parse(output.trim());
      return res.json(json);
    } catch {
      // Return raw output if not JSON
      return res.status(200).send(output.trim());
    }
  });

  proc.on("error", (err) => {
    return res.status(500).json({ error: `Failed to run script: ${err.message}` });
  });

  // Kill process if client disconnects
  req.on("close", () => {
    if (!proc.killed) proc.kill();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
