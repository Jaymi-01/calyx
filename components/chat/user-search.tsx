"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { SearchResult } from "@/lib/types";
import { MagnifyingGlass, UserPlus, X } from "@phosphor-icons/react";
import { useChat } from "@/lib/hooks/use-chat";

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { setActiveRecipientId } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        try {
          const data = await api.searchUsers(query);
          setResults(data);
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (user: SearchResult) => {
    setActiveRecipientId(user.id);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative group">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#E9EDEF]/40 group-focus-within:text-[#53BDEB] transition-colors">
          <MagnifyingGlass size={20} weight="bold" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Start a new chat..."
          className="block w-full rounded-2xl border border-[#202C33] bg-[#202C33] py-3 pl-11 pr-10 text-sm text-[#E9EDEF] placeholder-[#E9EDEF]/40 shadow-sm transition-all focus:border-[#53BDEB] focus:ring-4 focus:ring-[#53BDEB]/5"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#E9EDEF]/40 hover:text-[#53BDEB] transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || isSearching) && (
        <div className="absolute z-50 mt-3 w-full overflow-hidden rounded-2xl border border-[#202C33] bg-[#0B141A] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {isSearching ? (
            <div className="flex items-center justify-center gap-3 p-8 text-sm text-[#E9EDEF]/40 font-medium">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#202C33] border-t-[#53BDEB]" />
              Searching for users...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto p-2">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left hover:bg-[#202C33] transition-all group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#202C33] text-[#E9EDEF]/40 group-hover:bg-[#005C4B] group-hover:text-[#E9EDEF] transition-colors shadow-sm font-bold uppercase">
                    {user.display_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#E9EDEF] group-hover:translate-x-0.5 transition-transform">
                      {user.display_name}
                    </div>
                    <div className="text-xs text-[#E9EDEF]/40 font-medium">@{user.username}</div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <UserPlus size={20} weight="bold" className="text-[#53BDEB]" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-[#E9EDEF]/40 font-medium">
              No users found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
