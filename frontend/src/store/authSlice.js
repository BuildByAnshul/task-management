import { createSlice } from '@reduxjs/toolkit'

const stored = (() => {
  try { return JSON.parse(localStorage.getItem('novaboard_auth') || 'null') } catch { return null }
})()

const initialState = {
  user: stored?.user || null,
  accessToken: stored?.accessToken || null,
  isAuthenticated: !!stored?.user,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload
      state.user = user
      state.accessToken = accessToken
      state.isAuthenticated = true
      localStorage.setItem('novaboard_auth', JSON.stringify({ user, accessToken }))
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem('novaboard_auth', JSON.stringify({ user: state.user, accessToken: state.accessToken }))
    },
    clearCredentials: (state) => {
      state.user = null
      state.accessToken = null
      state.isAuthenticated = false
      localStorage.removeItem('novaboard_auth')
    },
    refreshToken: (state, action) => {
      state.accessToken = action.payload
      const stored = JSON.parse(localStorage.getItem('novaboard_auth') || '{}')
      localStorage.setItem('novaboard_auth', JSON.stringify({ ...stored, accessToken: action.payload }))
    },
  },
})

export const { setCredentials, updateUser, clearCredentials, refreshToken } = authSlice.actions
export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAccessToken = (state) => state.auth.accessToken
export default authSlice.reducer
