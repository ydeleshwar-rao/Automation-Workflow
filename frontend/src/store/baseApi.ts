import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "./axiosBaseQuery";

/**
 * The single RTK Query API for our backend.
 *
 * Each feature adds its own endpoints and tag types:
 *   baseApi.enhanceEndpoints({ addTagTypes: [...] }).injectEndpoints({ endpoints: ... })
 *
 * One API means one reducer, one middleware and one shared tag space, so a mutation
 * in one feature (e.g. assigning a tag) can invalidate data owned by another
 * (e.g. the workflow list) without manual refetches.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  endpoints: () => ({}),
});
