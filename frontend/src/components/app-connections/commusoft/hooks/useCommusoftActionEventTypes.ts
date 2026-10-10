"use client";

import { useEffect, useState } from "react";
import {
  getCommusoftTriggers,
  getCommusoftActions,
} from "@/src/components/work-flow/appEvents/commusoft/apiIntegrations/commusoftActionEvents";

interface ActionEventType {
  id: string;
  label: string;
  description?: string;
}

export function useCommusoftActionEventTypes(isTrigger: boolean) {
  const [events, setEvents] = useState<ActionEventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const fetcher = isTrigger ? getCommusoftTriggers : getCommusoftActions;
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
