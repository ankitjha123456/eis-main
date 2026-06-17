const http = require("http");
const fs = require("fs");

const PORT = 4418;
const SAVE_DIR = "/tmp/cert_uploads"; // folder on .58 where file will be saved

// Ensure save directory exists
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.end();

  if (req.method === "POST" && req.url === "/upload") {
    const contentType = req.headers["content-type"] || "";
    const boundary = contentType.split("boundary=")[1];

    if (!boundary) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "No boundary found in content-type" }));
    }

    let body = Buffer.alloc(0);

    req.on("data", chunk => {
      body = Buffer.concat([body, chunk]);
    });

    req.on("end", () => {
      try {
        const bodyStr = body.toString("binary");
        const nameMatch = bodyStr.match(/filename="(.+?)"/);

        if (!nameMatch) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "No file found in upload" }));
        }

        const fileName = nameMatch[1];

        const headerEnd = bodyStr.indexOf("\r\n\r\n", bodyStr.indexOf("filename=")) + 4;
        const footerStart = bodyStr.lastIndexOf(`\r\n--${boundary}`);

        const fileBuffer = body.slice(headerEnd, footerStart);

        const savePath = `${SAVE_DIR}/${fileName}`;

        fs.writeFile(savePath, fileBuffer, (err) => {
          if (err) {
            res.writeHead(500);
            return res.end(JSON.stringify({ error: "Failed to save file: " + err.message }));
          }

          console.log(`Saved: ${savePath} (${fileBuffer.length} bytes)`);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            message: `File saved on .58 at ${savePath}`,
            size: fileBuffer.length
          }));
        });
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Parse error: " + err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }

}).listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
  console.log(`Files will be saved to: ${SAVE_DIR}`);
});
