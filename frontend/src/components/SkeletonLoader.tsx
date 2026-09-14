export default function SkeletonLoader({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div data-testid="skeleton-loader" className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded animate-pulse ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
          style={{ height: i === 0 ? '1.25rem' : '1rem' }}
        />
      ))}
    </div>
  )
}
