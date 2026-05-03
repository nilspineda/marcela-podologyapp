import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Appointments from './pages/Appointments'
import Services from './pages/Services'
import Incomes from './pages/Incomes'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: '#6b7280' }}>Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

export default function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Patients />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:patientId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Patients />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Appointments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Services />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/incomes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Incomes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Configuración</h1>
                <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Próximamente...</p>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}