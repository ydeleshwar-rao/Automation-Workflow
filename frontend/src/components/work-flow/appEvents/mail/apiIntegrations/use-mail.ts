'use client';

import { useState, useCallback, useMemo } from 'react';
import { flattenWebhookPayload } from '@/src/components/template/autoMapper';
import { encryptWithPublicKey } from '@/src/lib/smtp-crypto.util';
import { useAppDispatch } from '@/src/store/hooks';
import { SmtpConnection } from './types/mailApis.type';
import {
  mailApi,
  useCreateSmtpConnectionMutation,
  useGetSmtpConnectionsQuery,
  useLazyGetSmtpPublicKeyQuery,
  useSendEmailMutation,
} from './mailApi';

const NO_ACCOUNTS: MailAccount[] = [];
const TEST_RECIPIENT_NAME = 'Test User';

function resolveTemplateVars(html: string, payload: Record<string, unknown>): string {
  return html.replace(/\{\{[^}]+?__([^}]+)\}\}/g, (match, key) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const found = Object.entries(payload).find(([entryKey]) =>
      entryKey.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalized
    );
    return found ? String(found[1]) : match;
  });
}

function buildCleanedFlatFromTriggerPayload(triggerTestPayload: unknown): Record<string, unknown> {
  const raw = triggerTestPayload;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const webhookFlat = flattenWebhookPayload(raw as Record<string, unknown>);
  return Object.fromEntries(
    Object.entries(webhookFlat).map(([key, value]) => [key.replace(/^[\w-]+?__/, ''), value]),
  );
}

/** Strip {{map:id|label|value}} tokens → value (3rd segment). */
function resolveMapTokens(value: unknown): string {
  if (typeof value !== 'string') return value == null ? '' : String(value);
  return value.replace(/\{\{map:[^|]*\|[^|]*\|([^}]*)\}\}/g, '$1').trim();
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

type TestStatus = 'idle' | 'testing' | 'success' | 'failed';

export function useMail() {
  const dispatch = useAppDispatch();
  const { data: accounts = NO_ACCOUNTS, isLoading } = useGetSmtpConnectionsQuery();
  const [fetchSmtpPublicKey] = useLazyGetSmtpPublicKeyQuery();
  const [createSmtpConnection] = useCreateSmtpConnectionMutation();
  const [sendEmail] = useSendEmailMutation();
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  const addAccount = useCallback(async (config: SmtpConfig) => {
    // Encrypt password with server's RSA public key before it leaves the browser
    const publicKey = await fetchSmtpPublicKey().unwrap();
    const encryptedPassword = await encryptWithPublicKey(publicKey, config.pass);

    // The mutation invalidates the connection list, so it refetches on its own.
    return createSmtpConnection({
      name: config.user,
      host: config.host.trim(),
      port: config.port,
      username: config.user.trim(),
      encrypted_password: encryptedPassword,
      use_tls: config.tls,
    }).unwrap();
  }, [fetchSmtpPublicKey, createSmtpConnection]);

  // Hides the account in this session only — there is no delete route for global connections.
  const removeAccount = useCallback((accountId: string) => {
    dispatch(
      mailApi.util.updateQueryData('getSmtpConnections', undefined, (cachedAccounts) =>
        cachedAccounts.filter((account) => account.id !== accountId)
      )
    );
  }, [dispatch]);

  const sendTest = useCallback(async (config: Record<string, unknown>, triggerTestPayload?: unknown) => {
    setTestStatus('testing');
    try {
      const cleanedFlat = buildCleanedFlatFromTriggerPayload(triggerTestPayload);
      const withNodeTokens = (value: unknown) => resolveTemplateVars(resolveMapTokens(value), cleanedFlat);

      await sendEmail({
        smtp_id: config.accountId as string,
        name: withNodeTokens(config.fromName),
        subject: withNodeTokens(config.subject),
        html_template: withNodeTokens(config.htmlBody || config.body),
        to_email: withNodeTokens(config.to),
        cc: config.cc ? [withNodeTokens(config.cc)] : [],
        bcc: config.bcc ? [withNodeTokens(config.bcc)] : [],
        data: {
          name: TEST_RECIPIENT_NAME,
          ...config,
        },
      }).unwrap();
      setTestStatus('success');
    } catch (sendError) {
      console.error('[useMail] sendTest error:', sendError);
      setTestStatus('failed');
      throw sendError;
    }
  }, [sendEmail]);

  return useMemo(() => ({
    accounts,
    isLoading,
    addAccount,
    removeAccount,
    testStatus,
    sendTest,
  }), [accounts, isLoading, addAccount, removeAccount, testStatus, sendTest]);
}
