"use client";

type FilterOptions = {
  industry: string[];
  region: string[];
  gender: string[];
  vote: string[];
};

type Props = {
  options: FilterOptions;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  studyLabel: string;
};

const FILTER_KEYS: Array<keyof FilterOptions> = ["industry", "region", "gender", "vote"];

export default function FilterPanel({ options, filters, onFilterChange, studyLabel }: Props) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{studyLabel}</h2>
        <p>Choose slices to interactively recalculate the charts.</p>
      </div>

      <div className="grid">
        {FILTER_KEYS.map((key) => (
          <label key={key} className="field">
            <span>{key}</span>
            <select value={filters[key] ?? ""} onChange={(e) => onFilterChange(key, e.target.value)}>
              <option value="">All</option>
              {options[key].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
