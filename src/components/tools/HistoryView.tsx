import React, { useState } from 'react';
import { Clock, Search, Trash2, ArrowRight, CheckCircle2, Filter } from 'lucide-react';
import { useHistory } from '../../context/HistoryContext';

export const HistoryView: React.FC = () => {
  const { history, clearHistory, removeHistoryItem } = useHistory();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const filtered = history.filter((item) => {
    const matchesSearch =
      item.inputFileName.toLowerCase().includes(search.toLowerCase()) ||
      item.outputFileName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conversion History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Locally cached log of completed conversions with storage savings.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors self-start sm:self-auto"
          >
            <Trash2 size={14} /> Clear History
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search conversion history" placeholder="Search completed conversions..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {['all', 'video', 'audio', 'image', 'document'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-xs text-slate-400">
          No conversions found matching criteria.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const savings = Math.max(0, Math.round(((item.inputSize - item.outputSize) / (item.inputSize || 1)) * 100));
            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 gap-3 shadow-xs text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-bold uppercase border border-indigo-200/50 dark:border-indigo-800/50">
                      {item.category}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.inputFileName}
                    </span>
                    <ArrowRight size={12} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                      {item.outputFileName}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span>
                      {formatSize(item.inputSize)} → {formatSize(item.outputSize)}
                    </span>
                    {savings > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-500 font-semibold">-{savings}% size reduced</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  aria-label={`Remove ${item.inputFileName} from history`} onClick={() => removeHistoryItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 self-end sm:self-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
