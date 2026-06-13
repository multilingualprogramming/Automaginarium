import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicRoot = path.join(root, "public");

function contentType(filePath) {
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) return "text/javascript";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".html")) return "text/html";
  return "application/octet-stream";
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.normalize(path.join(publicRoot, relative));
    if (!filePath.startsWith(publicRoot)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const generatedPath = path.join(publicRoot, "generated", "automate_universel", "browser_module.mjs");
assert(fs.existsSync(generatedPath), "generated browser module is missing; run scripts/build_wasm_bundle.py");

const { server, baseUrl } = await startServer();
try {
  const [indexResponse, appResponse, moduleResponse] = await Promise.all([
    fetch(`${baseUrl}/index.html`),
    fetch(`${baseUrl}/app.mjs`),
    fetch(`${baseUrl}/generated/automate_universel/browser_module.mjs`),
  ]);
  assert.equal(indexResponse.status, 200, "index served");
  assert.equal(appResponse.status, 200, "app.mjs served");
  assert.equal(moduleResponse.status, 200, "generated browser module served");

  const appSource = await appResponse.text();
  assert(appSource.includes("./generated/automate_universel/browser_module.mjs"));
  assert(appSource.includes("window.AutomaginariumUniversVivant = await import"));
  assert(appSource.includes("window.AutomaginariumCore.construireUniversVivant(state.config)"));

  const moduleSource = await moduleResponse.text();
  assert(moduleSource.includes("export {"));
  assert(moduleSource.includes("construire_univers_vivant"));
  assert(moduleSource.includes("generer_univers_detaille"));
} finally {
  server.close();
}

console.log("browser generated flow smoke ok");
