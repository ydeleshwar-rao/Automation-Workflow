"use client";

import { useState, useCallback, useMemo } from 'react';

export function useLeadConnector() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    // Mock fetching accounts
    setTimeout(() => {
        setAccounts([
            { id: '1', name: 'Antigravity Agency (Location A)' },
            { id: '2', name: 'LeadsHub Test (Location B)' }
        ]);
        setIsLoading(false);
    }, 1000);
  }, []);

  const addAccount = useCallback(async () => {
    setIsLoading(true);
    // Mock adding account
    setTimeout(() => {
        const newAcc = { id: Date.now().toString(), name: 'New LeadConnector Account' };
        setAccounts(prev => [...prev, newAcc]);
        setSelectedAccount(newAcc);
        setIsLoading(false);
    }, 1500);
  }, []);

  return useMemo(() => ({
    selectedEvent,
    setSelectedEvent,
    selectedAccount,
    setSelectedAccount,
    accounts,
    isLoading,
    fetchAccounts,
    addAccount,
  }), [selectedEvent, selectedAccount, accounts, isLoading, fetchAccounts, addAccount]);
}
