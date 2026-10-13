const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getBgColor = (name) => {
  const colors = ['#0F9488', '#F472B6', '#FB923C', '#A78BFA', '#38BDF8', '#FBD157', '#10B981', '#6366F1']
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({ user, size = 'md', className = '', showOnline = false, isOnline = false }) {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  }

  const name = user?.name || user?.email || '?'
  const avatarUrl = user?.avatarUrl

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full border-2 border-white object-cover`}
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
        />
      ) : null}
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-white flex items-center justify-center font-bold text-white`}
        style={{
          backgroundColor: getBgColor(name),
          display: avatarUrl ? 'none' : 'flex',
        }}
      >
        {getInitials(name)}
      </div>
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`}
        />
      )}
    </div>
  )
}

export function AvatarGroup({ users = [], max = 3, size = 'sm', onlineIds = [] }) {
  const visible = users.slice(0, max)
  const rest = users.length - max

  return (
    <div className="flex items-center">
      {visible.map((user, i) => (
        <div key={user._id || i} className="-ml-2 first:ml-0" style={{ zIndex: visible.length - i }}>
          <Avatar
            user={user}
            size={size}
            showOnline={onlineIds.length > 0}
            isOnline={onlineIds.includes(user._id)}
          />
        </div>
      ))}
      {rest > 0 && (
        <div
          className={`-ml-2 ${size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs'} 
            rounded-full border-2 border-white bg-gray-200 flex items-center justify-center 
            font-semibold text-gray-600`}
        >
          +{rest}
        </div>
      )}
    </div>
  )
}
