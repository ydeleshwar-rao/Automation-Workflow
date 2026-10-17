import { configureStore } from "@reduxjs/toolkit"
import rootReducer from "./rootReducer"
import { baseApi } from "./baseApi"
import { aiHarnessApi } from "../components/ai-workflow/aiHarnessApi"

// ── Store ─────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      baseApi.middleware,
      // Separate service (AI harness) with its own base URL and headers
      aiHarnessApi.middleware,
    ),
  devTools: process.env.NODE_ENV !== "production",
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
