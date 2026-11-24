import { useState } from 'react'
import { UserPlus, Zap } from 'lucide-react'

import BackButton from './BackButton'

export default function RegisterPage({ onLogin, onRegisterSuccess, onBack }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    // Basic check before even hitting the backend — matches the backend's own rule
    // (schemas/auth.py requires the password to be at least 8 characters)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      // >>> ADD BACKEND API URL HERE <
      // Confirm the exact host/port with your teammate — this assumes the backend
      // runs on localhost:8000, which is FastAPI/uvicorn's default.
      // This endpoint takes plain JSON (unlike /auth/login, which needs form data).
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        // The backend sends back a "detail" field on errors (e.g. "email already registered")
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Registration failed')
      }

      // On success the backend returns the created user's info (id, name, email, created_at) —
      // we don't need to store any of that here, we just move on to the login screen
      onRegisterSuccess?.()
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9" aria-labelledby="register-title">
          <BackButton onBack={onBack} />
          {/* Header */}
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Zap aria-hidden="true" className="size-6" />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Urban demand intelligence</p>
            <h1 id="register-title" className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Start forecasting demand with Urban Energy Predictor.</p>
          </div>

          {/* Register form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">
              {/* Name field — backend requires 1-100 characters */}
              <div>
                <label htmlFor="register-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Name</label>
                <input id="register-name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
              {/* Email field — backend validates this is a real email format */}
              <div>
                <label htmlFor="register-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</label>
                <input id="register-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
              {/* Password field — backend requires at least 8 characters */}
              <div>
                <label htmlFor="register-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Password</label>
                <input id="register-password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-70">
              {loading ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <UserPlus aria-hidden="true" className="size-4" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            {/* Error message — shows backend validation errors too, like "email already registered" */}
            <div className="min-h-6 pt-3" aria-live="polite">{error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}</div>
          </form>

          {/* Link back to login for people who already registered */}
          <p className="mt-3 text-center text-xs text-muted-foreground">Already have an account? <button type="button" onClick={onLogin} className="font-semibold text-primary underline-offset-4 transition hover:underline">Log in</button></p>
        </section>
      </div>
    </main>
  )
}