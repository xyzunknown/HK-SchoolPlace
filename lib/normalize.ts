const punctuationPattern = /[\s.,/#!$%^&*;:{}=\-_`~()"'[\]<>?|+，。！？、；：「」『』（）【】《》．]/g;

const suffixes = [
  "kindergarten",
  "kg",
  "school",
  "幼稚園",
  "幼稚园",
  "幼兒園",
  "幼儿园"
];

const traditionalToSimplifiedMap: Record<string, string> = {
  兒: "儿",
  園: "园",
  樂: "乐",
  灣: "湾",
  龍: "龙",
  華: "华"
};

export function normalizeSchoolName(name: string) {
  let value = name.trim().replace(/\s+/g, " ").toLowerCase();

  value = value
    .split("")
    .map((char) => traditionalToSimplifiedMap[char] ?? char)
    .join("");

  value = value.replace(punctuationPattern, "");

  for (const suffix of suffixes) {
    if (value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
    }
  }

  return value.trim();
}
