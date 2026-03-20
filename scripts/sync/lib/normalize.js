function normalizeSchoolName(name) {
  const traditionalToSimplifiedMap = {
    "兒": "儿",
    "園": "园",
    "樂": "乐",
    "灣": "湾",
    "龍": "龙",
    "華": "华",
    "啓": "启",
    "㇐": "一",
    "⾧": "長",
    "０": "0",
    "１": "1",
    "２": "2",
    "３": "3",
    "４": "4",
    "５": "5",
    "６": "6",
    "７": "7",
    "８": "8",
    "９": "9"
  };

  const suffixes = ["kindergarten", "kg", "school", "幼稚園", "幼稚园", "幼兒園", "幼儿园"];

  let value = String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split("")
    .map((char) => traditionalToSimplifiedMap[char] || char)
    .join("")
    .replace(/[\s.,/#!$%^&*;:{}=\-_`~()"'[\]<>?|+，。！？、；：「」『』（）﹝﹞【】《》．]/g, "");

  for (const suffix of suffixes) {
    if (value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
    }
  }

  return value.trim();
}

function normalizeDistrictName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/區$/u, "")
    .replace(/district$/iu, "")
    .toLowerCase()
    .split("")
    .map((char) =>
      ({
        "灣": "湾",
        "龍": "龙",
        "臺": "台",
        "觀": "观",
        "東": "东",
        "西": "西",
        "南": "南",
        "北": "北"
      })[char] || char
    )
    .join("");
}

function buildSchoolNameVariants(name) {
  const raw = String(name || "").trim();
  if (!raw) {
    return [];
  }

  const variants = new Set([normalizeSchoolName(raw)]);
  const withoutBracket = raw.replace(/[（(﹝][^)）﹞]+[)）﹞]/g, "").trim();
  const bracketText = Array.from(raw.matchAll(/[（(﹝]([^)）﹞]+)[)）﹞]/g)).map((match) => match[1].trim());

  if (withoutBracket && withoutBracket !== raw) {
    variants.add(normalizeSchoolName(withoutBracket));
  }

  for (const extra of bracketText) {
    if (withoutBracket) {
      variants.add(normalizeSchoolName(`${withoutBracket}${extra}`));
      variants.add(normalizeSchoolName(`${withoutBracket} ${extra}`));
    }
  }

  return Array.from(variants).filter(Boolean);
}

function extractBracketTokens(name) {
  return Array.from(String(name || "").matchAll(/[（(﹝]([^)）﹞]+)[)）﹞]/g))
    .map((match) => normalizeSchoolName(match[1]))
    .filter(Boolean);
}

module.exports = {
  buildSchoolNameVariants,
  extractBracketTokens,
  normalizeDistrictName,
  normalizeSchoolName
};
