/** Builder-only keys stored on a node's config that must never reach an integration. */
const INTERNAL_NODE_CONFIG_KEYS = new Set(["_formIsValid", "_pollingSubscriptionId"]);

/** The node config minus builder bookkeeping, ready to send as an integration payload. */
export function stripInternalConfigKeys(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !INTERNAL_NODE_CONFIG_KEYS.has(key))
  );
}
