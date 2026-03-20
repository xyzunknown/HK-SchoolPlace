const fs = require("fs");
const path = require("path");

const { PDFParse } = require("pdf-parse");

const { fetchSource } = require("./fetch-source");

async function fetchEdbVacancySource(config, runtime) {
  const target =
    runtime.options.url ||
    runtime.env[config.envUrlKey] ||
    (runtime.isDryRun ? config.fixturePath : config.defaultUrl) ||
    config.defaultUrl;
  if (!target) {
    throw new Error("VACANCY source URL is required");
  }

  if (target.toLowerCase().endsWith(".json")) {
    const raw = await fetchSource(
      {
        ...config,
        defaultUrl: target
      },
      runtime
    );
    return {
      sourceType: "fixture_json",
      target: raw.target,
      contentType: raw.contentType,
      bodyText: raw.bodyText
    };
  }

  if (target.toLowerCase().endsWith(".pdf")) {
    const pdf = await fetchPdfDocument(target, runtime.rootDir);
    return {
      sourceType: "edb_vacancy_pdf_bundle",
      target,
      documents: [pdf]
    };
  }

  const landing = await fetchSource(
    {
      ...config,
      defaultUrl: target
    },
    runtime
  );

  const pdfUrls = extractDistrictPdfUrls(landing.bodyText, target);
  if (pdfUrls.length === 0) {
    throw new Error(`No district vacancy PDF links found on ${target}`);
  }

  const documents = [];
  for (const url of pdfUrls) {
    documents.push(await fetchPdfDocument(url, runtime.rootDir));
  }

  return {
    sourceType: "edb_vacancy_pdf_bundle",
    target,
    landingHtml: landing.bodyText,
    documents
  };
}

async function fetchPdfDocument(url, rootDir) {
  const buffer = await readPdfBuffer(url, rootDir);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  return {
    url,
    text: result.text
  };
}

async function readPdfBuffer(target, rootDir) {
  if (target.startsWith("http://") || target.startsWith("https://")) {
    const response = await fetchWithRetry(target);
    if (!response.ok) {
      throw new Error(`Failed to fetch vacancy PDF ${target}: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const filepath = path.resolve(rootDir, target);
  return fs.readFileSync(filepath);
}

async function fetchWithRetry(target, attempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(target);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }

  throw lastError;
}

function extractDistrictPdfUrls(html, baseUrl) {
  const urls = new Set();
  const regex = /href="([^"]+K1-K3%20Vacancy\.pdf)"/gi;
  let match = regex.exec(html);
  while (match) {
    urls.add(new URL(match[1], baseUrl).toString());
    match = regex.exec(html);
  }
  return Array.from(urls);
}

module.exports = {
  fetchEdbVacancySource
};
