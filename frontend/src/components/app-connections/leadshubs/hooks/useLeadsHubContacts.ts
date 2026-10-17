"use client";

import { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/src/lib/api-error";
import {
  useGetLeadsHubContactsQuery,
  type LeadsHubContact,
} from "../../apiIntegrations/integrationsApi";

const DEFAULT_ITEMS_PER_PAGE = 10;
const FIRST_PAGE = 1;
const NO_CONTACTS: LeadsHubContact[] = [];

function matchesSearch(contact: LeadsHubContact, searchQuery: string): boolean {
  const lowerCaseQuery = searchQuery.toLowerCase();
  const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
  return (
    fullName.includes(lowerCaseQuery) ||
    Boolean(contact.email?.toLowerCase().includes(lowerCaseQuery)) ||
    Boolean(contact.phone?.includes(searchQuery))
  );
}

/** LeadsHub contacts (fetched live through the backend) with client-side search and pagination. */
export function useLeadsHubContacts() {
  const { data: contacts = NO_CONTACTS, isLoading, isFetching, error: fetchError, refetch } =
    useGetLeadsHubContactsQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(FIRST_PAGE);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const filteredContacts = useMemo(
    () => (searchQuery ? contacts.filter((contact) => matchesSearch(contact, searchQuery)) : contacts),
    [contacts, searchQuery],
  );

  const totalItems = filteredContacts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedContacts = useMemo(() => {
    const pageStart = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(pageStart, pageStart + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  const error = fetchError
    ? `Failed to fetch contacts: ${getApiErrorMessage(fetchError, "Unknown error")}`
    : null;

  return {
    contacts,
    filteredContacts,
    paginatedContacts,
    isLoading,
    isFetching,
    error,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    refetch,
  };
}
