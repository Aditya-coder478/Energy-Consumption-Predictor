import { useEffect, useState } from 'react'
import { ArrowRight, Zap } from 'lucide-react'

// Static stats shown at the bottom of the hero section — hardcoded, not from an API
const inputSignals = [
  { value: '3', label: 'City tiers', detail: 'Tier-1 to Tier-3 urban classification' },
  { value: '3', label: 'Seasons modeled', detail: 'Winter, Summer, and Rainy patterns' },
  { value: '10+', label: 'Input signals', detail: 'Demographics, climate, and land use' },
]

// Static "how it works" steps shown near the bottom of the page
const steps = [
  { step: '01', label: 'Describe the city', description: 'Tier, population, climate, and how its load splits across residential, commercial, and industrial use.' },
  { step: '02', label: 'Model finds similar cities', description: 'Nearest-neighbor search matches your inputs against cities with a known consumption history.' },
  { step: '03', label: 'Read the forecast', description: 'See the predicted demand next to historical consumption for context.' },
]

// Purely decorative animated bar chart — fake data, just for visual flair on the landing page.
// No backend involved here at all.
function LoadEqualizer() {
  const [tick, setTick] = useState(0)

  // Increases "tick" every 1.4s to jiggle the bar heights, unless the user prefers reduced motion
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1400)
    return () => window.clearInterval(id)
  }, [])

  // Three fake load categories with made-up starting bar heights
  const groups = [
    { label: 'Residential', opacity: 'bg-primary', heights: [42, 68, 54, 80, 46] },
    { label: 'Commercial', opacity: 'bg-primary/60', heights: [30, 50, 66, 38, 58] },
    { label: 'Industrial', opacity: 'bg-primary/30', heights: [55, 34, 44, 60, 40] },
  ]

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">Simulated load mix</p>
      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{group.label}</span>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {group.heights.map((h, i) => {
                // Wiggles each bar's height slightly based on the current "tick" so it looks alive
                const jitter = ((tick + i) % 5) * 3
                const height = Math.min(100, h + jitter)
                return (
                  <div
                    key={i}
                    className={`w-full rounded-t-sm transition-all duration-[1400ms] ease-in-out ${group.opacity}`}
                    style={{ height: `${height}%` }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main landing/intro page — onGetStarted is called when the user clicks the button,
// which App.jsx uses to move to the Login page. No API calls happen on this page.
export default function LandingPage({ onGetStarted }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-6xl">
        {/* Top logo/brand row */}
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground"><Zap className="size-3.5" /></span>
          Urban Energy Predictor
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            {/* Main headline and description */}
            <h1 className="max-w-xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Predict a city's energy load before it has a history.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground">
              Fast-growing urban areas rarely have years of consumption records to forecast from. This model substitutes population, climate, and land-use signals for that missing history.
            </p>

            {/* Clicking this button moves the user forward (to Login, then Predictor) — set up in App.jsx */}
            <button
              type="button"
              onClick={onGetStarted}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              Run a forecast
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>

            {/* Row of stat callouts (3 city tiers, 3 seasons, 10+ signals) */}
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6">
              {inputSignals.map((item) => (
                <div key={item.label} className="min-w-[9rem]">
                  <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-0.5 text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The animated decorative chart defined above */}
          <LoadEqualizer />
        </div>

        {/* "How it works" 3-step explainer section */}
        <section className="mt-14 rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10" aria-label="How the forecast is generated">
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map(({ step, label, description }) => (
              <div key={step}>
                <span className="text-sm font-semibold text-primary">{step}</span>
                <h3 className="mt-2 text-sm font-semibold">{label}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}