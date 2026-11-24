import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, Droplets, Gauge, MapPin, Thermometer, Wind } from 'lucide-react'

import BackButton from './BackButton'
import { ApiError, apiGet, apiPost } from '../api'

const fieldClass = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10'

// The model was trained on these 24 months only (2025-01 to 2026-12).
const MONTHS = Array.from({ length: 24 }, (_, i) => `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`)

function FieldLabel({ children, htmlFor }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</label>
}

function SelectField({ id, label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  )
}

function NumberField({ id, label, value, onChange, unit, min, max }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input id={id} type="number" min={min} max={max} step="any" value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass + (unit ? ' pr-10' : '')} />
        {unit && <span className="pointer-events-none absolute right-3 top-3 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

function MetricIcon({ type }) {
  const Icon = type === 'temperature' ? Thermometer : type === 'humidity' ? Droplets : Wind
  return <Icon aria-hidden="true" className="size-4 text-primary" />
}

export function PredictorPage({ onBack, onAnalytics }) {
  const [cityTier, setCityTier] = useState('Tier-1')
  const [incomeLevel, setIncomeLevel] = useState('Medium')
  const [month, setMonth] = useState('2026-06')
  const [season, setSeason] = useState('Summer')
  const [population, setPopulation] = useState('1381390')
  const [numberOfHouseholds, setNumberOfHouseholds] = useState('280450')
  const [commercialEstablishments, setCommercialEstablishments] = useState('9200')
  const [industrialEstablishments, setIndustrialEstablishments] = useState('106')
  const [temperature, setTemperature] = useState('31')
  const [humidity, setHumidity] = useState('68')
  const [acPenetration, setAcPenetration] = useState('19.5')

  const [predicted, setPredicted] = useState(null)
  const [baseline, setBaseline] = useState(0) // average real consumption from the backend's analytics data
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allFieldsFilled = [population, numberOfHouseholds, commercialEstablishments, industrialEstablishments, temperature, humidity, acPenetration].every((value) => value !== '')

  const hasBaseline = baseline > 0
  const predictionDelta = useMemo(() => (predicted === null || !hasBaseline ? 0 : Math.round(((predicted - baseline) / baseline) * 100)), [predicted, baseline, hasBaseline])

  // The comparison bar uses the dataset average from /analytics/summary instead of a hard-coded number.
  useEffect(() => {
    let cancelled = false
    apiGet('/analytics/summary')
      .then((summary) => { if (!cancelled) setBaseline(Math.round(summary.mean_actual)) })
      .catch((err) => { if (err instanceof ApiError && err.status === 401) onBack() })
    return () => { cancelled = true }
  }, [])

  const handlePredict = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiPost('/predict', {
        city_tier: cityTier,
        income_level: incomeLevel,
        month,
        season,
        population: Number(population),
        number_of_households: Number(numberOfHouseholds),
        commercial_establishments: Number(commercialEstablishments),
        industrial_establishments: Number(industrialEstablishments),
        temperature_c: Number(temperature),
        humidity_pct: Number(humidity),
        ac_penetration_pct: Number(acPenetration),
      })
      setPredicted(Math.round(data.prediction))
    } catch (err) {
      setPredicted(null)
      if (err instanceof ApiError && err.status === 401) {
        // Token missing or expired: send the user back to the start.
        onBack()
        return
      }
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <BackButton onBack={onBack} label="Log out" />
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"></div>
            <h1 className="max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Plan smarter for the city ahead.</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Estimate urban energy demand from population, climate, and cooling signals.</p>
          </div>
          <div className="flex items-center gap-3">
            {onAnalytics && <button type="button" onClick={onAnalytics} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"><BarChart3 className="size-4" /> Model analytics</button>}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm"><Activity className="size-4 text-primary" /> Model ready <span className="size-1.5 rounded-full bg-primary" /></div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="inputs-title">
            <div className="mb-7 flex items-start justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">System input</p><h2 id="inputs-title" className="text-xl font-semibold tracking-tight">Prediction inputs</h2></div><div className="rounded-xl bg-secondary p-2.5 text-primary"><Gauge className="size-5" /></div></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField id="cityTier" label="City tier" value={cityTier} onChange={setCityTier} options={['Tier-1', 'Tier-2', 'Tier-3']} />
              <SelectField id="incomeLevel" label="Income level" value={incomeLevel} onChange={setIncomeLevel} options={['Low', 'Medium', 'High']} />
              <SelectField id="month" label="Month" value={month} onChange={setMonth} options={MONTHS} />
              <SelectField id="season" label="Season" value={season} onChange={setSeason} options={['Winter', 'Summer', 'Monsoon']} />
              <NumberField id="population" label="Population" value={population} onChange={setPopulation} min="1" />
              <NumberField id="numberOfHouseholds" label="Number of households" value={numberOfHouseholds} onChange={setNumberOfHouseholds} min="1" />
              <NumberField id="commercialEstablishments" label="Commercial establishments" value={commercialEstablishments} onChange={setCommercialEstablishments} min="0" />
              <NumberField id="industrialEstablishments" label="Industrial establishments" value={industrialEstablishments} onChange={setIndustrialEstablishments} min="0" />
              <NumberField id="temperature" label="Temperature in Celsius" value={temperature} onChange={setTemperature} unit="°C" min="-50" max="60" />
              <NumberField id="humidity" label="Humidity percent" value={humidity} onChange={setHumidity} unit="%" min="0" max="100" />
              <NumberField id="acPenetration" label="AC penetration percent" value={acPenetration} onChange={setAcPenetration} unit="%" min="0" max="100" />
            </div>
            <button type="button" onClick={handlePredict} disabled={loading || !allFieldsFilled} className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <ArrowUpRight className="size-4" />}{loading ? 'Calculating prediction…' : 'Predict Energy Consumption'}</button>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="result-title">
            <div className="mb-10 flex items-start justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Prediction output</p><h2 id="result-title" className="text-xl font-semibold tracking-tight">Energy consumption</h2></div><div className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground"><MapPin className="size-3.5 text-primary" /> {cityTier}</div></div>
            {loading ? (
              <div className="flex min-h-[390px] flex-col items-center justify-center gap-5 text-center">
                <span className="size-12 animate-spin rounded-full border-4 border-secondary border-t-primary" />
                <div><p className="font-semibold">Running prediction model</p><p className="mt-1 text-sm text-muted-foreground">Analyzing your city profile…</p></div>
              </div>
            ) : error ? (
              <div className="flex min-h-[390px] items-center justify-center text-center">
                <p role="alert" className="max-w-sm rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>
              </div>
            ) : predicted === null ? (
              <div className="flex min-h-[390px] items-center justify-center text-center">
                <p className="max-w-xs text-sm leading-6 text-muted-foreground">Fill the form and click Predict to see a forecast.</p>
              </div>
            ) : (
              <>
                <div className="mb-10">
                  <p className="text-sm text-muted-foreground">Predicted monthly consumption</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-6xl font-semibold tracking-[-0.06em] text-primary sm:text-7xl">{predicted.toLocaleString()}</span>
                    <span className="text-lg font-medium text-muted-foreground">kWh</span>
                  </div>
                  {hasBaseline && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">{predictionDelta >= 0 ? '+' : ''}{predictionDelta}% vs dataset average</p>}
                </div>
                {hasBaseline && (
                  <div className="rounded-2xl bg-secondary/60 p-5">
                    <div className="mb-7 flex items-center justify-between">
                      <div><h3 className="text-sm font-semibold">Consumption comparison</h3><p className="mt-1 text-xs text-muted-foreground">Predicted vs dataset average, in kWh</p></div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Predicted</span>
                        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-muted-foreground/40" />Dataset average</span>
                      </div>
                    </div>
                    <div className="flex h-48 items-end justify-center gap-10 border-b border-border px-4">
                      <div className="flex w-20 flex-col items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{predicted.toLocaleString()}</span>
                        <div className="w-full rounded-t-lg bg-primary transition-all" style={{ height: `${Math.max(35, (predicted / Math.max(predicted, baseline)) * 125)}px` }} />
                        <span className="text-xs text-muted-foreground">Predicted</span>
                      </div>
                      <div className="flex w-20 flex-col items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">{baseline.toLocaleString()}</span>
                        <div className="w-full rounded-t-lg bg-muted-foreground/35" style={{ height: `${Math.max(30, (baseline / Math.max(predicted, baseline)) * 125)}px` }} />
                        <span className="text-xs text-muted-foreground">Average</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-7 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-3"><MetricIcon type="temperature" /><p className="mt-3 text-xs text-muted-foreground">Temperature</p><p className="mt-1 text-sm font-semibold">{temperature}°C</p></div>
                  <div className="rounded-xl border border-border bg-card p-3"><MetricIcon type="humidity" /><p className="mt-3 text-xs text-muted-foreground">Humidity</p><p className="mt-1 text-sm font-semibold">{humidity}%</p></div>
                  <div className="rounded-xl border border-border bg-card p-3"><MetricIcon type="ac" /><p className="mt-3 text-xs text-muted-foreground">AC penetration</p><p className="mt-1 text-sm font-semibold">{acPenetration}%</p></div>
                </div>
              </>
            )}
          </section>
        </div>
        <footer className="mt-6 flex items-center justify-between px-1 text-xs text-muted-foreground"><span>Urban demand intelligence</span><span className="flex items-center gap-1.5"><Wind className="size-3.5" />Data-informed planning</span></footer>
      </div>
    </main>
  )
}
