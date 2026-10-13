export default function PriorityChip({ priority }) {
  const config = {
    low: { label: 'Low', className: 'bg-teal-50 text-teal-700' },
    medium: { label: 'Medium', className: 'bg-yellow-50 text-yellow-700' },
    high: { label: 'High', className: 'bg-red-50 text-red-500' },
  }
  const { label, className } = config[priority] || config.medium

  return (
    <span className={`chip ${className}`}>
      {label}
    </span>
  )
}
