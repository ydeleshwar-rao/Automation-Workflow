import { BaseQueryFn } from "@reduxjs/toolkit/query"
import axiosInstance from "../services/apiClient"


export const axiosBaseQuery =
  (): BaseQueryFn<
    {
      url: string
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
      data?: unknown
      params?: unknown
      headers?: Record<string, string>
    },
    unknown,
    unknown
  > =>
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
    } catch (axiosError: any) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        },
      }
    }
  }