/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const next = require("next");

// Azure sets PORT automatically; fallback to 3000 locally
const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: "." });
const handle = app.getRequestHandler();

console.log("Preparing Next.js app...");

app
  .prepare()
  .then(() => {
    console.log("Next.js app prepared. Starting server...");

    createServer((req, res) => handle(req, res)).listen(port, (err) => {
      if (err) {
        console.error("Server error:", err);
        throw err;
      }
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to prepare app:", err);
  });
