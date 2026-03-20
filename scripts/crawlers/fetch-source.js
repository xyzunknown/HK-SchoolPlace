const fs = require("fs");
const path = require("path");

async function fetchSource(config, runtime) {
  const target =
    runtime.options.url ||
    runtime.env[config.envUrlKey] ||
    (runtime.isDryRun ? config.fixturePath : config.defaultUrl) ||
    config.defaultUrl ||
    config.fixturePath;

  if (!target) {
    throw new Error(`Missing source target for ${config.name}`);
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    const response = await fetchWithRetry(target, {
      headers: config.requestHeaders ? config.requestHeaders(runtime.env) : undefined
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status} for ${target}`);
    }

    const bodyText = await response.text();
    return {
      target,
      contentType: response.headers.get("content-type") || "",
      bodyText
    };
  }

  const resolvedPath = path.resolve(runtime.rootDir, target);
  const bodyText = fs.readFileSync(resolvedPath, "utf8");

  return {
    target: resolvedPath,
    contentType: inferContentType(resolvedPath),
    bodyText
  };
}

async function fetchWithRetry(target, init, attempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(target, init);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(300 * attempt);
      }
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inferContentType(filepath) {
  if (filepath.endsWith(".json")) {
    return "application/json";
  }

  if (filepath.endsWith(".html") || filepath.endsWith(".htm")) {
    return "text/html";
  }

  return "text/plain";
}

module.exports = {
  fetchSource
};
