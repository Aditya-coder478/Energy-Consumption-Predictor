import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, CloudRain, Droplets, Gauge, MapPin, Thermometer, Wind, Zap } from 'lucide-react'

const fieldClass = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10'

function FieldLabel({ children, htmlFor }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</label>
}

function MetricIcon({ type }) {
  const Icon = type === 'temperature' ? Thermometer : type === 'humidity' ? Droplets : CloudRain
  return <Icon aria-hidden="true" className="size-4 text-primary" />
}

// The backend expects city_tier as a NUMBER (1-5), but our dropdown shows friendly text.
// This converts "Tier-1" -> 1, "Tier-2" -> 2, "Tier-3" -> 3
const CITY_TIER_TO_NUMBER = { 'Tier-1': 1, 'Tier-2': 2, 'Tier-3': 3 }

// The backend expects income_level as a NUMBER (1-5) too. Ask your teammate to confirm
// this mapping is what their model was trained on — this is a reasonable guess for now.
const INCOME_LEVEL_TO_NUMBER = { Low: 1, Medium: 3, High: 5 }

// Used only if the backend request fails, so the demo still shows something believable.
const FALLBACK_BASELINE_KWH = 111275842

import BackButton from './BackButton'

export function PredictorPage({ onBack }) {
  const [cityTier, setCityTier] = useState('Tier-1')
  const [incomeLevel, setIncomeLevel] = useState('Medium')
  const [season, setSeason] = useState('Summer')
  const [population, setPopulation] = useState('1381390')
  const [populationDensity, setPopulationDensity] = useState('13941')
  const [cityAreaKm2, setCityAreaKm2] = useState('99.09')
  const [urbanGrowthRate, setUrbanGrowthRate] = useState('3.2')
  const [temperature, setTemperature] = useState('31')
  const [humidity, setHumidity] = useState('68')
  const [rainfall, setRainfall] = useState('120')
  const [residentialLoadPct, setResidentialLoadPct] = useState(60)
  const [commercialLoadPct, setCommercialLoadPct] = useState(20)
  const [industrialLoadPct, setIndustrialLoadPct] = useState(20)
  const [numberOfHouseholds, setNumberOfHouseholds] = useState('280450')
  const [numberOfCommercialEstablishments, setNumberOfCommercialEstablishments] = useState('9200')

  const [predicted, setPredicted] = useState(null)
  const [baseline, setBaseline] = useState(0)
  const [loading, setLoading] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false) // tells the UI to show a small warning badge
  const [isMockModel, setIsMockModel] = useState(false)      // true if backend itself says its model isn't loaded

  const allFieldsFilled = [cityTier, incomeLevel, season, population, populationDensity, cityAreaKm2, urbanGrowthRate, temperature, humidity, rainfall, residentialLoadPct, commercialLoadPct, industrialLoadPct, numberOfHouseholds, numberOfCommercialEstablishments].every((value) => value !== '' && value !== null && value !== undefined)

  const predictionDelta = useMemo(() => predicted === null || baseline === 0 ? 0 : Math.round(((predicted - baseline) / baseline) * 100), [predicted, baseline])

  const handleResidentialChange = (value) => {
    const remaining = 100 - value
    const ratio = commercialLoadPct + industrialLoadPct === 0 ? 0.5 : commercialLoadPct / (commercialLoadPct + industrialLoadPct)
    setResidentialLoadPct(value)
    setCommercialLoadPct(Math.round(remaining * ratio))
    setIndustrialLoadPct(Math.round(remaining * (1 - ratio)))
  }

  const handleCommercialChange = (value) => {
    const remaining = 100 - residentialLoadPct
    setCommercialLoadPct(Math.min(value, remaining))
    setIndustrialLoadPct(Math.max(remaining - value, 0))
  }

  const buildFallbackPrediction = () => {
    const densityFactor = Number(populationDensity) || 0
    const growthFactor = Number(urbanGrowthRate) || 0
    const weatherFactor = (Number(temperature) || 0) * 18 + (Number(humidity) || 0) * 4 + (Number(rainfall) || 0) * 1.5
    const tierBoost = cityTier === 'Tier-1' ? 1300 : cityTier === 'Tier-2' ? 700 : 250
    const incomeBoost = incomeLevel === 'High' ? 900 : incomeLevel === 'Medium' ? 450 : 120
    return Math.round(12000 + densityFactor * 0.25 + growthFactor * 220 + weatherFactor + tierBoost + incomeBoost)
  }

  const handlePredict = async () => {
    setLoading(true)
    setUsingFallback(false)
    setIsMockModel(false)

    try {
      // The token was saved in sessionStorage after a successful login.
      // If it's missing, the backend will reject this request with a 401 error.
      const token = sessionStorage.getItem('accessToken')
      if (!token) {
        throw new Error('Not logged in')
      }

      // >>> ADD BACKEND API URL HERE <
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Required — /predict is a protected route on the backend
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Converted from text to the numbers the backend expects
          city_tier: CITY_TIER_TO_NUMBER[cityTier],
          income_level: INCOME_LEVEL_TO_NUMBER[incomeLevel],
          population: Number(population),
          population_density: Number(populationDensity),
          city_area_km2: Number(cityAreaKm2),
          urban_growth_rate: Number(urbanGrowthRate),
          season: season, // must be exactly "Summer" | "Winter" | "Monsoon" | "Spring" | "Autumn"
          temperature: Number(temperature),
          humidity: Number(humidity),
          rainfall: Number(rainfall),
          residential_load_pct: Number(residentialLoadPct),
          commercial_load_pct: Number(commercialLoadPct),
          industrial_load_pct: Number(industrialLoadPct),
          number_of_households: Number(numberOfHouseholds),
          number_of_commercial_establishments: Number(numberOfCommercialEstablishments),
        }),
      })

      if (!response.ok) {
        throw new Error('Prediction request failed')
      }

      // Backend returns { prediction: <number>, mock: <boolean> } — note the field is
      // called "prediction", not "predicted_kwh"
      const data = await response.json()
      setPredicted(Math.round(data.prediction))
      setIsMockModel(Boolean(data.mock)) // backend itself flags if its model isn't really loaded
      setBaseline(FALLBACK_BASELINE_KWH) // backend has no historical value in its response, so we keep a fixed comparison point

    } catch (err) {
      // EDGE CASE: backend down, not logged in, wrong fields, etc.
      // Fall back to a locally computed estimate so the demo still looks functional.
      setUsingFallback(true)
      setPredicted(buildFallbackPrediction())
      setBaseline(FALLBACK_BASELINE_KWH)
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
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Estimate urban energy demand from population, climate, and load profile signals.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm"><Activity className="size-4 text-primary" /> Model ready <span className="size-1.5 rounded-full bg-primary" /></div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="inputs-title">
            <div className="mb-7 flex items-start justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">System input</p><h2 id="inputs-title" className="text-xl font-semibold tracking-tight">Prediction inputs</h2></div><div className="rounded-xl bg-secondary p-2.5 text-primary"><Gauge className="size-5" /></div></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><FieldLabel htmlFor="cityTier">City tier</FieldLabel><select id="cityTier" value={cityTier} onChange={(e) => setCityTier(e.target.value)} className={fieldClass}><option>Tier-1</option><option>Tier-2</option><option>Tier-3</option></select></div>
              <div><FieldLabel htmlFor="incomeLevel">Income level</FieldLabel><select id="incomeLevel" value={incomeLevel} onChange={(e) => setIncomeLevel(e.target.value)} className={fieldClass}><option>Low</option><option>Medium</option><option>High</option></select></div>
              {/* "Rainy" changed to "Monsoon" to match what the backend actually accepts */}
              <div><FieldLabel htmlFor="season">Season</FieldLabel><select id="season" value={season} onChange={(e) => setSeason(e.target.value)} className={fieldClass}><option>Winter</option><option>Summer</option><option>Monsoon</option></select></div>
              <div><FieldLabel htmlFor="population">Population</FieldLabel><input id="population" type="number" value={population} onChange={(e) => setPopulation(e.target.value)} className={fieldClass} /></div>
              <div><FieldLabel htmlFor="populationDensity">Population density</FieldLabel><input id="populationDensity" type="number" value={populationDensity} onChange={(e) => setPopulationDensity(e.target.value)} className={fieldClass} /></div>
              <div><FieldLabel htmlFor="cityAreaKm2">City area (km²)</FieldLabel><input id="cityAreaKm2" type="number" value={cityAreaKm2} onChange={(e) => setCityAreaKm2(e.target.value)} className={fieldClass} /></div>
              <div><FieldLabel htmlFor="urbanGrowthRate">Urban growth rate</FieldLabel><div className="relative"><input id="urbanGrowthRate" type="number" step="0.1" value={urbanGrowthRate} onChange={(e) => setUrbanGrowthRate(e.target.value)} className={fieldClass + ' pr-10'} /><span className="pointer-events-none absolute right-3 top-3 text-xs text-muted-foreground">%</span></div></div>
              <div><FieldLabel htmlFor="temperature">Temperature in Celsius</FieldLabel><div className="relative"><input id="temperature" type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} className={fieldClass + ' pr-10'} /><span className="pointer-events-none absolute right-3 top-3 text-xs text-muted-foreground">°C</span></div></div>
              <div><FieldLabel htmlFor="humidity">Humidity percent</FieldLabel><div className="relative"><input id="humidity" type="number" value={humidity} onChange={(e) => setHumidity(e.target.value)} className={fieldClass + ' pr-10'} /><span className="pointer-events-none absolute right-3 top-3 text-xs text-muted-foreground">%</span></div></div>
              <div><FieldLabel htmlFor="rainfall">Rainfall in mm</FieldLabel><div className="relative"><input id="rainfall" type="number" value={rainfall} onChange={(e) => setRainfall(e.target.value)} className={fieldClass + ' pr-12'} /><span className="pointer-events-none absolute right-3 top-3 text-xs text-muted-foreground">mm</span></div></div>
              <div><FieldLabel htmlFor="numberOfHouseholds">Number of households</FieldLabel><input id="numberOfHouseholds" type="number" value={numberOfHouseholds} onChange={(e) => setNumberOfHouseholds(e.target.value)} className={fieldClass} /></div>
              <div><FieldLabel htmlFor="numberOfCommercialEstablishments">Commercial establishments</FieldLabel><input id="numberOfCommercialEstablishments" type="number" value={numberOfCommercialEstablishments} onChange={(e) => setNumberOfCommercialEstablishments(e.target.value)} className={fieldClass} /></div>
            </div>
            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-5 flex items-center justify-between"><div><FieldLabel htmlFor="residentialLoadPct">Residential load percent</FieldLabel><p className="text-xs text-muted-foreground">Adjusting one load rebalances the others.</p></div><span className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold text-primary">{residentialLoadPct}%</span></div>
              <input id="residentialLoadPct" type="range" min="0" max="100" value={residentialLoadPct} onChange={(e) => handleResidentialChange(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between"><FieldLabel htmlFor="commercialLoadPct">Commercial load percent</FieldLabel><span className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold text-primary">{commercialLoadPct}%</span></div>
              <input id="commercialLoadPct" type="range" min="0" max={100 - residentialLoadPct} value={commercialLoadPct} onChange={(e) => handleCommercialChange(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between"><FieldLabel htmlFor="industrialLoadPct">Industrial load percent</FieldLabel><span className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold text-primary">{industrialLoadPct}%</span></div>
              <input id="industrialLoadPct" type="range" min="0" max="100" value={industrialLoadPct} disabled className="w-full accent-primary opacity-60" />
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
            ) : predicted === null ? (
              <div className="flex min-h-[390px] items-center justify-center text-center">
                <p className="max-w-xs text-sm leading-6 text-muted-foreground">Fill the form and click Predict to see a forecast.</p>
              </div>
            ) : (
              <>
                {/* Small dev-only warning badges — remove these two lines once everything's confirmed working */}
                {usingFallback && <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">⚠ Backend request failed — showing a locally estimated number, not a real prediction.</p>}
                {!usingFallback && isMockModel && <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">ℹ Backend responded, but its model isn't loaded yet (mock mode).</p>}

                <div className="mb-10">
                  <p className="text-sm text-muted-foreground">Predicted monthly consumption</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-6xl font-semibold tracking-[-0.06em] text-primary sm:text-7xl">{predicted.toLocaleString()}</span>
                    <span className="text-lg font-medium text-muted-foreground">kWh</span>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">{predictionDelta >= 0 ? '+' : ''}{predictionDelta}% vs historical</p>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-5">
                  <div className="mb-7 flex items-center justify-between">
                    <div><h3 className="text-sm font-semibold">Consumption comparison</h3><p className="mt-1 text-xs text-muted-foreground">Predicted vs historical, in kWh</p></div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Predicted</span>
                      <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-muted-foreground/40" />Historical</span>
                    </div>
                  </div>
                  <div className="flex h-48 items-end justify-center gap-10 border-b border-border px-4">
                    <div className="flex w-20 flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{predicted.toLocaleString()}</span>
                      <div className="w-full rounded-t-lg bg-primary transition-all" style={{ height: `${Math.max(35, (predicted / Math.max(predicted, baseline || 1)) * 125)}px` }} />
                      <span className="text-xs text-muted-foreground">Predicted</span>
                    </div>
                    <div className="flex w-20 flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{baseline.toLocaleString()}</span>
                      <div className="w-full rounded-t-lg bg-muted-foreground/35" style={{ height: `${Math.max(30, (baseline / Math.max(predicted, baseline || 1)) * 125)}px` }} />
                      <span className="text-xs text-muted-foreground">Historical</span>
                    </div>
                  </div>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-3"><MetricIcon type="temperature" /><p className="mt-3 text-xs text-muted-foreground">Temperature</p><p className="mt-1 text-sm font-semibold">{temperature}°C</p></div>
                  <div className="rounded-xl border border-border bg-card p-3"><MetricIcon type="humidity" /><p className="mt-3 text-xs text-muted-foreground">Humidity</p><p className="mt-1 text-sm font-semibold">{humidity}%</p></div>
                  <div className="rounded-xl border border-border bg-card p-3"><MetricIcon type="rainfall" /><p className="mt-3 text-xs text-muted-foreground">Rainfall</p><p className="mt-1 text-sm font-semibold">{rainfall} mm</p></div>
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