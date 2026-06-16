const http = require("http");
const fs = require("fs");
const { execFile } = require("child_process");

const PORT = 5000;
const SFTP_USER = "eisuser";
const SFTP_HOST = "TARGET_SERVER_IP";   // ← change
const SSH_KEY   = "/home/eisuser/.ssh/id_rsa";
const REMOTE_DIR = "/tmp/";

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.end();

  if (req.method === "POST" && req.url === "/upload") {
    const boundary = req.headers["content-type"].split("boundary=")[1];
    let body = Buffer.alloc(0);

    req.on("data", chunk => body = Buffer.concat([body, chunk]));

    req.on("end", () => {
      // Extract filename
      const nameMatch = body.toString().match(/filename="(.+?)"/);
      const fileName = nameMatch ? nameMatch[1] : "cert.crt";

      // Extract file bytes
      const start = body.indexOf("\r\n\r\n", body.indexOf("filename=")) + 4;
      const end   = body.lastIndexOf(`\r\n--${boundary}`);
      const fileBuffer = body.slice(start, end);

      // Save to local /tmp first
      const localPath  = `/tmp/${fileName}`;
      const remotePath = `${SFTP_USER}@${SFTP_HOST}:${REMOTE_DIR}`;

      fs.writeFile(localPath, fileBuffer, (err) => {
        if (err) {
          res.writeHead(500);
          return res.end(JSON.stringify({ error: "Failed to save file locally" }));
        }

        // SCP to remote server
        execFile("scp", [
          "-i", SSH_KEY,
          "-o", "StrictHostKeyChecking=no",
          localPath,
          remotePath
        ], (err, stdout, stderr) => {
          fs.unlinkSync(localPath); // cleanup local

          if (err) {
            res.writeHead(500);
            return res.end(JSON.stringify({ error: stderr || err.message }));
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            message: `${fileName} sent to ${SFTP_HOST}:${REMOTE_DIR}`
          }));
        });
      });
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }

}).listen(PORT, () => console.log(`✅ Running on port ${PORT}`));