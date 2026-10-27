"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Package, User, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  type: "ORDER" | "PIECE" | "CUSTOMER";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-md">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
        <Input
          type="text"
          placeholder="Global search: ORD-..., piece, customer, phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="h-9 pl-8 pr-8 text-xs bg-neutral-100/70 border-neutral-200 focus-visible:bg-white dark:bg-neutral-800/60 dark:border-neutral-700 dark:focus-visible:bg-neutral-900"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-amber-600" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-10 left-0 right-0 z-50 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 max-h-80 overflow-y-auto">
          {results.map((res) => (
            <div
              key={`${res.type}-${res.id}`}
              onClick={() => handleSelect(res.url)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {res.type === "ORDER" && <Package className="h-3.5 w-3.5 text-amber-600" />}
                {res.type === "PIECE" && <Hash className="h-3.5 w-3.5 text-blue-600" />}
                {res.type === "CUSTOMER" && <User className="h-3.5 w-3.5 text-emerald-600" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {res.title}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">{res.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
