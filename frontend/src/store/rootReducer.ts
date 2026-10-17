import { combineReducers } from "@reduxjs/toolkit"
import accessReducer from "./accessSlice"
import appStatusReducer from "./appStatusSlice"
import { baseApi } from "./baseApi"
import { aiHarnessApi } from "@/src/components/ai-workflow/aiHarnessApi"

const rootReducer = combineReducers({
  access: accessReducer,
  appStatus: appStatusReducer,
  [baseApi.reducerPath]: baseApi.reducer,
  [aiHarnessApi.reducerPath]: aiHarnessApi.reducer,
})

export default rootReducer
