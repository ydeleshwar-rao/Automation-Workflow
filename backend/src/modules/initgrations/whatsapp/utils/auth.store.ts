import {
  AuthenticationState,
  initAuthCreds,
  BufferJSON,
  proto,
} from "@whiskeysockets/baileys";
import type { Prisma } from "@prisma/client";
import { whatsappRepository, type WhatsappAuthKeyEntry } from "../repository/whatsapp.repository.js";

const CREDS_KEY_ID = "creds";
const APP_STATE_SYNC_KEY_TYPE = "app-state-sync-key";

/** Baileys values contain Buffers; round-trip through BufferJSON so they survive JSON storage. */
function toStorableJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}

function fromStoredJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver);
}

/**
 * Database-backed Baileys auth state.
 * Persists WhatsApp session credentials across server restarts.
 */
export async function useDatabaseAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const storedKeys = await whatsappRepository.findAuthKeys(userId);

  const keyMap: Record<string, unknown> = {};
  for (const storedKey of storedKeys) {
    keyMap[storedKey.key_id] = storedKey.key_data;
  }

  const creds = keyMap[CREDS_KEY_ID] ? fromStoredJson(keyMap[CREDS_KEY_ID]) : initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type: string, ids: string[]) => {
        const result: Record<string, any> = {};
        for (const id of ids) {
          const keyId = `${type}-${id}`;
          let value = keyMap[keyId];
          if (value) {
            value = fromStoredJson(value);
            if (type === APP_STATE_SYNC_KEY_TYPE) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
            }
          }
          result[id] = value;
        }
        return result;
      },

      set: async (data: Record<string, Record<string, any>>) => {
        const entriesToSave: WhatsappAuthKeyEntry[] = [];
        const keyIdsToDelete: string[] = [];

        for (const [type, typeData] of Object.entries(data)) {
          for (const [id, value] of Object.entries(typeData)) {
            const keyId = `${type}-${id}`;
            if (value) {
              const keyData = toStorableJson(value);
              entriesToSave.push({ key_id: keyId, key_data: keyData });
              keyMap[keyId] = keyData;
            } else {
              keyIdsToDelete.push(keyId);
              delete keyMap[keyId];
            }
          }
        }

        if (entriesToSave.length > 0) {
          await whatsappRepository.upsertAuthKeys(userId, entriesToSave);
        }
        if (keyIdsToDelete.length > 0) {
          await whatsappRepository.deleteAuthKeys(userId, keyIdsToDelete);
        }
      },
    },
  };

  const saveCreds = async () => {
    const credsData = toStorableJson(creds);
    await whatsappRepository.upsertAuthKeys(userId, [{ key_id: CREDS_KEY_ID, key_data: credsData }]);
    keyMap[CREDS_KEY_ID] = credsData;
  };

  return { state, saveCreds };
}
