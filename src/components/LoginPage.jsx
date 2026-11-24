import { useState } from 'react'
import { LogIn, Zap } from 'lucide-react'

import BackButton from './BackButton'

export default function LoginPage({ onLoginSuccess, onRegister, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      // >>> ADD BACKEND API URL HERE <
      // IMPORTANT: this endpoint expects form-encoded data, NOT JSON, because the
      // backend uses FastAPI's OAuth2PasswordRequestForm. The field is called
      // "username" on the backend even though we're actually sending the email into it —
      // that's just what OAuth2PasswordRequestForm calls it, confirmed from auth.py:
      // "form_data.username holds the user's email."
      const body = new URLSearchParams()
      body.append('username', email)
      body.append('password', password)

      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      })

      if (!response.ok) {
        throw new Error('Incorrect email or password.')
      }

      // Backend returns { access_token: "...", token_type: "bearer" }
      const data = await response.json()

      // Save the token so the predictor page can attach it to its requests.
      // sessionStorage clears when the tab closes — fine for a demo, not for production.
      sessionStorage.setItem('accessToken', data.access_token)

      onLoginSuccess?.()
    } catch (err) {
      setError(err.message || 'Could not log in. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9" aria-labelledby="login-title">
          <BackButton onBack={onBack} />
          {/* Header */}
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Zap aria-hidden="true" className="size-6" />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Urban demand intelligence</p>
            <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Log in to continue to Urban Energy Predictor.</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">
              {/* Email field — backend calls this "username" internally, but it's really an email */}
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</label>
                <input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
              {/* Password field */}
              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
            </div>

            {/* Submit button, shows spinner while waiting on the backend */}
            <button type="submit" disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-70">
              {loading ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <LogIn aria-hidden="true" className="size-4" />}
              {loading ? 'Logging in…' : 'Log in'}
            </button>

            {/* Error message, only shows if login fails */}
            <div className="min-h-6 pt-3" aria-live="polite">{error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}</div>
          </form>

          {/* Link down to Register for people without an account yet */}
          <p className="mt-3 text-center text-xs text-muted-foreground">Don't have an account? <button type="button" onClick={onRegister} className="font-semibold text-primary underline-offset-4 transition hover:underline">Create one</button></p>
        </section>
      </div>
    </main>
  )
}