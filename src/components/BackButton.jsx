import { ArrowLeft } from 'lucide-react'

// Small reusable back button used across Login, Register, and Predictor pages.
// Renders nothing if no onBack handler was passed in (so it's safe to reuse everywhere).
export default function BackButton({ onBack, label = 'Back' }) {
  if (!onBack) return null

  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Go back"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </button>
  )
}