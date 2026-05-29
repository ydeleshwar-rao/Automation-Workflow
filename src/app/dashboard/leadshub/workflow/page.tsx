"use client";

import { useEffect, useState, useMemo } from "react";

interface CustomField {
  id?: string;
  key: string;
  name: string;
  dataType: string;
  standard?: boolean;
  model: string;
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const [leadData, setLeadData] = useState<Record<string, any> | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);

  useEffect(() => {
    async function fetchFields() {
      try {
        setLoading(true);

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(
          `${baseUrl}/customFields/all/6QckpJiSCvacZ7Vcnkxk`
        );
        const result = await res.json();

        if (result.success) {
          const allFields = [
            ...(result.data.contact || []),
            ...(result.data.opportunity || []),
            ...(result.data.business || []),
          ];

          setFields(allFields);
        }
      } catch (error) {
        console.error("Error fetching fields", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFields();
  }, []);

  const fetchLeadInput = async () => {
    try {
      setLeadLoading(true);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(
        `${baseUrl}/webhooks/getleadinput/6QckpJiSCvacZ7Vcnkxk`
      );

      const result = await res.json();

      if (result?.data?.payload) {
        setLeadData(result.data.payload);
      } else {
        setLeadData(null);
      }
    } catch (error) {
      console.error("Error fetching lead input", error);
    } finally {
      setLeadLoading(false);
    }
  };

  const handleChange = (field: CustomField, value: any) => {
    const fieldIdentifier = field.id || field.key;

    setFormData((prev) => ({
      ...prev,
      [fieldIdentifier]: value,
    }));
  };

  const getFilledFields = () => {
    const filled: Record<string, any> = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        filled[key] = value;
      }
    });

    return filled;
  };

  const handleSave = async () => {
    const filledData = getFilledFields();

    if (Object.keys(filledData).length === 0) {
      alert("No filled fields to save");
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(
        `${baseUrl}/contacts/createlead/6QckpJiSCvacZ7Vcnkxk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(filledData),
        }
      );

      const result = await res.json();

      console.log("Saved Data:", result);
      alert("Data Saved Successfully ✅");
    } catch (error) {
      console.error("Save Error:", error);
      alert("Error saving data");
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
            onClick={fetchLeadInput}
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 bg-gray-50 text-gray-800 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {loading && (
          <p className="text-gray-600 mb-4">Loading fields...</p>
        )}

        <div className="h-96 overflow-y-auto space-y-4 pr-2">
          {filteredFields.map((field, index) => {
            const fieldIdentifier = field.id || field.key;

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
                  onChange={(e) =>
                    handleChange(field, e.target.value)
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

