"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const sortOptions = [
  { value: "recommended", label: "推薦排序" },
  { value: "updated_desc", label: "最近更新" },
  { value: "name_asc", label: "名稱 A-Z" },
];

export function SortSelect({ value, onChange }: Props) {
  return (
    <div className="select-wrap">
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="排序方式"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
