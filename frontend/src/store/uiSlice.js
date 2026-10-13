import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarOpen: true,
  taskModalOpen: false,
  taskModalId: null,   // null = create new
  taskModalStatus: 'todo',
  inviteModalOpen: false,
  settingsModalOpen: false,
  activityPanelOpen: false,
  filterPopoverOpen: false,
  myTasksModalOpen: false,
  teamModalOpen: false,
  calendarModalOpen: false,
  helpModalOpen: false,
  profileModalOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload },
    openTaskModal: (state, action) => {
      state.taskModalOpen = true
      state.taskModalId = action.payload?.taskId || null
      state.taskModalStatus = action.payload?.status || 'todo'
    },
    closeTaskModal: (state) => {
      state.taskModalOpen = false
      state.taskModalId = null
    },
    openInviteModal: (state) => { state.inviteModalOpen = true },
    closeInviteModal: (state) => { state.inviteModalOpen = false },
    openSettingsModal: (state) => { state.settingsModalOpen = true },
    closeSettingsModal: (state) => { state.settingsModalOpen = false },
    openMyTasksModal: (state) => { state.myTasksModalOpen = true },
    closeMyTasksModal: (state) => { state.myTasksModalOpen = false },
    openTeamModal: (state) => { state.teamModalOpen = true },
    closeTeamModal: (state) => { state.teamModalOpen = false },
    openCalendarModal: (state) => { state.calendarModalOpen = true },
    closeCalendarModal: (state) => { state.calendarModalOpen = false },
    openHelpModal: (state) => { state.helpModalOpen = true },
    closeHelpModal: (state) => { state.helpModalOpen = false },
    openProfileModal: (state) => { state.profileModalOpen = true },
    closeProfileModal: (state) => { state.profileModalOpen = false },
    toggleActivityPanel: (state) => { state.activityPanelOpen = !state.activityPanelOpen },
    setFilterPopover: (state, action) => { state.filterPopoverOpen = action.payload },
  },
})

export const {
  toggleSidebar, setSidebarOpen,
  openTaskModal, closeTaskModal,
  openInviteModal, closeInviteModal,
  openSettingsModal, closeSettingsModal,
  openMyTasksModal, closeMyTasksModal,
  openTeamModal, closeTeamModal,
  openCalendarModal, closeCalendarModal,
  openHelpModal, closeHelpModal,
  openProfileModal, closeProfileModal,
  toggleActivityPanel, setFilterPopover,
} = uiSlice.actions

export const selectSidebarOpen = (state) => state.ui.sidebarOpen
export const selectTaskModal = (state) => ({ open: state.ui.taskModalOpen, taskId: state.ui.taskModalId, status: state.ui.taskModalStatus })
export const selectInviteModalOpen = (state) => state.ui.inviteModalOpen
export const selectSettingsModalOpen = (state) => state.ui.settingsModalOpen
export const selectMyTasksOpen = (state) => state.ui.myTasksModalOpen
export const selectTeamModalOpen = (state) => state.ui.teamModalOpen
export const selectCalendarModalOpen = (state) => state.ui.calendarModalOpen
export const selectHelpModalOpen = (state) => state.ui.helpModalOpen
export const selectProfileModalOpen = (state) => state.ui.profileModalOpen
export const selectActivityPanelOpen = (state) => state.ui.activityPanelOpen

export default uiSlice.reducer
