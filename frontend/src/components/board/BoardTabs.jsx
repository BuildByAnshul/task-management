import { useDispatch, useSelector } from 'react-redux'
import { BarChart2, List, Layout, Calendar, MessageSquare } from 'lucide-react'
import { setActiveTab, selectActiveTab } from '../../store/boardSlice'

const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart2 },
  { key: 'list', label: 'List', icon: List },
  { key: 'board', label: 'Board', icon: Layout },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
]

export default function BoardTabs() {
  const dispatch = useDispatch()
  const activeTab = useSelector(selectActiveTab)

  return (
    <div className="px-4 sm:px-6 pb-2 overflow-x-auto no-scrollbar">
      <div className="inline-flex items-center gap-1 bg-white/50 rounded-full p-1 min-w-max">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => dispatch(setActiveTab(key))}
            className={`tab-btn flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm ${
              activeTab === key ? 'active' : ''
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
