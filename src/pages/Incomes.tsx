import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import LexicalEditor from '../components/LexicalEditor'
import { Plus, Search, Pencil, Trash2, X, DollarSign, Calendar, User, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react'

interface Income {
  id: string
  patient_id: string | null
  appointment_id: string | null
  amount: number
  payment_method: string
  description: string | null
  income_date: string
  created_at: string
  patient?: { name: string }
  appointment?: { scheduled_at: string }
}

interface Patient {
  id: string
  name: string
}

interface AppointmentData {
  id: string
  scheduled_at: string
  patient: { name: string }[] | null
}

const paymentMethods = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
  { value: 'otro', label: 'Otro', icon: DollarSign },
]

export default function Incomes() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<AppointmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [filterDate, setFilterDate] = useState('')
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    amount: '',
    payment_method: 'efectivo',
    description: '',
    income_date: new Date().toISOString().split('T')[0]
  })
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadData()
  }, [user])

  const loadData = async () => {
    const [incomesData, patientsData, appointmentsData] = await Promise.all([
      supabase.from('incomes').select('*, patient:patients(name), appointment:appointments(scheduled_at)').order('income_date', { ascending: false }),
      supabase.from('patients').select('id, name').order('name'),
      supabase.from('appointments').select('id, scheduled_at, patient:patients(name)').order('scheduled_at', { ascending: false }).limit(50)
    ])

    if (incomesData.data) setIncomes(incomesData.data)
    if (patientsData.data) setPatients(patientsData.data)
    if (appointmentsData.data) setAppointments(appointmentsData.data)
    setLoading(false)
  }

  const filteredIncomes = incomes.filter(i => {
    const matchesSearch = !search || 
      i.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase()) ||
      i.amount.toString().includes(search)
    
    const matchesDate = !filterDate || i.income_date === filterDate
    
    return matchesSearch && matchesDate
  })

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0)

  const openModal = (income?: Income) => {
    if (income) {
      setEditingIncome(income)
      setFormData({
        patient_id: income.patient_id || '',
        appointment_id: income.appointment_id || '',
        amount: income.amount.toString(),
        payment_method: income.payment_method,
        description: income.description || '',
        income_date: income.income_date
      })
    } else {
      setEditingIncome(null)
      setFormData({
        patient_id: '',
        appointment_id: '',
        amount: '',
        payment_method: 'efectivo',
        description: '',
        income_date: new Date().toISOString().split('T')[0]
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingIncome(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const incomeData = {
      patient_id: formData.patient_id || null,
      appointment_id: formData.appointment_id || null,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      description: formData.description || null,
      income_date: formData.income_date
    }

    if (editingIncome) {
      await supabase
        .from('incomes')
        .update(incomeData)
        .eq('id', editingIncome.id)
    } else {
      await supabase
        .from('incomes')
        .insert([incomeData])
    }

    loadData()
    closeModal()
  }

  const deleteIncome = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este ingreso?')) {
      await supabase.from('incomes').delete().eq('id', id)
      loadData()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price)
  }

  const getPaymentIcon = (method: string) => {
    const pm = paymentMethods.find(p => p.value === method)
    return pm?.icon || DollarSign
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Ingresos</h1>
          <p style={styles.subtitle}>Registro de pagos y facturación</p>
        </div>
        <button onClick={() => openModal()} style={styles.addButton}>
          <Plus size={18} />
          Nuevo ingreso
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <DollarSign size={24} color="#22c55e" />
          </div>
          <div>
            <div style={styles.statValue}>{formatPrice(totalIncome)}</div>
            <div style={styles.statLabel}>Total ingresos</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Calendar size={24} color="#e19c96" />
          </div>
          <div>
            <div style={styles.statValue}>{filteredIncomes.length}</div>
            <div style={styles.statLabel}>Transacciones</div>
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Buscar ingresos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={styles.dateInput}
        />
      </div>

      {loading ? (
        <div style={styles.loading}>Cargando...</div>
      ) : filteredIncomes.length === 0 ? (
        <div style={styles.empty}>
          <DollarSign size={48} color="#d1d5db" />
          <p>No hay ingresos registrados</p>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Paciente</th>
                <th style={styles.th}>Método</th>
                <th style={styles.th}>Descripción</th>
                <th style={styles.th}>Monto</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncomes.map(income => {
                const Icon = getPaymentIcon(income.payment_method)
                return (
                  <tr key={income.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.dateCell}>
                        <Calendar size={14} color="#9ca3af" />
                        <span>{new Date(income.income_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {income.patient ? (
                        <div style={styles.patientCell}>
                          <User size={14} color="#9ca3af" />
                          <span>{income.patient.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.methodCell}>
                        <Icon size={14} color="#6b7280" />
                        <span style={{ textTransform: 'capitalize' }}>{income.payment_method}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.description}>{income.description || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.amount}>{formatPrice(income.amount)}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button onClick={() => openModal(income)} style={styles.actionBtn}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteIncome(income.id)} style={{...styles.actionBtn, color: '#dc2626'}}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso'}</h2>
              <button onClick={closeModal} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Paciente (opcional)</label>
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({...formData, patient_id: e.target.value, appointment_id: ''})}
                  style={styles.select}
                >
                  <option value="">Sin paciente específico</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Cita relacionada (opcional)</label>
                <select
                  value={formData.appointment_id}
                  onChange={(e) => setFormData({...formData, appointment_id: e.target.value})}
                  style={styles.select}
                >
                  <option value="">Sin cita relacionada</option>
                  {appointments.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.scheduled_at).toLocaleDateString('es-ES')} - {a.patient?.[0]?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Monto (COP) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    style={styles.input}
                    min="0"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha *</label>
                  <input
                    type="date"
                    value={formData.income_date}
                    onChange={(e) => setFormData({...formData, income_date: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Método de pago</label>
                <div style={styles.methodGrid}>
                  {paymentMethods.map(pm => (
                    <label key={pm.value} style={styles.methodOption}>
                      <input
                        type="radio"
                        name="payment_method"
                        value={pm.value}
                        checked={formData.payment_method === pm.value}
                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                        style={styles.radio}
                      />
                      <pm.icon size={18} color={formData.payment_method === pm.value ? '#e19c96' : '#6b7280'} />
                      <span>{pm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Descripción</label>
                <LexicalEditor
                  value={formData.description || ''}
                  onChange={(val) => setFormData({...formData, description: val})}
                  placeholder="Descripción del ingreso..."
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingIncome ? 'Guardar cambios' : 'Crear ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 },
  subtitle: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' },
  addButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', backgroundColor: '#e19c96', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
  statCard: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statIcon: { width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' },
  statLabel: { fontSize: '0.875rem', color: '#6b7280' },
  toolbar: { display: 'flex', gap: '1rem' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', flex: 1, maxWidth: '400px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.875rem', width: '100%', color: '#1f2937' },
  dateInput: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem' },
  loading: { textAlign: 'center', padding: '3rem', color: '#6b7280' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', gap: '1rem', color: '#9ca3af' },
  tableCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '1rem', fontSize: '0.875rem', color: '#4b5563' },
  dateCell: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  patientCell: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  methodCell: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  description: { color: '#6b7280', fontSize: '0.8125rem' },
  amount: { fontWeight: 600, color: '#22c55e' },
  actions: { display: 'flex', gap: '0.25rem' },
  actionBtn: { padding: '0.375rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '4px', color: '#6b7280' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' },
  modal: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid #e5e7eb' },
  closeBtn: { padding: '0.25rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280' },
  form: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem' },
  select: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: 'white' },
  textarea: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical' },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' },
  methodOption: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' },
  radio: { display: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.875rem', cursor: 'pointer' },
  submitBtn: { padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#e19c96', color: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
}