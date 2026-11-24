import { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import BackButton from './BackButton'
import { ApiError, apiGet } from '../api'

const TEAL = '#0f766e'
const SLATE = '#94a3b8'
const AMBER = '#f59e0b'

// Backend values are in kWh; show them in millions so labels stay short.
const toMillions = (value) => `${(value / 1e6).toFixed(1)}M`

// One small bar chart per metric, because R² (0 to 1) and the error metrics (millions) can't share an axis.
const METRICS = [
  { key: 'mae', title: 'MAE', note: 'Mean absolute error, lower is better', fmt: (v) => `${toMillions(v)} kWh`, tick: toMillions },
  { key: 'rmse', title: 'RMSE', note: 'Root mean squared error, lower is better', fmt: (v) => `${toMillions(v)} kWh`, tick: toMillions },
  { key: 'r2', title: 'R²', note: 'Variance explained, higher is better', fmt: (v) => v.toFixed(4), tick: (v) => v.toFixed(2) },
  { key: 'mape', title: 'MAPE', note: 'Mean absolute percentage error, lower is better', fmt: (v) => `${v.toFixed(2)}%`, tick: (v) => `${v}%` },
]

function MetricChart({ metric, models }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{metric.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{metric.note}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={models}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis tickFormatter={metric.tick} fontSize={11} domain={metric.key === 'r2' ? [0, 1] : [0, 'auto']} />
          <Tooltip formatter={(v) => [metric.fmt(v), metric.title]} />
          <Bar dataKey={metric.key} radius={[4, 4, 0, 0]}>
            {models.map((m) => <Cell key={m.name} fill={m.is_best ? TEAL : SLATE} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mb-5 mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-primary">{value}</p>
    </div>
  )
}

export function AnalyticsPage({ onBack, onSessionExpired }) {
  const [summary, setSummary] = useState(null)
  const [models, setModels] = useState([])
  const [points, setPoints] = useState([])
  const [bins, setBins] = useState([])
  const [errorStats, setErrorStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiGet('/analytics/summary'),
      apiGet('/analytics/model-comparison'),
      apiGet('/analytics/actual-vs-predicted?limit=300'),
      apiGet('/analytics/error-distribution?bins=20'),
    ])
      .then(([s, m, p, e]) => {
        if (cancelled) return
        setSummary(s)
        setModels(m.models)
        setPoints(p.points)
        setBins(e.bins)
        setErrorStats(e)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) return onSessionExpired?.()
        setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the backend running?')
      })
    return () => { cancelled = true }
  }, [])

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <BackButton onBack={onBack} label="Back to predictor" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Model analytics</h1>
        <p className="mb-8 mt-3 max-w-xl text-sm leading-6 text-muted-foreground">How well the prediction model performs on the evaluation data. All consumption values are in kWh.</p>

        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
        {!error && !summary && <p className="text-sm text-muted-foreground">Loading charts…</p>}

        {summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Best model" value={summary.best_model} />
              <Stat label="Rows tested" value={summary.total_rows.toLocaleString()} />
              <Stat label="R²" value={summary.r2.toFixed(4)} />
              <Stat label="MAPE" value={`${summary.mape.toFixed(2)}%`} />
              <Stat label="MAE" value={`${toMillions(summary.mae)} kWh`} />
              <Stat label="RMSE" value={`${toMillions(summary.rmse)} kWh`} />
              <Stat label="Mean actual" value={`${toMillions(summary.mean_actual)} kWh`} />
              <Stat label="Mean predicted" value={`${toMillions(summary.mean_predicted)} kWh`} />
            </div>

            <Card title="Model comparison" subtitle="One chart per metric. The highlighted (dark) bar is the best model.">
              <div className="grid gap-8 md:grid-cols-2">
                {METRICS.map((metric) => <MetricChart key={metric.key} metric={metric} models={models} />)}
              </div>
            </Card>

            <Card title="Actual vs predicted" subtitle={`${points.length} evenly spaced rows out of ${summary.total_rows.toLocaleString()}`}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="index" fontSize={12} />
                  <YAxis tickFormatter={toMillions} fontSize={12} />
                  <Tooltip formatter={(v) => `${toMillions(v)} kWh`} labelFormatter={(i) => `Row ${i}`} />
                  <Legend />
                  <Line dataKey="actual" name="Actual" stroke={TEAL} dot={false} strokeWidth={2} />
                  <Line dataKey="predicted" name="Predicted" stroke={AMBER} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Error distribution"
              subtitle={errorStats ? `Error = actual minus predicted (positive means the model predicted too low). Mean ${toMillions(errorStats.mean_error)}, median ${toMillions(errorStats.median_error)}, std ${toMillions(errorStats.std_error)}, mean absolute ${toMillions(errorStats.mean_absolute_error)} kWh.` : ''}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bins}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} interval={1} angle={-30} textAnchor="end" height={70} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => [v, 'Rows']} />
                  <Bar dataKey="count" name="Rows" fill={TEAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
