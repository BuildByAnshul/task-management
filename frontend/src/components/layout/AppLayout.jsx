import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { selectConnectionStatus } from '../../store/boardSlice'
import {
  selectSidebarOpen,
  selectMyTasksOpen,
  selectTeamModalOpen,
  selectCalendarModalOpen,
  selectSettingsModalOpen,
  selectHelpModalOpen,
  selectProfileModalOpen,
} from '../../store/uiSlice'
import { WifiOff } from 'lucide-react'
import MyTasksModal from '../modals/MyTasksModal'
import TeamModal from '../modals/TeamModal'
import CalendarModal from '../modals/CalendarModal'
import SettingsModal from '../modals/SettingsModal'
import HelpModal from '../modals/HelpModal'
import ProfileModal from '../modals/ProfileModal'

export default function AppLayout() {
  const connectionStatus = useSelector(selectConnectionStatus)
  const sidebarOpen = useSelector(selectSidebarOpen)
  const myTasksOpen = useSelector(selectMyTasksOpen)
  const teamOpen = useSelector(selectTeamModalOpen)
  const calendarOpen = useSelector(selectCalendarModalOpen)
  const settingsOpen = useSelector(selectSettingsModalOpen)
  const helpOpen = useSelector(selectHelpModalOpen)
  const profileOpen = useSelector(selectProfileModalOpen)

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Reconnecting banner */}
      {connectionStatus === 'reconnecting' && (
        <div className="reconnect-banner">
          <WifiOff size={14} />
          Reconnecting to server...
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-20 ml-0 pb-20 md:pb-0">
        <TopBar />
        <main className="flex-1 p-2 sm:p-4 pt-1 sm:pt-2">
          <div className="bg-brand-panel rounded-2xl sm:rounded-3xl min-h-[calc(100vh-80px)] shadow-panel overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Modals for Sidebar and App Actions */}
      {myTasksOpen && <MyTasksModal />}
      {teamOpen && <TeamModal />}
      {calendarOpen && <CalendarModal />}
      {settingsOpen && <SettingsModal />}
      {helpOpen && <HelpModal />}
      {profileOpen && <ProfileModal />}
    </div>
  )
}
