import { useSelector, useDispatch } from 'react-redux'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { selectTasksById, selectMembers } from '../../store/boardSlice'
import { openTaskModal } from '../../store/uiSlice'
import Avatar from '../ui/Avatar'
import PriorityChip from '../ui/PriorityChip'
import { CheckCircle2, Clock, AlertTriangle, ListTodo, ArrowUpRight } from 'lucide-react'

const STATUS_COLORS = {
  todo: '#64748B',
  in_progress: '#0D9488',
  review: '#F59E0B',
  done: '#10B981',
}

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
}

export default function OverviewView() {
  const dispatch = useDispatch()
  const tasksById = useSelector(selectTasksById)
  const members = useSelector(selectMembers)
  const tasks = Object.values(tasksById)

  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const now = new Date()
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  // Status chart data
  const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 }
  tasks.forEach(t => {
    if (statusCounts[t.status] !== undefined) statusCounts[t.status]++
  })
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status],
    value: count,
    color: STATUS_COLORS[status],
  }))

  // Priority chart data
  const priorityCounts = { high: 0, medium: 0, low: 0 }
  tasks.forEach(t => {
    if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++
  })
  const priorityData = [
    { name: 'High', count: priorityCounts.high, color: PRIORITY_COLORS.high },
    { name: 'Medium', count: priorityCounts.medium, color: PRIORITY_COLORS.medium },
    { name: 'Low', count: priorityCounts.low, color: PRIORITY_COLORS.low },
  ]

  // Member workload data
  const memberWorkload = members.map(m => {
    const user = m.user || m
    const assignedTasks = tasks.filter(t =>
      t.assignedTo?.some(u => (u._id || u) === (user._id || user))
    )
    return {
      user,
      total: assignedTasks.length,
      done: assignedTasks.filter(t => t.status === 'done').length,
    }
  })

  // Urgent tasks
  const urgentTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1
      if (b.priority === 'high' && a.priority !== 'high') return 1
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate) - new Date(b.dueDate)
    })
    .slice(0, 5)

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tasks</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-1">{total}</p>
            <p className="text-xs text-gray-400 mt-1">{completed} completed</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-brand-teal">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-1">{inProgress}</p>
            <p className="text-xs text-gray-400 mt-1">Active workflows</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completion Rate</p>
            <p className="text-3xl font-extrabold text-gray-800 mt-1">{completionRate}%</p>
            <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-brand-teal h-1.5 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue</p>
            <p className="text-3xl font-extrabold text-red-600 mt-1">{overdue}</p>
            <p className="text-xs text-gray-400 mt-1">Requires attention</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Task Status Distribution</h3>
            <span className="text-xs font-medium text-gray-400">{total} Total</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} tasks`, name]}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400">No tasks created yet</p>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-gray-100">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-600 font-medium">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Priority Breakdown</h3>
            <span className="text-xs font-medium text-gray-400">By Severity</span>
          </div>
          <div className="h-64">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(15,148,136,0.05)' }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">No tasks created yet</p>
              </div>
            )}
          </div>
          <div className="flex justify-around pt-4 border-t border-gray-100">
            {priorityData.map(p => (
              <div key={p.name} className="text-center">
                <p className="text-xs text-gray-500 font-medium">{p.name}</p>
                <p className="text-base font-bold text-gray-800">{p.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Row: Urgent Tasks & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Attention Tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Urgent & Upcoming</h3>
            <span className="text-xs font-medium text-gray-400">Next to tackle</span>
          </div>
          <div className="space-y-3">
            {urgentTasks.length > 0 ? (
              urgentTasks.map(t => (
                <div
                  key={t._id}
                  onClick={() => dispatch(openTaskModal({ taskId: t._id }))}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-teal transition-colors">
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <PriorityChip priority={t.priority} />
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-brand-teal transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 py-6 text-center">No pending tasks</p>
            )}
          </div>
        </div>

        {/* Team Workload */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Team Workload</h3>
            <span className="text-xs font-medium text-gray-400">{members.length} Members</span>
          </div>
          <div className="space-y-4">
            {memberWorkload.length > 0 ? (
              memberWorkload.map(({ user, total: userTotal, done: userDone }) => {
                const userRate = userTotal > 0 ? Math.round((userDone / userTotal) * 100) : 0
                return (
                  <div key={user._id || user.id || user.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <Avatar user={user} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-700">{userDone}/{userTotal}</span>
                        <span className="text-xs text-gray-400 ml-1">tasks</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-teal h-1.5 rounded-full transition-all"
                        style={{ width: `${userRate}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-400 py-6 text-center">No members found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
