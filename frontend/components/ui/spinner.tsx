import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const

type SpinnerSize = keyof typeof sizeMap

/**
 * Branded ring spinner. Uses the primary brand color via the `.aletis-spinner`
 * utility (defined in globals.css) so it adapts to light/dark and respects
 * prefers-reduced-motion.
 */
function Spinner({
  size = 'md',
  className,
  ...props
}: React.ComponentProps<'div'> & { size?: SpinnerSize }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('aletis-spinner', sizeMap[size], className)}
      {...props}
    />
  )
}

/**
 * Centered full-area loading state — a spinner with an optional label.
 * Drop-in replacement for bare "Loading..." text blocks.
 */
function PageLoader({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground',
        className,
      )}
    >
      <Spinner size="lg" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}

export { Spinner, PageLoader }
