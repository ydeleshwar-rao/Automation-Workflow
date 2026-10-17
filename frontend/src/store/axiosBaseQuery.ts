import type { BaseQueryFn } from "@reduxjs/toolkit/query"
import { isAxiosError } from "axios"
import axiosInstance from "../services/apiClient"

export interface AxiosBaseQueryArgs {
  url: string
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  data?: unknown
  params?: unknown
  headers?: Record<string, string>
}

export interface AxiosBaseQueryError {
  status?: number
  data?: unknown
}

/** RTK Query base query that sends every request through the shared axios client (cookies + 401 refresh). */
export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> =>
  async ({ url, method = "GET", data, params, headers }) => {
    try {
      const result = await axiosInstance({
        url,
        method,
        data,
        params,
        ...(headers ? { headers } : {}),
      })

      return { data: result.data }
    } catch (error) {
      if (isAxiosError(error)) {
        return { error: { status: error.response?.status, data: error.response?.data } }
      }
      return { error: { data: error instanceof Error ? error.message : String(error) } }
    }
  }
