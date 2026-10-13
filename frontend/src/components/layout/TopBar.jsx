import { useRef, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Bell, ChevronDown, LogOut, User, CheckCircle2, MessageSquare, Clock, X, ArrowRight, Layout } from 'lucide-react'
import { selectUser, clearCredentials } from '../../store/authSlice'
import { selectFilters, setFilters, selectTasksById } from '../../store/boardSlice'
import { openTaskModal, openProfileModal } from '../../store/uiSlice'
import { disconnectSocket } from '../../lib/socket'
import api from '../../lib/api'
import Avatar from '../ui/Avatar'
import PriorityChip from '../ui/PriorityChip'
import toast from 'react-hot-toast'

export default function TopBar() {
  const user = useSelector(selectUser)
  const filters = useSelector(selectFilters)
  const tasksById = useSelector(selectTasksById)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Task Created',
      desc: 'New task "Build Header Navigation" added to To Do',
      time: 'Just now',
      unread: true,
      type: 'task',
    },
    {
      id: 2,
      title: 'Workspace Active',
      desc: 'Real-time collaborative sync is connected',
      time: '15m ago',
      unread: true,
      type: 'system',
    },
    {
      id: 3,
      title: 'Welcome to NovaBoard',
      desc: 'Collaborate with your team members in real time',
      time: '1h ago',
      unread: false,
      type: 'welcome',
    },
  ])

  const searchRef = useRef(null)
  const searchContainerRef = useRef(null)
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)

  // Fetch all boards for global search
  const { data: boardsData } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await api.get('/boards')
      return data.data.boards || []
    },
  })
  const boards = boardsData || []

  const searchQuery = filters?.search || ''

  // Filter matching boards
  const matchingBoards = searchQuery.trim()
    ? boards.filter(b =>
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Filter matching tasks from current board
  const allTasks = Object.values(tasksById || {})
  const matchingTasks = searchQuery.trim()
    ? allTasks.filter(t =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // ⌘S / Ctrl+S focus search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchFocused(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    dispatch(clearCredentials())
    disconnectSocket()
    navigate('/login')
    toast.success('Logged out')
  }

  const unreadCount = notifications.filter(n => n.unread).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
    toast.success('All notifications marked as read')
  }

  const handleSearchChange = (e) => {
    dispatch(setFilters({ search: e.target.value }))
    if (!searchFocused) setSearchFocused(true)
  }

  const clearSearch = () => {
    dispatch(setFilters({ search: '' }))
    searchRef.current?.focus()
  }

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between relative z-30 gap-2">
      {/* Search Input & Live Results Dropdown */}
      <div className="relative" ref={searchContainerRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search boards or tasks…"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onChange={handleSearchChange}
            className="pill-input pl-9 pr-10 sm:pr-16 w-36 sm:w-56 md:w-72 text-sm transition-all focus:w-48 sm:focus:w-80"
          />
          {searchQuery ? (
            <button
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
              ⌘S
            </span>
          )}
        </div>

        {/* Live Search Results Popover (Boards & Tasks) */}
        {searchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-2 z-50 animate-scale-in">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold uppercase tracking-wider">Search Results</span>
              <span>{matchingBoards.length + matchingTasks.length} found</span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Boards Section */}
              {matchingBoards.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layout size={12} className="text-brand-teal" /> Boards ({matchingBoards.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {matchingBoards.map(board => (
                      <div
                        key={board._id}
                        onClick={() => {
                          setSearchFocused(false)
                          dispatch(setFilters({ search: '' }))
                          navigate(`/boards/${board._id}`)
                        }}
                        className="p-3 hover:bg-teal-50/50 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center flex-shrink-0 group-hover:bg-brand-teal group-hover:text-white transition-colors">
                            <Layout size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-teal transition-colors">
                              {board.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {board.clientName ? `Client: ${board.clientName}` : `${board.members?.length || 1} members`}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {matchingTasks.length > 0 && (
                <div>
                  <div className={`px-4 py-1.5 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between ${
                    matchingBoards.length > 0 ? 'border-t border-gray-100' : ''
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-amber-500" /> Tasks ({matchingTasks.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {matchingTasks.map(task => (
                      <div
                        key={task._id}
                        onClick={() => {
                          setSearchFocused(false)
                          dispatch(openTaskModal({ taskId: task._id }))
                        }}
                        className="p-3 hover:bg-teal-50/40 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-teal transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <PriorityChip priority={task.priority} />
                            <span className="text-[11px] font-medium text-gray-400 capitalize">
                              {task.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {matchingBoards.length === 0 && matchingTasks.length === 0 && (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-xs">No boards or tasks matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right side: Notifications & User */}
      <div className="flex items-center gap-3">
        {/* Notification bell & dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            className="relative w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow-sm hover:bg-white transition-all cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setNotifOpen(prev => !prev)
              setDropdownOpen(false)
            }}
            title="Notifications"
          >
            <Bell size={17} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-teal rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-3 z-50 animate-scale-in"
            >
              <div className="px-4 pb-2.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-teal-50 text-brand-teal text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-brand-teal font-semibold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item))}
                      className={`p-3.5 hover:bg-gray-50/80 cursor-pointer transition-colors flex gap-3 items-start ${
                        n.unread ? 'bg-teal-50/20' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        n.unread ? 'bg-teal-50 text-brand-teal' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {n.type === 'task' ? <CheckCircle2 size={16} /> : n.type === 'welcome' ? <MessageSquare size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-bold text-gray-800 truncate">{n.title}</p>
                          <span className="text-[10px] text-gray-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{n.desc}</p>
                      </div>
                      {n.unread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400">
                    <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen(prev => !prev)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 bg-white/80 hover:bg-white rounded-full pl-2 pr-3 py-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Avatar user={user} size="sm" />
            <span className="text-sm font-semibold text-gray-800 hidden sm:block">
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-2 z-50 animate-scale-in"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  dispatch(openProfileModal())
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <User size={15} /> Edit Profile & Credentials
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
