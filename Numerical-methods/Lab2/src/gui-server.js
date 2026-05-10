import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const port = Number(process.env.PORT) || 4173;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

function send(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function resolveRequestPath(urlPathname) {
  if (urlPathname === "/") {
    return path.join(projectRoot, "web", "index.html");
  }

  const cleanPath = path.normalize(urlPathname).replace(/^(\.\.[/\\])+/, "");
  return path.join(projectRoot, cleanPath);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const targetPath = resolveRequestPath(url.pathname);

  if (!targetPath.startsWith(projectRoot)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(targetPath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        send(response, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }

      send(response, 500, error.message, "text/plain; charset=utf-8");
      return;
    }

    const extension = path.extname(targetPath);
    send(response, 200, content, mimeTypes[extension] ?? "application/octet-stream");
  });
});

server.on("error", (error) => {
  console.error(`Не удалось запустить GUI-сервер: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`GUI доступен: http://127.0.0.1:${port}`);
});
