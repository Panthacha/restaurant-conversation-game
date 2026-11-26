// Horizontal bars on one shared scale (0 to `max`): one row per category, one thin bar per series.
// Values are written at the bar tips and repeated in a tooltip on hover; the legend names the series.

export interface BarSeries {
  name: string;
  color: string;
}

export interface BarRow {
  label: string;
  values: (number | null)[]; // one per series, in the same order
  texts: string[]; // what is written at each bar's tip
}

export default function Bars({ series, rows, max }: { series: BarSeries[]; rows: BarRow[]; max: number }) {
  return (
    <div>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-3 font-mitr text-sm text-stone-600">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7rem_1fr] md:grid-cols-[9rem_1fr] gap-3 items-center">
            <span className="font-mitr text-sm text-stone-600 truncate" title={row.label}>{row.label}</span>
            <div className="flex flex-col gap-[2px]">
              {series.map((s, i) => {
                const v = row.values[i];
                return (
                  <div key={s.name} className="group relative flex items-center gap-2 h-3.5">
                    {v !== null && <div className="h-3 rounded-r-[4px] min-w-[2px]" style={{ width: `calc(${(Math.min(v, max) / max) * 100}% - 5rem)`, background: s.color }} />}
                    <span className="text-xs text-stone-500 tabular-nums whitespace-nowrap">{row.texts[i]}</span>
                    <span className="pointer-events-none absolute left-0 -top-8 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-stone-800 text-white text-xs font-mitr px-2 py-1">
                      {series.length > 1 ? `${s.name} · ` : ""}{row.label}: {row.texts[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
