export default function BoardSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="skeleton h-8 w-64 rounded-xl mb-2" />
        <div className="skeleton h-4 w-96 rounded-lg" />
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      {/* Toolbar skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="skeleton h-9 w-40 rounded-full" />
        <div className="skeleton h-9 w-32 rounded-full" />
        <div className="skeleton h-9 w-24 rounded-full" />
        <div className="skeleton h-9 w-32 rounded-full ml-auto" />
      </div>
      {/* Columns skeleton */}
      <div className="flex gap-4">
        {[1,2,3,4].map(col => (
          <div key={col} className="flex-shrink-0 w-72 bg-gray-100 rounded-3xl p-4">
            <div className="skeleton h-5 w-24 rounded-lg mb-4" />
            {[1,2,3].map(card => (
              <div key={card} className="skeleton h-36 rounded-2xl mb-3" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
