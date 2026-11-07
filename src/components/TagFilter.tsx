type TagFilterProps = {
  tags: string[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  counts: Record<string, number>;
};

export default function TagFilter({ tags, activeTag, onTagChange, counts }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onTagChange(null)}
        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
          activeTag === null
            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        All gigs
      </button>
      {tags.map((tag) => {
        const isActive = activeTag === tag;
        return (
          <button
            key={tag}
            onClick={() => onTagChange(isActive ? null : tag)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              isActive
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tag}
            <span className={`ml-1.5 text-xs ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
              {counts[tag] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
