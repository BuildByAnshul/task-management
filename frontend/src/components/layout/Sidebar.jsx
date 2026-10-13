import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Home, LayoutDashboard, CheckSquare, Users, Calendar, Settings, HelpCircle, LogOut, Zap, User } from 'lucide-react'
import { clearCredentials } from '../../store/authSlice'
import {
  openMyTasksModal,
  openTeamModal,
  openCalendarModal,
  openSettingsModal,
  openHelpModal,
  openProfileModal,
} from '../../store/uiSlice'
import { disconnectSocket } from '../../lib/socket'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const NavItem = ({ icon: Icon, label, to, active, onClick }) => {
  if (to) {
    return (
      <NavLink
        to={to}
        end
        title={label}
        className={({ isActive }) =>
          `sidebar-icon ${(active !== undefined ? active : isActive) ? 'active' : ''}`
        }
      >
        <Icon size={20} />
      </NavLink>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`sidebar-icon ${active ? 'active' : ''}`}
    >
      <Icon size={20} />
    </button>
  )
}

export default function Sidebar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const isDashboard = location.pathname === '/'
  const isBoards = location.pathname.startsWith('/boards')

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    dispatch(clearCredentials())
    disconnectSocket()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <>
      {/* Desktop Floating Left Sidebar */}
      <div className="hidden md:flex fixed left-4 top-0 bottom-0 w-16 flex-col items-center py-4 z-40 gap-2">
        {/* Logo pill */}
        <div
          onClick={() => navigate('/')}
          className="w-12 h-12 bg-brand-teal rounded-2xl flex items-center justify-center shadow-lg mb-2 cursor-pointer hover:scale-105 transition-transform"
          title="NovaBoard Home"
        >
          <Zap size={22} className="text-white" />
        </div>

        {/* Nav pill */}
        <div className="flex flex-col items-center gap-1 bg-white/80 backdrop-blur-sm rounded-3xl px-2 py-3 shadow-card flex-1">
          <NavItem icon={Home} label="Home / Workspaces" to="/" active={isDashboard} />
          <NavItem icon={LayoutDashboard} label="Boards" to="/boards" active={isBoards} />
          <NavItem
            icon={CheckSquare}
            label="My Tasks"
            onClick={() => dispatch(openMyTasksModal())}
          />
          <NavItem
            icon={Users}
            label="Team"
            onClick={() => dispatch(openTeamModal())}
          />
          <NavItem
            icon={Calendar}
            label="Calendar & Deadlines"
            onClick={() => dispatch(openCalendarModal())}
          />
        </div>

        {/* Bottom pill */}
        <div className="flex flex-col items-center gap-1 bg-white/80 backdrop-blur-sm rounded-3xl px-2 py-3 shadow-card">
          <button
            className="sidebar-icon"
            title="My Profile"
            onClick={() => dispatch(openProfileModal())}
          >
            <User size={18} />
          </button>
          <button
            className="sidebar-icon"
            title="Settings"
            onClick={() => dispatch(openSettingsModal())}
          >
            <Settings size={18} />
          </button>
          <button
            className="sidebar-icon"
            title="Help & Shortcuts"
            onClick={() => dispatch(openHelpModal())}
          >
            <HelpCircle size={18} />
          </button>
          <button
            className="sidebar-icon hover:text-red-500 hover:bg-red-50"
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <div className="flex md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100/90 py-1.5 px-3 items-center justify-around">
        <NavItem icon={Home} label="Home" to="/" active={isDashboard} />
        <NavItem icon={LayoutDashboard} label="Boards" to="/boards" active={isBoards} />
        <NavItem
          icon={CheckSquare}
          label="My Tasks"
          onClick={() => dispatch(openMyTasksModal())}
        />
        <NavItem
          icon={Users}
          label="Team"
          onClick={() => dispatch(openTeamModal())}
        />
        <NavItem
          icon={Calendar}
          label="Calendar"
          onClick={() => dispatch(openCalendarModal())}
        />
        <NavItem
          icon={User}
          label="Profile"
          onClick={() => dispatch(openProfileModal())}
        />
      </div>
    </>
  )
}
