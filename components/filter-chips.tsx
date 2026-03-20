"use client";

type FilterOption = {
  label: string;
  value: string;
};

type FilterGroup = {
  key: string;
  label: string;
  options: FilterOption[];
};

type Props = {
  groups: FilterGroup[];
  activeFilters: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export function FilterChips({ groups, activeFilters, onChange }: Props) {
  return (
    <div className="filter-chips-container">
      {groups.map((group) => (
        <div key={group.key} className="chip-group">
          {group.options.map((option) => {
            const isActive = activeFilters[group.key] === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`chip ${isActive ? "active" : ""}`}
                onClick={() =>
                  onChange(group.key, isActive ? "" : option.value)
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
