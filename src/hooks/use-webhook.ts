import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { WebhookRequest, WebhookTestStatus } from '@/src/components/work-flow/uiOrchestrator/types';

const WEBHOOK_BASE_PATH = '/api/hooks/catch/26465781';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;
const MAX_HISTORY = 10;

/**
 * Formats a raw ISO timestamp to a human-readable locale string.
 * (SRP: isolated formatting logic)
 */
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Maps a raw API payload to a domain WebhookRequest.
 * (OCP: extend mapping without modifying hook logic)
 */
function mapPayloadToRequest(payload: any): WebhookRequest {
  return {
    id: payload.id,
    name: 'Request ' + payload.id.split('/').pop().toUpperCase(),
    timestamp: formatTimestamp(payload.timestamp),
    data: payload.data,
  };
}

/**
 * useWebhook — orchestrates webhook URL generation, polling, and state.
 * Follows SRP: only manages webhook test lifecycle.
 * Follows DIP: API endpoint is injectable via WEBHOOK_BASE_PATH constant.
 */
export function useWebhook() {
  // Use sessionStorage to keep the hookId stable across re-renders.
  // This ensures the webhook URL doesn't change when the sidebar closes and reopens.
  const [hookId] = useState(() => {
    if (typeof window === 'undefined') return Math.random().toString(36).substring(7);
    const stored = sessionStorage.getItem('webhook_hook_id');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(7);
    sessionStorage.setItem('webhook_hook_id', newId);
    return newId;
  });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testStatus, setTestStatus] = useState<WebhookTestStatus>('idle');
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    setWebhookUrl(`${baseUrl}${WEBHOOK_BASE_PATH}/${hookId}`);
  }, [hookId]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollForData = useCallback(async () => {
    try {
      const response = await fetch(`${WEBHOOK_BASE_PATH}/${hookId}`);
      if (!response.ok) return;

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error("[useWebhook] JSON parse error:", e);
        return;
      }
      
      if (result.status !== 'success' || !Array.isArray(result.payload)) return;

      const fetchedRequests = result.payload
        .slice(0, MAX_HISTORY)
        .map(mapPayloadToRequest);

      setRequests(fetchedRequests);
      setTestStatus('success');

      // Auto-select the latest if nothing is selected
      setSelectedRequestId(prev => prev ?? (fetchedRequests[0]?.id || null));
    } catch (error) {
      console.error('[useWebhook] Polling error:', error);
    }
  }, [hookId]);

  const startPolling = useCallback((options?: { clearHistory?: boolean }) => {
    setTestStatus('testing');
    
    if (options?.clearHistory) {
      setRequests([]);
      setSelectedRequestId(null);
      // Clear old records from DB so we only see fresh requests
      fetch(`${WEBHOOK_BASE_PATH}/${hookId}`, { method: 'DELETE' }).catch(() => {});
    }

    stopPolling();
    pollingRef.current = setInterval(pollForData, POLL_INTERVAL_MS);

    setTimeout(() => {
      if (pollingRef.current) {
        stopPolling();
        setTestStatus(prev => prev === 'testing' ? 'idle' : prev);
      }
    }, POLL_TIMEOUT_MS);
  }, [hookId, pollForData, stopPolling]);

  const testTrigger = useCallback(() => {
    startPolling({ clearHistory: true });
  }, [startPolling]);

  const findNewRecords = useCallback(() => {
    startPolling({ clearHistory: false });
  }, [startPolling]);

  const copyUrl = useCallback(() => {
    if (webhookUrl) navigator.clipboard.writeText(webhookUrl);
  }, [webhookUrl]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const simulateTest = useCallback(async () => {
    // simulation is now handled manually if needed
    setTestStatus('testing');
    setTimeout(pollForData, 800);
  }, [pollForData]);

  return useMemo(() => ({
    webhookUrl,
    testStatus,
    setTestStatus,
    requests,
    selectedRequestId,
    setSelectedRequestId,
    simulateTest,
    findNewRecords,
    testTrigger,
    copyUrl,
  }), [
    webhookUrl, 
    testStatus, 
    requests, 
    selectedRequestId, 
    setTestStatus, 
    setSelectedRequestId, 
    simulateTest, 
    findNewRecords, 
    copyUrl
  ]);
}
