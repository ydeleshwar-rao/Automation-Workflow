import type { Prisma } from "@prisma/client";
import { CreateMappingDTO } from "./mapping.dto.js";
import { workflowFieldMappingRepository } from "./mapping.repository.js";
import { asJsonArray } from "../shared/json-object.js";
import { ApiError } from "../../../utils/ApiError.js";

type MappingEntry = {
  mapping_type: "dynamic" | "static" | "template";
  destination_field: string;
  source_node_id: string | null;
  source_field: string | null;
  static_value: string | null;
  template: string | null;
};

function validate(mapping: CreateMappingDTO) {
  // Treat whitespace-only strings as empty — otherwise a UI bug can persist
  // source_field=" " which silently resolves to undefined at execution time.
  const isNonEmpty = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

  if (!isNonEmpty(mapping.destination_field)) {
    throw new Error(`destination_field is required and must be a non-empty string`);
  }
  if (mapping.mapping_type === "dynamic") {
    if (!isNonEmpty(mapping.source_node_id) || !isNonEmpty(mapping.source_field)) {
      throw new Error(
        `Dynamic mapping for destination="${mapping.destination_field}" requires non-empty source_node_id and source_field`
      );
    }
  }
  if (mapping.mapping_type === "static") {
    if (mapping.static_value === undefined || mapping.static_value === null) {
      throw new Error(
        `Static mapping for destination="${mapping.destination_field}" requires static_value`
      );
    }
  }
  if (mapping.mapping_type === "template") {
    if (!isNonEmpty(mapping.source_node_id) || !isNonEmpty(mapping.template)) {
      throw new Error(
        `Template mapping for destination="${mapping.destination_field}" requires non-empty source_node_id and template`
      );
    }
  }
}

function toEntry(mapping: CreateMappingDTO): MappingEntry {
  return {
    mapping_type: mapping.mapping_type,
    destination_field: mapping.destination_field,
    source_node_id: mapping.source_node_id ?? null,
    source_field: mapping.source_field ?? null,
    static_value: mapping.static_value ?? null,
    template: mapping.template ?? null,
  };
}

function toJson(entries: MappingEntry[]): Prisma.InputJsonValue {
  return entries as unknown as Prisma.InputJsonValue;
}

export async function createMappingService(nodeId: string, payload: CreateMappingDTO) {
  console.log(`[MappingService] Add/update mapping | node=${nodeId} destination=${payload.destination_field}`);
  validate(payload);

  // Read current row, append (or replace) the entry, then upsert
  const existing = await workflowFieldMappingRepository.findByNode(nodeId);
  const current = asJsonArray<MappingEntry>(existing?.mappings);
  const updated = [
    ...current.filter((entry) => entry.destination_field !== payload.destination_field),
    toEntry(payload),
  ];

  const saved = await workflowFieldMappingRepository.saveForNode(nodeId, toJson(updated));
  console.log(`[MappingService] Mapping saved | node=${nodeId} total=${updated.length}`);
  return saved;
}

export async function getMappingsByNodeService(nodeId: string) {
  console.log(`[MappingService] Fetching mappings | workflow_node_id=${nodeId}`);

  const row = await workflowFieldMappingRepository.findByNode(nodeId);
  const mappings = asJsonArray<MappingEntry>(row?.mappings);
  console.log(`[MappingService] Found ${mappings.length} mapping(s) for node ${nodeId}`);
  return mappings;
}

/**
 * createMappingsBulkService
 *
 * Replaces ALL mappings for a node in a single upsert — one DB row per node.
 */
export async function createMappingsBulkService(nodeId: string, mappings: CreateMappingDTO[]) {
  console.log(`[MappingService] Bulk upsert | node=${nodeId} count=${mappings.length}`);

  for (const mapping of mappings) validate(mapping);

  const entries = mappings.map(toEntry);
  const saved = await workflowFieldMappingRepository.saveForNode(nodeId, toJson(entries));

  console.log(`[MappingService] Bulk upsert complete | node=${nodeId} saved=${entries.length}`);
  entries.forEach((entry) =>
    console.log(`  ✓ [${entry.mapping_type}] ${entry.source_field ?? entry.static_value} → ${entry.destination_field}`)
  );

  return saved;
}

export async function deleteMappingService(nodeId: string, destinationField: string) {
  console.log(`[MappingService] Deleting mapping | node=${nodeId} destination=${destinationField}`);

  const existing = await workflowFieldMappingRepository.findByNode(nodeId);
  if (!existing) throw new ApiError(404, "No mappings found for this node");

  const updated = asJsonArray<MappingEntry>(existing.mappings).filter(
    (entry) => entry.destination_field !== destinationField
  );
  await workflowFieldMappingRepository.saveForNode(nodeId, toJson(updated));

  console.log(`[MappingService] Mapping deleted | node=${nodeId} destination=${destinationField}`);
  return { message: "Mapping deleted successfully" };
}
