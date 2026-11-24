import { useState } from 'react'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import { PredictorPage } from './components/PredictorPage'

export default function App() {
  const [page, setPage] = useState(() => {
    const hasToken = sessionStorage.getItem('accessToken')
    return hasToken ? 'predict' : 'landing'
  })

  // Keeps track of which pages you visited, so "back" always knows where to go
  const [history, setHistory] = useState([])

  // Use this instead of setPage directly when moving FORWARD (e.g. clicking a button)
  const navigate = (next) => {
    setHistory((h) => [...h, page])
    setPage(next)
  }

  // Goes back to whatever page you were on before
  const goBack = () => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setPage(prev)
      return h.slice(0, -1)
    })
  }

  // Predictor's back button acts as a logout — clears the token and returns to landing
  const handleLogout = () => {
    sessionStorage.removeItem('accessToken')
    setHistory([])
    setPage('landing')
  }

  if (page === 'landing') {
    return <LandingPage onGetStarted={() => navigate('login')} />
  }

  if (page === 'login') {
    return (
      <LoginPage
        onLoginSuccess={() => navigate('predict')}
        onRegister={() => navigate('register')}
        onBack={goBack}
      />
    )
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={() => navigate('login')}
        onLogin={() => navigate('login')}
        onBack={goBack}
      />
    )
  }

  return <PredictorPage onBack={handleLogout} />
}