"use client";

import { useEffect, useState } from "react";
import { leadshubApi } from "../api/leadshub.api";

interface ActionEventType {
  id: string;
  label: string;
  description?: string;
}

export function useActionEventTypes(isTrigger?: boolean) {
  const [events, setEvents] = useState<ActionEventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const fetcher =
      isTrigger === true
        ? leadshubApi.getTriggers
        : isTrigger === false
        ? leadshubApi.getActions
        : leadshubApi.getActionEventTypes;

    fetcher()
      .then((data) =>
        setEvents(
          data.map((item) => ({
            id: item.action_key,
            label: item.label,
            description: item.description,
          }))
        )
      )
      .finally(() => setIsLoading(false));
  }, [isTrigger]);

  return { events, isLoading };
}
