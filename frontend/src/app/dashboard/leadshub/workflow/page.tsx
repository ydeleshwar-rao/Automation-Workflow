"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  LocationCustomField,
  useCreateLocationLeadMutation,
  useGetLocationCustomFieldsQuery,
  useLazyGetLocationLeadInputQuery,
} from "@/src/components/work-flow/appEvents/leadconnector/apiIntegrations/leadConnectorApi";

/**
 * LeadsHub (GoHighLevel) location this test page reads from and writes to.
 * Hard-coded until the page gets a location picker.
 */
const LEADSHUB_TEST_LOCATION_ID = "6QckpJiSCvacZ7Vcnkxk";

const NO_FIELDS: LocationCustomField[] = [];

function getFieldIdentifier(field: LocationCustomField): string {
  return field.id || field.key;
}

/** Drop empty inputs so only fields the user actually filled are sent. */
function pickFilledValues(formData: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(formData).filter(([, value]) => value !== undefined && value !== "")
  );
}

export default function CustomFieldsPage() {
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: fields = NO_FIELDS, isLoading: loading } = useGetLocationCustomFieldsQuery(LEADSHUB_TEST_LOCATION_ID);
  const [fetchLeadInput, { data: leadData, isFetching: leadLoading }] = useLazyGetLocationLeadInputQuery();
  const [createLocationLead] = useCreateLocationLeadMutation();

  const handleFetchLead = () => {
    fetchLeadInput(LEADSHUB_TEST_LOCATION_ID)
      .unwrap()
      .catch((error) => console.error("Error fetching lead input", error));
  };

  const handleChange = (field: LocationCustomField, value: string) => {
    setFormData((previous) => ({ ...previous, [getFieldIdentifier(field)]: value }));
  };

  const handleSave = async () => {
    const filledData = pickFilledValues(formData);
    if (Object.keys(filledData).length === 0) {
      toast.error("No filled fields to save");
      return;
    }

    try {
      await createLocationLead({ locationId: LEADSHUB_TEST_LOCATION_ID, lead: filledData }).unwrap();
      toast.success("Data saved successfully");
    } catch (error) {
      console.error("Save Error:", error);
      toast.error("Error saving data");
    }
  };

  const filteredFields = useMemo(() => {
    return fields.filter((field) =>
      field.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [fields, search]);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">
          Custom Fields
        </h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={handleFetchLead}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition"
          >
            Fetch Lead
          </button>

          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Save
          </button>
        </div>

        {leadLoading && (
          <p className="text-gray-600 mb-4">Loading lead data...</p>
        )}

        {leadData && (
          <div className="mt-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Lead Data
            </h2>

            <div className="h-64 overflow-y-auto border rounded-xl bg-gray-50 p-4 space-y-3">
              {Object.entries(leadData).map(([key, value]) => {
                const displayValue = Array.isArray(value)
                  ? value.join(", ")
                  : value === null
                  ? "null"
                  : String(value);

                return (
                  <div
                    key={key}
                    className="bg-white p-3 rounded-md border flex justify-between items-start gap-4"
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        {key}
                      </p>
                      <p className="text-sm text-gray-800 break-all">
                        {displayValue}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(displayValue)
                      }
                      className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search fields..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border border-gray-300 bg-gray-50 text-gray-800 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {loading && (
          <p className="text-gray-600 mb-4">Loading fields...</p>
        )}

        <div className="h-96 overflow-y-auto space-y-4 pr-2">
          {filteredFields.map((field, index) => {
            const fieldIdentifier = getFieldIdentifier(field);

            return (
              <div
                key={fieldIdentifier || index}
                className="bg-gray-50 border border-gray-200 p-4 rounded-xl"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.name}
                </label>

                <input
                  type="text"
                  placeholder={`Enter ${field.name}`}
                  value={formData[fieldIdentifier] || ""}
                  onChange={(event) =>
                    handleChange(field, event.target.value)
                  }
                  className="w-full border border-gray-300 text-gray-800 bg-white px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

