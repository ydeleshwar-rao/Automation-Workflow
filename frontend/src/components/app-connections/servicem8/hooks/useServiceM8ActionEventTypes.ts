"use client";

import { useEffect, useState } from "react";
import {
  getServiceM8Triggers,
  getServiceM8Actions,
} from "@/src/components/work-flow/appEvents/serviceM8/apiIntegrations/sm8ActionEvents";

interface ActionEventType {
  id: string;
  label: string;
  description?: string;
}

export function useServiceM8ActionEventTypes(isTrigger: boolean) {
  const [events, setEvents] = useState<ActionEventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const fetcher = isTrigger ? getServiceM8Triggers : getServiceM8Actions;
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
