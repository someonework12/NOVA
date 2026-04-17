import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LandingPage from './pages/LandingPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import TutorDashboard from './pages/TutorDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ProfessorNovaPage from './pages/ProfessorNovaPage.jsx'

function Loading() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--surface)', color:'var(--text-muted)', fontSize:14 }}>Loading...</div>
}

// Home: show landing page always, redirect logged-in users to their dashboard
function HomeRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  // Not logged in — show the landing page, stay here
  if (!user) return <LandingPage />
  // Logged in — route to correct place
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'tutor') return <Navigate to="/tutor" replace />
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (role && profile && profile.role !== role) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'tutor') return <Navigate to="/tutor" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<HomeRoute />} />
      <Route path="/signup"         element={<SignupPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/onboarding"     element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/dashboard"      element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/nova" element={<ProtectedRoute role="student"><ProfessorNovaPage /></ProtectedRoute>} />
      <Route path="/tutor"          element={<ProtectedRoute role="tutor"><TutorDashboard /></ProtectedRoute>} />
      <Route path="/admin"          element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
