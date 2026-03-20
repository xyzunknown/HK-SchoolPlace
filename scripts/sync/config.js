const path = require("path");

const rootFixtureDir = path.join("data", "sync-fixtures");

const sourceConfigs = {
  "school-master": {
    name: "school-master",
    envUrlKey: "SCHOOL_MASTER_SOURCE_URL",
    defaultUrl: "https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json",
    fixturePath: path.join(rootFixtureDir, "school-master.json"),
    crawlerModule: "../crawlers/fetch-data-gov-school",
    crawlerExport: "fetchDataGovSchoolSource",
    parserModule: "../parsers/parse-data-gov-school",
    parserExport: "parseDataGovSchoolPayload",
    syncType: "school_master",
    sourceLabel: "data_gov_hk"
  },
  vacancy: {
    name: "vacancy",
    envUrlKey: "VACANCY_SOURCE_URL",
    defaultUrl: "https://www.edb.gov.hk/tc/edu-system/preprimary-kindergarten/kindergarten-k1-admission-arrangements/K1-K3_Vacancy_2627.html",
    fixturePath: path.join(rootFixtureDir, "vacancies-edb.json"),
    crawlerModule: "../crawlers/fetch-edb-vacancy",
    crawlerExport: "fetchEdbVacancySource",
    parserModule: "../parsers/parse-edb-vacancy",
    parserExport: "parseEdbVacancyPayload",
    syncType: "vacancy",
    sourceLabel: "edb"
  }
};

module.exports = {
  sourceConfigs
};
