import { useSelector, useDispatch } from 'react-redux'
import { X, Users, UserPlus, Shield, ShieldCheck, Eye } from 'lucide-react'
import { selectMembers, selectPresence } from '../../store/boardSlice'
import { closeTeamModal, openInviteModal } from '../../store/uiSlice'
import Avatar from '../ui/Avatar'

const ROLE_BADGES = {
  owner: { label: 'Owner', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  admin: { label: 'Admin', color: 'bg-teal-50 text-brand-teal border-teal-200' },
  member: { label: 'Member', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export default function TeamModal() {
  const dispatch = useDispatch()
  const members = useSelector(selectMembers)
  const presence = useSelector(selectPresence)

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeTeamModal())}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-brand-teal">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Team Members</h2>
                <p className="text-xs text-gray-500">{members.length} collaborators on this board</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(closeTeamModal())}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="py-4 space-y-3 max-h-80 overflow-y-auto">
            {members.map(m => {
              const u = m.user || m
              const isOnline = presence.includes(u._id?.toString() || u.id?.toString())
              const roleBadge = ROLE_BADGES[m.role] || ROLE_BADGES.member

              return (
                <div key={u._id || u.id || u.email} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar user={u} size="md" />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => {
                dispatch(closeTeamModal())
                dispatch(openInviteModal())
              }}
              className="btn-primary flex items-center gap-1.5 text-sm w-full justify-center"
            >
              <UserPlus size={16} /> Invite New Member
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
