import { useState } from "react";
import { searchTasks } from "./api";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = no search run yet
  const [searching, setSearching] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    const resp = await searchTasks(query);
    setSearching(false);
    if (resp.ok) setResults(await resp.json());
  }

  function clear() {
    setResults(null);
    setQuery("");
  }

  return (
    <div id="search-section">
      <form onSubmit={handleSubmit} className="search-form">
        <svg className="search-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 14L17.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Search your tasks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={searching}
        />
      </form>
      {results !== null && (
        <div id="search-results">
          {results.length === 0 ? (
            <em>No matching tasks.</em>
          ) : (
            results.map((r) => (
              <div className="search-result" key={r.task_id}>
                {r.snippet}
              </div>
            ))
          )}
          <button type="button" className="secondary" onClick={clear}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
