"use client";

import { useState, useEffect, useMemo } from "react";
import { leadshubApi } from "../api/leadshub.api";

export function useLeadsHubContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchContacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadshubApi.getContacts();
      setContacts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch contacts: ${msg}`);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await leadshubApi.syncContacts();
      await fetchContacts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Sync error: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const lower = searchQuery.toLowerCase();
    return contacts.filter(c => 
      (c.first_name + " " + c.last_name).toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower) ||
      c.phone?.includes(searchQuery)
    );
  }, [contacts, searchQuery]);

  const totalItems = filteredContacts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  return {
    contacts,
    filteredContacts,
    paginatedContacts,
    isLoading,
    isSyncing,
    error,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    handleSync,
    refreshContacts: fetchContacts,
  };
}
