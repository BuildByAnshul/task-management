import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import boardReducer from './boardSlice'
import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    board: boardReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})
