import { app, BrowserWindow } from "electron";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false },
  });

 if (isDev) {
    // dev: frontend served via vite + express
    win.loadURL("http://localhost:3001");
  } else {
    // prod: load built frontend from dist
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  serverProcess = spawn("node", [path.join(__dirname, "server.js")], {
    stdio: "inherit",
  });
  createWindow();
});

app.on("will-quit", () => {
  if (serverProcess) serverProcess.kill();
});
