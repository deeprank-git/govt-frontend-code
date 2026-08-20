import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTests } from "@/services/testService";

interface TestResult {
  _id: string;
  title: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await getTests({ search: query.trim() });
        const data: TestResult[] = Array.isArray(res?.data) ? res.data : [];
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    setIsOpen(false);
    setQuery("");
    navigate({ to: "/test/$testId/instructions", params: { testId: id } });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative hidden md:flex flex-1 max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search exams, tests, topics…"
        className="pl-9 bg-muted/40 border-transparent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-md shadow-md overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((test) => (
                <li key={test._id}>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => handleSelect(test._id)}
                  >
                    {test.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
}
