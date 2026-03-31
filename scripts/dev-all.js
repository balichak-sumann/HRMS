import { exec, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SERVER_DIR = path.join(ROOT_DIR, "server");
const IS_WIN = process.platform === "win32";
const NPM_CMD = "npm";
const execAsync = promisify(exec);

async function getPidsOnPort(port) {
  if (IS_WIN) {
    try {
      const { stdout } = await execAsync(`netstat -ano -p tcp | findstr :${port}`);
      return Array.from(
        new Set(
          stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.includes("LISTENING") && line.includes(`:${port}`))
            .map((line) => line.split(/\s+/).at(-1))
            .filter((pid) => pid && /^\d+$/.test(pid)),
        ),
      );
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execAsync(`lsof -ti tcp:${port} -sTCP:LISTEN`);
    return Array.from(
      new Set(
        stdout
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter((value) => /^\d+$/.test(value)),
      ),
    );
  } catch {
    return [];
  }
}

async function killPid(pid) {
  try {
    if (IS_WIN) {
      await execAsync(`taskkill /PID ${pid} /F`);
      return;
    }
    process.kill(Number(pid), "SIGTERM");
  } catch {
    // Ignore dead or inaccessible processes.
  }
}

async function freePort(port, label) {
  const pids = await getPidsOnPort(port);

  if (pids.length === 0) {
    console.log(`Port ${port} is free for ${label}.`);
    return;
  }

  console.log(`Port ${port} in use by PID(s): ${pids.join(", ")}. Terminating...`);
  for (const pid of pids) {
    await killPid(pid);
  }

  const remainingPids = await getPidsOnPort(port);
  if (remainingPids.length > 0) {
    throw new Error(`Unable to free port ${port}. Still in use by PID(s): ${remainingPids.join(", ")}`);
  }

  console.log(`Port ${port} is now free for ${label}.`);
}

function runCommand(args, cwd, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(NPM_CMD, args, {
      cwd,
      stdio: "inherit",
      shell: IS_WIN,
    });

    child.on("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

function startLongRunningCommand(args, cwd) {
  return spawn(NPM_CMD, args, {
    cwd,
    stdio: "inherit",
    shell: IS_WIN,
  });
}

async function main() {
  const backendPort = Number(process.env.BACKEND_PORT || 5001);
  const frontendPort = Number(process.env.FRONTEND_PORT || 5173);

  console.log("[1/6] Installing frontend dependencies...");
  await runCommand(["install"], ROOT_DIR, "Frontend dependency install");

  console.log("[2/6] Installing backend dependencies...");
  await runCommand(["install"], SERVER_DIR, "Backend dependency install");

  console.log("[3/4] Ensuring required ports are free...");
  await freePort(backendPort, "backend");
  await freePort(frontendPort, "frontend");

  console.log("[4/4] Starting backend and frontend...");
  const backend = startLongRunningCommand(["start"], SERVER_DIR);
  const frontend = startLongRunningCommand(["run", "dev"], ROOT_DIR);

  const children = [backend, frontend];

  const shutdown = (signal) => {
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
    process.exit(0);
  });

  backend.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Backend exited with code ${code}. Stopping frontend...`);
      if (!frontend.killed) {
        frontend.kill("SIGTERM");
      }
      process.exit(code || 1);
    }
  });

  frontend.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Frontend exited with code ${code}. Stopping backend...`);
      if (!backend.killed) {
        backend.kill("SIGTERM");
      }
      process.exit(code || 1);
    }
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
