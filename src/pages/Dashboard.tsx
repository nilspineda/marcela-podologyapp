import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const statusColors: Record<string, string> = {
  confirmado: '#e19c96',
  pospuesto: '#fbbf24',
  cancelado: '#ef4444',
  completado: '#22c55e',
}

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pospuesto: 'Pospuesto',
  cancelado: 'Cancelado',
  completado: 'Completado',
}

const mockTreatmentsData = [
  { name: 'Corte Uñas', value: 45 },
  { name: 'Callos', value: 30 },
  { name: 'Uñas Encarnadas', value: 25 },
  { name: 'Tratamiento Pie', value: 20 },
]

interface RecentAppointment {
  id: string
  patient: string
  date: string
  status: string
  treatment: string
}

export default function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, appointments: 0, treatments: 0, completed: 0, pending: 0, cancelled: 0 })
  const [appointmentsByMonthData, setAppointmentsByMonthData] = useState<Array<{month: string, appointments: number}>>([])
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadStats()
  }, [user])

  const loadStats = async () => {
    const [
      patients,
      appointmentsResult,
      treatments,
      appointmentsList
    ] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase.from('treatments').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('*, patient:patients(name)').order('scheduled_at', { ascending: false }).limit(10)
    ])

    const appointments = appointmentsList.data || []
    
    const completedCount = appointments.filter((a: any) => a.status === 'completado').length
    const pendingCount = appointments.filter((a: any) => a.status === 'confirmado').length
    const cancelledCount = appointments.filter((a: any) => a.status === 'cancelado').length

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const monthlyData: Record<string, number> = {}
    
    appointments.forEach((apt: any) => {
      const date = new Date(apt.scheduled_at)
      const monthKey = monthNames[date.getMonth()]
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
    })

    const monthlyChartData = monthNames.slice(0, 6).map(month => ({
      month,
      appointments: monthlyData[month] || 0
    }))

    setAppointmentsByMonthData(monthlyChartData)

    const recent: RecentAppointment[] = appointments.slice(0, 5).map((apt: any) => ({
      id: apt.id,
      patient: apt.patient?.name || 'Sin nombre',
      date: new Date(apt.scheduled_at).toLocaleString('es-ES', { 
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      }).replace(',', ''),
      status: apt.status,
      treatment: apt.notes || 'Tratamiento'
    }))
    setRecentAppointments(recent)

    setStats({
      patients: patients.count || 0,
      appointments: appointmentsResult.count || 0,
      treatments: treatments.count || 0,
      completed: completedCount,
      pending: pendingCount,
      cancelled: cancelledCount,
    })
  }

  const totalStatus = stats.completed + stats.pending + stats.cancelled || 1
  const dynamicStatusData = [
    { name: 'Completados', value: Math.round((stats.completed / totalStatus) * 100), color: '#22c55e' },
    { name: 'Confirmados', value: Math.round((stats.pending / totalStatus) * 100), color: '#e19c96' },
    { name: 'Pospuestos', value: Math.round(((stats.appointments - stats.completed - stats.pending - stats.cancelled) / totalStatus) * 100) || 0, color: '#fbbf24' },
    { name: 'Cancelados', value: Math.round((stats.cancelled / totalStatus) * 100), color: '#ef4444' },
  ]

  const metrics = [
    {
      label: 'Pacientes',
      value: stats.patients,
      change: '+12%',
      positive: true,
      icon: Users,
      color: '#e19c96',
      bgColor: '#fef5f4',
    },
    {
      label: 'Citas Este Mes',
      value: stats.appointments || 25,
      change: '+8%',
      positive: true,
      icon: Calendar,
      color: '#22c55e',
      bgColor: '#f0fdf4',
    },
    {
      label: 'Tratamientos',
      value: stats.treatments || 120,
      change: '+5%',
      positive: true,
      icon: TrendingUp,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      label: 'Ingresos',
      value: '$3,240',
      change: '+15%',
      positive: true,
      icon: DollarSign,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Resumen de tu clínica podológica</p>
        </div>
        <div style={styles.dateBadge}>
          <Clock size={14} />
          <span>Mayo 2026</span>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <div key={index} style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <div style={{ ...styles.metricIcon, backgroundColor: metric.bgColor }}>
                <metric.icon size={22} color={metric.color} />
              </div>
              <div style={{
                ...styles.metricChange,
                color: metric.positive ? '#22c55e' : '#ef4444',
                backgroundColor: metric.positive ? '#f0fdf4' : '#fef2f2',
              }}>
                {metric.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {metric.change}
              </div>
            </div>
            <div style={styles.metricValue}>{metric.value}</div>
            <div style={styles.metricLabel}>{metric.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Citas por Mes</h3>
            <span style={styles.cardSubtitle}>Últimos 6 meses</span>
          </div>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={appointmentsByMonthData.length > 0 ? appointmentsByMonthData : [
              { month: 'Ene', appointments: 0 },
              { month: 'Feb', appointments: 0 },
              { month: 'Mar', appointments: 0 },
              { month: 'Abr', appointments: 0 },
              { month: 'May', appointments: 0 },
              { month: 'Jun', appointments: 0 },
            ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  stroke="#e19c96"
                  strokeWidth={3}
                  dot={{ fill: '#e19c96', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#e19c96' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Tratamientos Populares</h3>
            <span style={styles.cardSubtitle}>Por tipo de tratamiento</span>
          </div>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mockTreatmentsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#e19c96" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Estado de Citas</h3>
            <span style={styles.cardSubtitle}>Distribución general</span>
          </div>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dynamicStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dynamicStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legendGrid}>
              {dynamicStatusData.map((item, index) => (
                <div key={index} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: item.color }} />
                  <span style={styles.legendLabel}>{item.name}</span>
                  <span style={styles.legendValue}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Citas Recientes</h3>
          <a href="/appointments" style={styles.viewAll}>Ver todas</a>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Paciente</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Tratamiento</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentAppointments.map((apt) => (
                <tr key={apt.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.patientCell}>
                      <div style={styles.patientAvatar}>
                        {apt.patient.charAt(0)}
                      </div>
                      <span style={styles.patientName}>{apt.patient}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.dateCell}>
                      <Clock size={14} color="#9ca3af" />
                      <span>{apt.date}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{apt.treatment}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: statusColors[apt.status] + '20',
                      color: statusColors[apt.status],
                    }}>
                      {apt.status === 'completado' && <CheckCircle size={12} />}
                      {apt.status === 'confirmado' && <Activity size={12} />}
                      {apt.status === 'pospuesto' && <AlertCircle size={12} />}
                      {apt.status === 'cancelado' && <XCircle size={12} />}
                      {statusLabels[apt.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#6b7280',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  metricIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
  },
  metricLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  legendGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    flex: 1,
  },
  legendValue: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  viewAll: {
    fontSize: '0.875rem',
    color: '#e19c96',
    textDecoration: 'none',
    fontWeight: 500,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#4b5563',
  },
  patientCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  patientAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#fef5f4',
    color: '#e19c96',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  patientName: {
    fontWeight: 500,
    color: '#1f2937',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
}