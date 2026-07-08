const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const appName = path.basename(appRoot);
const defaultHost = "127.0.0.1";
const defaultPort = 8080;
const heartbeatPath = "/__local_prod_heartbeat";
const heartbeatIntervalMs = 2000;
const shutdownGraceMs = 7000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function parseArgs(argv) {
  const args = {
    host: defaultHost,
    open: true,
    port: defaultPort,
    root: path.dirname(appRoot),
    shutdownOnTabClose: true,
    openPath: `/${appName}/`,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--host" && next) {
      args.host = next;
      index += 1;
    } else if (arg === "--port" && next) {
      args.port = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--root" && next) {
      args.root = path.resolve(next);
      index += 1;
    } else if (arg === "--path" && next) {
      args.openPath = next.startsWith("/") ? next : `/${next}`;
      index += 1;
    } else if (arg === "--no-open") {
      args.open = false;
    } else if (arg === "--shutdown-on-tab-close") {
      args.shutdownOnTabClose = true;
    } else if (arg === "--no-shutdown-on-tab-close") {
      args.shutdownOnTabClose = false;
    }
  }

  if (!args.open && !argv.includes("--shutdown-on-tab-close")) {
    args.shutdownOnTabClose = false;
  }

  if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  return args;
}

function isPortAvailable(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findPort(host, preferredPort) {
  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    if (await isPortAvailable(host, port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${preferredPort} to ${preferredPort + 49}.`);
}

function getRequestPath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const decodedPath = decodeURIComponent(url.pathname);
  return decodedPath.replace(/^\/+/, "");
}

function resolveStaticPath(root, requestUrl) {
  const relativePath = getRequestPath(requestUrl);
  const requestedPath = path.resolve(root, relativePath);
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (requestedPath !== root && !requestedPath.startsWith(rootWithSeparator)) {
    return null;
  }

  return requestedPath;
}

function sendResponse(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": contentType || "text/plain; charset=utf-8",
  });
  response.end(body);
}

function createShutdownTracker(server, enabled) {
  let heartbeatTimer = null;
  let hasSeenBrowser = false;

  function scheduleShutdown() {
    if (!enabled || !hasSeenBrowser) {
      return;
    }

    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      console.log("Browser tab heartbeat stopped. Shutting down local production server.");
      server.close(() => {
        process.exit(0);
      });
    }, shutdownGraceMs);
  }

  return {
    markBrowserAlive() {
      if (!enabled) {
        return;
      }

      hasSeenBrowser = true;
      scheduleShutdown();
    },
    stop() {
      clearTimeout(heartbeatTimer);
    },
  };
}

function getHeartbeatScript() {
  return `<script>
;(() => {
  const heartbeatUrl = "${heartbeatPath}";
  const ping = () => {
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(heartbeatUrl);
        return;
      }
      fetch(heartbeatUrl, { cache: "no-store", keepalive: true, method: "POST" }).catch(() => {});
    } catch (error) {}
  };
  ping();
  setInterval(ping, ${heartbeatIntervalMs});
})();
</script>`;
}

function injectHeartbeatScript(html) {
  const script = getHeartbeatScript();

  if (html.includes(heartbeatPath)) {
    return html;
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

function createServer(root, shutdownTracker) {
  return http.createServer((request, response) => {
    const requestPath = new URL(request.url, "http://localhost").pathname;

    if (requestPath === heartbeatPath) {
      shutdownTracker.markBrowserAlive();
      response.writeHead(204, {
        "Cache-Control": "no-store",
      });
      response.end();
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendResponse(response, 405, "Method Not Allowed");
      return;
    }

    const requestedPath = resolveStaticPath(root, request.url);
    if (!requestedPath) {
      sendResponse(response, 403, "Forbidden");
      return;
    }

    fs.stat(requestedPath, (statError, stats) => {
      if (statError) {
        sendResponse(response, 404, "Not Found");
        return;
      }

      const filePath = stats.isDirectory() ? path.join(requestedPath, "index.html") : requestedPath;
      fs.stat(filePath, (fileStatError, fileStats) => {
        if (fileStatError || !fileStats.isFile()) {
          sendResponse(response, 404, "Not Found");
          return;
        }

        const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
        if (request.method === "HEAD") {
          response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Length": fileStats.size,
            "Content-Type": contentType,
          });
          response.end();
          return;
        }

        if (contentType.startsWith("text/html")) {
          fs.readFile(filePath, "utf8", (readError, contents) => {
            if (readError) {
              sendResponse(response, 500, "Internal Server Error");
              return;
            }

            const body = injectHeartbeatScript(contents);
            response.writeHead(200, {
              "Cache-Control": "no-store",
              "Content-Length": Buffer.byteLength(body),
              "Content-Type": contentType,
            });
            response.end(body);
          });
          return;
        }

        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Length": fileStats.size,
          "Content-Type": contentType,
        });
        fs.createReadStream(filePath).pipe(response);
      });
    });
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else if (platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  const child = childProcess.spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const port = await findPort(args.host, args.port);
  const server = http.createServer();
  const shutdownTracker = createShutdownTracker(server, args.shutdownOnTabClose);
  const staticServer = createServer(root, shutdownTracker);
  const url = `http://${args.host}:${port}${args.openPath}`;

  server.on("request", (request, response) => {
    staticServer.emit("request", request, response);
  });
  server.on("close", () => shutdownTracker.stop());
  server.listen(port, args.host, () => {
    console.log(`Serving ${root}`);
    console.log(`Production URL: ${url}`);
    if (args.shutdownOnTabClose) {
      console.log("Server will stop after the browser tab is closed.");
    }
    console.log("Press Ctrl+C to stop.");

    if (args.open) {
      openBrowser(url);
    }
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
