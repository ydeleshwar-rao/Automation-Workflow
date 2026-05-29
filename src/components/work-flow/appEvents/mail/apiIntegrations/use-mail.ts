'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { flattenWebhookPayload } from '@/src/components/template/autoMapper';
import { SmtpConnection } from './types/mailApis.type';
import { createSmtpConnection, getSmtpConnections } from './mailApis/createSmtpConnection.api';
import { getSmtpPublicKey } from './mailApis/getPublicKey.api';
import { encryptWithPublicKey } from '@/src/lib/smtp-crypto.util';

function resolveTemplateVars(html: string, payload: Record<string, unknown>): string {
  return html.replace(/\{\{[^}]+?__([^}]+)\}\}/g, (match, key) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const found = Object.entries(payload).find(([k]) =>
      k.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalized
    );
    return found ? String(found[1]) : match;
  });
}

function buildCleanedFlatFromTriggerPayload(triggerTestPayload: unknown): Record<string, unknown> {
  const raw = triggerTestPayload;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const webhookFlat = flattenWebhookPayload(raw as Record<string, unknown>);
  return Object.fromEntries(
    Object.entries(webhookFlat).map(([k, v]) => [k.replace(/^[\w-]+?__/, ''), v]),
  );
}

export interface SmtpConfig {
  host: string;
  user: string;
  pass: string;
  tls: boolean;
  port: number;
  fromEmail: string;
}

export type MailAccount = SmtpConnection & {
  config?: SmtpConfig;
};

export function useMail() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<MailAccount | null>(null);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Global connections — no location ID needed
      const resp = await getSmtpConnections();

      let connections: MailAccount[] = [];
      const rawData = (resp as any)?.data || resp;

      if (Array.isArray(rawData)) {
        connections = rawData;
      } else if (rawData && typeof rawData === 'object') {
        connections = [rawData as MailAccount];
      }

      setAccounts(connections);

      if (!selectedAccount && connections.length > 0) {
        const active = connections.find(c => c.status === 'active') ?? connections[0];
        setSelectedAccount(active);
      }
    } catch (err: any) {
      console.error('[useMail] fetchAccounts error:', err.message);
      setError(err.message);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAccount = useCallback(async (config: SmtpConfig) => {
    // Encrypt password with server's RSA public key before it leaves the browser
    const publicKey = await getSmtpPublicKey();
    const encryptedPassword = await encryptWithPublicKey(publicKey, config.pass);

    const payload = {
      name: config.user,
      host: config.host.trim(),
      port: config.port,
      username: config.user.trim(),
      encrypted_password: encryptedPassword,
      use_tls: config.tls,
    };

    const newAccountData = await createSmtpConnection(payload);
    const newAccount = (newAccountData as any)?.data || newAccountData;

    await fetchAccounts();
    return newAccount;
  }, [fetchAccounts]);

  const removeAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedAccount((prev) => (prev?.id === id ? null : prev));
  }, []);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const sendTest = useCallback(async (config: any, triggerTestPayload?: unknown) => {
    setTestStatus('testing');
    try {
      const { sendEmail } = await import('./mailApis/sendEmail.api');

      const mapResolve = (val: any): string => {
        if (typeof val !== "string") return val == null ? "" : String(val);
        return val.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, "$1").trim();
      };

      const cleanedFlat = buildCleanedFlatFromTriggerPayload(triggerTestPayload);
      const withNodeTokens = (val: any) => resolveTemplateVars(mapResolve(val), cleanedFlat);

      const payload = {
        smtp_id: config.accountId,
        name: withNodeTokens(config.fromName),
        subject: withNodeTokens(config.subject),
        html_template: withNodeTokens(config.htmlBody || config.body),
        to_email: withNodeTokens(config.to),
        cc: config.cc ? [withNodeTokens(config.cc)] : [],
        bcc: config.bcc ? [withNodeTokens(config.bcc)] : [],
        data: {
          name: "Test User",
          ...config,
        },
      };

      await sendEmail(payload);
      setTestStatus('success');
    } catch (err: any) {
      console.error('[useMail] sendTest error:', err.message);
      setTestStatus('failed');
      throw err;
    }
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
    testStatus,
    setTestStatus,
    sendTest,
  }), [selectedEvent, selectedAccount, accounts, isLoading, error, addAccount, removeAccount, fetchAccounts, testStatus, sendTest]);
}
