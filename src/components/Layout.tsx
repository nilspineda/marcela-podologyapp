import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Tag,
  DollarSign,
  Clock,
  MessageCircle
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Pacientes', icon: Users },
  { path: '/appointments', label: 'Citas', icon: Calendar },
  { path: '/services', label: 'Servicios', icon: Tag },
  { path: '/incomes', label: 'Ingresos', icon: DollarSign },
  { path: '/settings', label: 'Configuración', icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const [todayAppointments, setTodayAppointments] = useState(0)
  const { signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  useEffect(() => {
    const loadTodayAppointments = async () => {
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
      
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', startOfDay)
        .lt('scheduled_at', endOfDay)
      
      setTodayAppointments(count || 0)
    }
    loadTodayAppointments()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>M</div>
          <span style={styles.logoText}>Marcela Podología</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <a
                key={item.path}
                href={item.path}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <item.icon size={20} style={isActive ? { color: '#e19c96' } : {}} />
                <span style={isActive ? { color: '#e19c96', fontWeight: 600 } : {}}>
                  {item.label}
                </span>
              </a>
            )
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={handleSignOut} style={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.quickAccess}>
              <button style={styles.dateBtn}>
                <Clock size={16} />
                {todayFormatted}
              </button>
              <button style={styles.patientsBtn} onClick={() => navigate('/appointments')}>
                <Calendar size={16} />
                {todayAppointments} {todayAppointments === 1 ? 'cita hoy' : 'citas hoy'}
              </button>
            </div>
          </div>

          <div style={styles.headerRight}>
            <button onClick={handleSignOut} style={styles.logoutHeaderBtn}>
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main style={styles.content}>
          {children}
        </main>

        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <span style={styles.footerText}>
              © {new Date().getFullYear()} Desarrollado por <a href="https://nilspineda.com" target="_blank" style={styles.footerLink}>nilspineda.com</a>
            </span>
            <a href="https://wa.me/573167195500" target="_blank" style={styles.whatsappFooter}>
              <MessageCircle size={14} /> 3167195500
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'white',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 10,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.5rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    backgroundColor: '#e19c96',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '1.125rem',
  },
  logoText: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  nav: {
    flex: 1,
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#4b5563',
    fontSize: '0.9375rem',
    transition: 'all 0.15s',
  },
  navItemActive: {
    backgroundColor: '#fef5f4',
    color: '#e19c96',
  },
  sidebarFooter: {
    padding: '1rem 0.75rem',
    borderTop: '1px solid #e5e7eb',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
    width: 'calc(100% - 260px)',
  },
  header: {
    height: '64px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 5,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  quickAccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  patientsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#fef5f4',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e19c96',
    cursor: 'pointer',
  },
  logoutHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: 'white',
    fontSize: '0.875rem',
    color: '#6b7280',
    cursor: 'pointer',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'background-color 0.15s',
  },
  notifBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '16px',
    height: '16px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    fontSize: '0.625rem',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  profile: {
    position: 'relative',
    marginLeft: '0.5rem',
  },
  profileBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.375rem 0.75rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#1f2937',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    minWidth: '160px',
    overflow: 'hidden',
    zIndex: 20,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#4b5563',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  content: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  footer: {
    padding: '1rem 1.5rem',
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    marginTop: 'auto',
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },
  footerLink: {
    color: '#e19c96',
    textDecoration: 'none',
    fontWeight: 500,
  },
  whatsappFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    color: '#25D366',
    textDecoration: 'none',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
}