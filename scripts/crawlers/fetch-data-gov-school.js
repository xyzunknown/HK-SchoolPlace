const { fetchSource } = require("./fetch-source");

async function fetchDataGovSchoolSource(config, runtime) {
  const raw = await fetchSource(config, runtime);
  return {
    sourceType: "data_gov_school_json",
    target: raw.target,
    contentType: raw.contentType,
    bodyText: raw.bodyText
  };
}

module.exports = {
  fetchDataGovSchoolSource
};
