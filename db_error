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

// Execute curl via shell script — returns plain JSON response
app.post("/execute", (req, res) => {
  const { method = "GET", url, sshIp, body, headers = [] } = req.body;

  if (!url)   return res.status(400).json({ error: "url is required" });
  if (!sshIp) return res.status(400).json({ error: "sshIp is required" });

  // Accept body as JSON object OR plain string
  const bodyStr = typeof body === "object" && body !== null
    ? JSON.stringify(body)
    : (body || "");

  const scriptPath = path.join(__dirname, "curl.sh");

  // args: METHOD URL SSH_IP BODY header1 header2 ...
  const args = [
    scriptPath,
    method.toUpperCase(),
    url,
    sshIp,
    bodyStr,
    ...headers.filter(h => h && h.trim()),
  ];

  const proc = spawn("bash", args);

  let output = "";

  proc.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });

  proc.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  proc.on("close", () => {
    const result = output.trim();
    try {
      // Return as JSON if parseable
      return res.json(JSON.parse(result));
    } catch {
      // Otherwise return as plain text
      return res.send(result);
    }
  });

  proc.on("error", (err) => {
    return res.status(500).json({ error: err.message });
  });

  req.on("close", () => { if (!proc.killed) proc.kill(); });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
