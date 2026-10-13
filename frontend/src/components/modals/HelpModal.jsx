import { useDispatch } from 'react-redux'
import { X, HelpCircle, Keyboard, Zap, Users, CheckCircle, Move } from 'lucide-react'
import { closeHelpModal } from '../../store/uiSlice'

export default function HelpModal() {
  const dispatch = useDispatch()

  const shortcuts = [
    { key: '⌘S / Ctrl+S', desc: 'Focus global search input' },
    { key: 'Esc', desc: 'Close any active modal or panel' },
    { key: 'Drag & Drop', desc: 'Reorder cards and move between stages' },
    { key: 'Live Typing', desc: 'Real-time indication when others edit tasks' },
  ]

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Sync',
      desc: 'Socket.io synchronizes all task creation, drag & drop moves, and member presence in real time across all open tabs.',
    },
    {
      icon: Users,
      title: 'Collaboration',
      desc: 'Invite team members via email or shareable invite links with Role-Based Access Control (Owner, Admin, Member, Viewer).',
    },
    {
      icon: CheckCircle,
      title: 'Subtasks & Progress',
      desc: 'Tasks automatically calculate completion percentages based on checklist subtasks.',
    },
  ]

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeHelpModal())}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <HelpCircle size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Help & Shortcuts</h2>
                <p className="text-xs text-gray-500">NovaBoard Quick Guide</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(closeHelpModal())}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Keyboard size={13} /> Keyboard Shortcuts
              </p>
              <div className="space-y-1.5">
                {shortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 text-xs">
                    <span className="text-gray-600 font-medium">{s.desc}</span>
                    <kbd className="bg-white border border-gray-200 px-2 py-0.5 rounded font-mono font-bold text-gray-800 shadow-2xs">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Core Features</p>
              <div className="space-y-2.5">
                {features.map(f => {
                  const Icon = f.icon
                  return (
                    <div key={f.title} className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100 flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center flex-shrink-0">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{f.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => dispatch(closeHelpModal())}
              className="btn-primary text-xs w-full justify-center"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
