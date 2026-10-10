"use client";

import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchAppStatus,
  selectAppStatusLoaded,
  selectAppStatusLoading,
  selectIsServiceM8Connected,
  selectServiceM8NeedsReauth,
} from "@/src/store/appStatusSlice";

export function useServiceM8Status() {
  const dispatch = useAppDispatch();
  const connected = useAppSelector(selectIsServiceM8Connected);
  const needsReauth = useAppSelector(selectServiceM8NeedsReauth);
  const isLoading = useAppSelector(selectAppStatusLoading);
  const hasLoadedOnce = useAppSelector(selectAppStatusLoaded);

  useEffect(() => {
    if (!hasLoadedOnce && !isLoading) {
      void dispatch(fetchAppStatus());
    }
  }, [dispatch, hasLoadedOnce, isLoading]);

  const refetch = useCallback(() => dispatch(fetchAppStatus()), [dispatch]);

  return { connected, needsReauth, isLoading: isLoading && !hasLoadedOnce, refetch };
}
