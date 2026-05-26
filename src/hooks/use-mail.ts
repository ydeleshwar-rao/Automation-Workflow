import { useState, useCallback, useEffect, useMemo } from 'react';
import { API_ROUTES } from '@/src/constants/api.constants';

export interface SmtpConfig {
  host: string;
  user: string;
  pass: string;
  tls: boolean;
  port: number;
  fromEmail: string;
}

export interface MailAccount {
  id: string;
  name: string;
  username: string;
  host: string;
  port: number;
  use_tls: boolean;
  status: string;
  config?: SmtpConfig;
}

// TODO: Replace with actual locationId from auth context/session
const LOCATION_ID = "default-location";

export function useMail() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<MailAccount | null>(null);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real SMTP connections from the backend on mount
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ROUTES.MAIL.GET_CONNECTIONS(LOCATION_ID));
      if (!res.ok) throw new Error(`Failed to fetch connections: ${res.status}`);
      const json = await res.json();
      // Backend wraps response in { data: [...] }
      const connections: MailAccount[] = json.data ?? [];
      setAccounts(connections);
      // Auto-select first active connection if none selected
      if (!selectedAccount && connections.length > 0) {
        const active = connections.find(c => c.status === 'active') ?? connections[0];
        setSelectedAccount(active);
      }
    } catch (err: any) {
      console.error('[useMail] fetchAccounts error:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Save a new SMTP connection to the backend, then refresh the list
  const addAccount = useCallback(async (config: SmtpConfig) => {
    const payload = {
      location_id: LOCATION_ID,
      name: config.user,
      host: config.host,
      port: config.port,
      username: config.user,
      encrypted_password: config.pass,
      use_tls: config.tls,
    };

    const res = await fetch(API_ROUTES.MAIL.CREATE_CONNECTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to create SMTP connection: ${res.status}`);
    }

    // Refresh accounts list from server
    await fetchAccounts();
  }, [fetchAccounts]);

  const removeAccount = useCallback((id: string) => {
    // Local-only remove (backend delete endpoint can be added later)
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedAccount((prev) => (prev?.id === id ? null : prev));
  }, []);

  return useMemo(() => ({
    selectedEvent,
    setSelectedEvent,
    selectedAccount,
    setSelectedAccount,
    accounts,
    isLoading,
    error,
    addAccount,
    removeAccount,
    refetch: fetchAccounts,
  }), [selectedEvent, selectedAccount, accounts, isLoading, error, addAccount, removeAccount, fetchAccounts]);
}
