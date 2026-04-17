import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LandingPage       from './pages/LandingPage.jsx'
import LoginPage         from './pages/LoginPage.jsx'
import SignupPage        from './pages/SignupPage.jsx'
import OnboardingPage    from './pages/OnboardingPage.jsx'
import StudentDashboard  from './pages/StudentDashboard.jsx'
import ProfessorNovaPage from './pages/ProfessorNovaPage.jsx'
import TutorDashboard    from './pages/TutorDashboard.jsx'
import AdminDashboard    from './pages/AdminDashboard.jsx'

function Loading() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'var(--surface)',
      color:'var(--text-muted)', fontSize:14
    }}>Loading...</div>
  )
}

function HomeRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <LandingPage />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'tutor') return <Navigate to="/tutor" replace />
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/" replace />
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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
