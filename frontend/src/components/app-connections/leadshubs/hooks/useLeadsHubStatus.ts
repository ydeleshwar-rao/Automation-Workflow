"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchAppStatus,
  selectAppStatusLoaded,
  selectAppStatusLoading,
  selectIsLeadsHubConnected,
} from "@/src/store/appStatusSlice";

export function useLeadsHubStatus() {
  const dispatch = useAppDispatch();
  const connected = useAppSelector(selectIsLeadsHubConnected);
  const isLoading = useAppSelector(selectAppStatusLoading);
  const hasLoadedOnce = useAppSelector(selectAppStatusLoaded);

  useEffect(() => {
    if (!hasLoadedOnce && !isLoading) {
      void dispatch(fetchAppStatus());
    }
  }, [dispatch, hasLoadedOnce, isLoading]);

  const refetch = useCallback(() => dispatch(fetchAppStatus()), [dispatch]);

  return { connected, isLoading: isLoading && !hasLoadedOnce, refetch };
}
