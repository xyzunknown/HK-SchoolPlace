const fs = require("fs");
const path = require("path");

function createRuntime(argv) {
  const rootDir = path.resolve(__dirname, "..", "..", "..");
  const env = loadEnvFiles(rootDir);
  const firstArg = argv[2];
  const hasModeArg = firstArg && !firstArg.startsWith("--");
  const mode = hasModeArg ? firstArg : null;
  const options = parseOptions(argv.slice(hasModeArg ? 3 : 2));
  const executionMode = resolveExecutionMode(options, env);

  return {
    rootDir,
    env,
    mode,
    options,
    executionMode,
    isDryRun: executionMode === "dry-run",
    isWriteMode: executionMode === "write",
    now: new Date()
  };
}

function resolveExecutionMode(options, env) {
  if (options.write && options.dryRun) {
    throw new Error("Cannot use --write and --dry-run together");
  }

  if (options.write) {
    ensureWriteEnv(env);
    return "write";
  }

  if (options.dryRun) {
    return "dry-run";
  }

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return "write";
  }

  return "dry-run";
}

function ensureWriteEnv(env) {
  if (!env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is required in --write mode");
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in --write mode");
  }
}

function loadEnvFiles(rootDir) {
  const env = { ...process.env };
  const files = [".env.local", ".env"];

  for (const filename of files) {
    const filepath = path.join(rootDir, filename);
    if (!fs.existsSync(filepath)) {
      continue;
    }

    const lines = fs.readFileSync(filepath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
      if (!(key in env)) {
        env[key] = value;
      }
    }
  }

  return env;
}

function parseOptions(args) {
  const options = {
    url: null,
    schoolSource: null,
    write: false,
    dryRun: false,
    staleHours: 72
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--url") {
      options.url = args[index + 1] || null;
      index += 1;
      continue;
    }
    if (value === "--school-source") {
      options.schoolSource = args[index + 1] || null;
      index += 1;
      continue;
    }
    if (value === "--write") {
      options.write = true;
      continue;
    }
    if (value === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (value === "--stale-hours") {
      options.staleHours = Number.parseInt(args[index + 1] || "72", 10);
      index += 1;
    }
  }

  return options;
}

module.exports = {
  createRuntime
};
