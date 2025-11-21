"use client";

import { useState, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import Link from "next/link";
import { useFetcher } from "@/hooks/fetch";
import Cookies from "js-cookie";

function highlightSearchTermsReact(text: string, searchQuery: string) {
  if (!searchQuery.trim()) return text;

  const terms = searchQuery
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const regex = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );

  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, idx) =>
        regex.test(part) ? (
          <mark
            key={idx}
            className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}

type SearchPopoverProps = {
  debounceMs?: number;
};

export type SearchMessagesResult = {
  thread_id: string;
  message_id: string;
  title: string;
  content: string;
};

export type SearchMessagesList = {
  result_list: SearchMessagesResult[];
};

export function SearchPopover({ debounceMs = 400 }: SearchPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchMessagesResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetcher = useFetcher();
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    // Cancel any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Empty query = clear results immediately, abort any request
    if (!query.trim()) {
      controllerRef.current?.abort();
      setResults([]);
      setLoading(false);
      return;
    }

    // Set new debounce timer
    debounceRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      try {
        const projectID = Cookies.get("projectID");
        const virtualLabID = Cookies.get("virtualLabID");

        const queryParams: Record<string, string> = {
          query: query,
        };
        if (virtualLabID !== undefined) {
          queryParams.virtual_lab_id = virtualLabID;
        }
        if (projectID !== undefined) {
          queryParams.project_id = projectID;
        }

        const data = (await fetcher({
          method: "GET",
          path: "/threads/search",
          queryParams: queryParams,
          signal: controller.signal,
        })) as SearchMessagesList;

        setResults(data.result_list ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search error:", err);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          controllerRef.current?.abort();
          if (debounceRef.current) clearTimeout(debounceRef.current);
          setResults([]);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="rounded-md transition-transform duration-150 hover:scale-110">
          <Search />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] rounded-lg border-2 border-gray-400 p-0 shadow-lg dark:border-gray-700"
        side="right"
        align="start"
        alignOffset={20}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            className="h-10 px-3"
            onValueChange={handleSearch}
            ref={inputRef}
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {inputRef.current?.value && results.length === 0 && (
              <CommandEmpty>
                {loading ? "Searching..." : "No results found."}
              </CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((res) => (
                  <CommandItem
                    key={res.message_id}
                    value={res.message_id}
                    className="flex flex-col items-start rounded-md p-3 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                    asChild
                    onSelect={() => {
                      setIsOpen(false);
                      setResults([]);
                    }}
                  >
                    <Link
                      href={`/threads/${res.thread_id}`}
                      className="block w-full"
                    >
                      <div className="mb-1 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {res.title}
                      </div>
                      <div className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {highlightSearchTermsReact(
                          res.content,
                          inputRef.current?.value || "",
                        )}
                      </div>
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
