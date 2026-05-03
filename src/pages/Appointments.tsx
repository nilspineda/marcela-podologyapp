import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import LexicalEditor from '../components/LexicalEditor'
import { 
  Plus, Trash2, X, Clock, User, Calendar, MessageCircle, 
  CheckCircle, ChevronRight
} from 'lucide-react'

interface Appointment {
  id: string
  patient_id: string
  service_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: 'confirmado' | 'pospuesto' | 'cancelado' | 'completado'
  notes: string | null
  total_price: number | null
  patient?: { name: string; whatsapp: string; email: string; phone: string }
  service?: { name: string; price: number }
}

interface Patient {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  phone: string | null
}

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

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

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [formData, setFormData] = useState({
    patient_id: '',
    service_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: '30',
    status: 'confirmado',
    notes: ''
  })
  const calendarRef = useRef<FullCalendar>(null)
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
    const [appointmentsData, patientsData, servicesData] = await Promise.all([
      supabase.from('appointments').select('*, patient:patients(name, whatsapp, email, phone), service:services(name, price)').order('scheduled_at'),
      supabase.from('patients').select('id, name, whatsapp, email, phone').order('name'),
      supabase.from('services').select('id, name, price, duration_minutes').eq('is_active', true).order('name')
    ])

    if (appointmentsData.data) setAppointments(appointmentsData.data)
    if (patientsData.data) setPatients(patientsData.data)
    if (servicesData.data) setServices(servicesData.data)
    setLoading(false)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_at)
    return aptDate >= today && aptDate < tomorrow
  })

  const tomorrowAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_at)
    return aptDate >= tomorrow && aptDate < dayAfterTomorrow
  })

  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmado')

  const sendReminder = (appointment: Appointment) => {
    if (appointment.patient?.whatsapp) {
      const cleanPhone = appointment.patient.whatsapp.replace(/\D/g, '')
      const date = new Date(appointment.scheduled_at).toLocaleString('es-ES', { 
        weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' 
      })
      const serviceName = appointment.service?.name || 'cita'
      const message = encodeURIComponent(`Hola ${appointment.patient.name}, te recordamos tu ${serviceName} el ${date}. Por favor confirma tu asistencia.`)
      window.open(`https://wa.me/57${cleanPhone}?text=${message}`, '_blank')
    }
  }

  const events = appointments.map(apt => ({
    id: apt.id,
    title: apt.patient?.name || 'Cita',
    start: apt.scheduled_at,
    backgroundColor: statusColors[apt.status],
    borderColor: statusColors[apt.status],
    extendedProps: { appointment: apt }
  }))

  const openModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment)
      const date = new Date(appointment.scheduled_at)
      setFormData({
        patient_id: appointment.patient_id,
        service_id: appointment.service_id || '',
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_time: date.toTimeString().slice(0, 5),
        duration_minutes: appointment.duration_minutes.toString(),
        status: appointment.status,
        notes: appointment.notes || ''
      })
    } else {
      setEditingAppointment(null)
      const now = new Date()
      now.setHours(now.getHours() + 1, 0, 0, 0)
      setFormData({
        patient_id: '',
        service_id: '',
        scheduled_date: now.toISOString().split('T')[0],
        scheduled_time: now.toTimeString().slice(0, 5),
        duration_minutes: '30',
        status: 'confirmado',
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingAppointment(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const scheduledAt = `${formData.scheduled_date}T${formData.scheduled_time}:00`
    const selectedService = services.find(s => s.id === formData.service_id)

    const appointmentData = {
      patient_id: formData.patient_id,
      service_id: formData.service_id || null,
      scheduled_at: scheduledAt,
      duration_minutes: parseInt(formData.duration_minutes),
      status: formData.status,
      notes: formData.notes || null,
      total_price: selectedService?.price || null
    }

    if (editingAppointment) {
      await supabase
        .from('appointments')
        .update({ ...appointmentData, updated_at: new Date().toISOString() })
        .eq('id', editingAppointment.id)
    } else {
      await supabase
        .from('appointments')
        .insert([appointmentData])
    }

    loadData()
    closeModal()
  }

  const deleteAppointment = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta cita?')) {
      await supabase.from('appointments').delete().eq('id', id)
      loadData()
    }
  }

  const handleEventClick = (info: any) => {
    setSelectedAppointment(info.extendedProps.appointment)
    setShowDetailModal(true)
  }

  const selectedService = services.find(s => s.id === formData.service_id)

  const AppointmentCard = ({ apt, isToday }: { apt: Appointment; isToday: boolean }) => (
    <div style={{...styles.appointmentCard, borderLeftColor: statusColors[apt.status]}}>
      <div style={styles.appointmentCardLeft}>
        <div style={{...styles.appointmentTime, backgroundColor: isToday ? '#fef5f4' : '#f0fdf4'}}>
          <Clock size={14} color={isToday ? '#e19c96' : '#22c55e'} />
          <span style={{ color: isToday ? '#e19c96' : '#22c55e' }}>
            {new Date(apt.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={styles.appointmentInfo}>
          <h4 style={styles.appointmentPatient}>{apt.patient?.name}</h4>
          <span style={styles.appointmentService}>{apt.service?.name || 'Sin servicio'}</span>
        </div>
      </div>
      <div style={styles.appointmentCardRight}>
        {apt.patient?.whatsapp && (
          <button onClick={() => sendReminder(apt)} style={styles.whatsappBtn} title="Enviar recordatorio">
            <MessageCircle size={16} />
          </button>
        )}
        <button onClick={() => { openModal(apt) }} style={styles.editBtn} title="Editar">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )

  if (loading) {
    return <div style={styles.loading}>Cargando...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Citas</h1>
          <p style={styles.subtitle}>Gestiona el calendario de citas</p>
        </div>
        <button onClick={() => openModal()} style={styles.addButton}>
          <Plus size={18} />
          Nueva cita
        </button>
      </div>

      {/* Citas de Hoy y Mañana */}
      <div style={styles.todayTomorrowGrid}>
        {/* Citas de Hoy */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}><Calendar size={18} /> Hoy</h3>
            <span style={styles.badge}>{todayAppointments.length}</span>
          </div>
          {todayAppointments.length === 0 ? (
            <p style={styles.emptyText}>No hay citas hoy</p>
          ) : (
            <div style={styles.appointmentsList}>
              {todayAppointments.map(apt => (
                <AppointmentCard key={apt.id} apt={apt} isToday={true} />
              ))}
            </div>
          )}
        </div>

        {/* Citas de Mañana */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}><Calendar size={18} /> Mañana</h3>
            <span style={styles.badge}>{tomorrowAppointments.length}</span>
          </div>
          {tomorrowAppointments.length === 0 ? (
            <p style={styles.emptyText}>No hay citas mañana</p>
          ) : (
            <div style={styles.appointmentsList}>
              {tomorrowAppointments.map(apt => (
                <AppointmentCard key={apt.id} apt={apt} isToday={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Citas Confirmadas */}
      {confirmedAppointments.length > 0 && (
        <div style={styles.confirmedSection}>
          <h3 style={styles.sectionTitle}><CheckCircle size={18} /> Citas Confirmadas ({confirmedAppointments.length})</h3>
          <div style={styles.confirmedGrid}>
            {confirmedAppointments.slice(0, 6).map(apt => (
              <div key={apt.id} style={styles.confirmedItem}>
                <div style={styles.confirmedInfo}>
                  <span style={styles.confirmedPatient}>{apt.patient?.name}</span>
                  <span style={styles.confirmedDate}>
                    <Clock size={12} />
                    {new Date(apt.scheduled_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                {apt.patient?.whatsapp && (
                  <button onClick={() => sendReminder(apt)} style={styles.miniWhatsappBtn}>
                    <MessageCircle size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div style={styles.legend}>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} style={styles.legendItem}>
            <span style={{ backgroundColor: color, ...styles.legendDot }} />
            <span style={styles.legendLabel}>{statusLabels[status]}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div style={styles.calendarCard}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          locale="es"
          editable={true}
          selectable={true}
          height="auto"
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
          }}
          eventClick={handleEventClick}
          eventContent={(arg) => (
            <div style={styles.eventContent}>
              <span style={styles.eventDot} />
              <span style={styles.eventTitle}>{arg.event.title}</span>
            </div>
          )}
          dayHeaderFormat={{ weekday: 'short' }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {/* Modal de Nueva/Editar Cita */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{editingAppointment ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <button onClick={closeModal} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Paciente *</label>
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                  style={styles.select}
                  required
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Servicio</label>
                <select
                  value={formData.service_id}
                  onChange={(e) => {
                    const svc = services.find(s => s.id === e.target.value)
                    setFormData({
                      ...formData,
                      service_id: e.target.value,
                      duration_minutes: svc?.duration_minutes.toString() || '30'
                    })
                  }}
                  style={styles.select}
                >
                  <option value="">Seleccionar servicio...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - ${s.price.toLocaleString('es-CO')}</option>
                  ))}
                </select>
                {selectedService && (
                  <span style={styles.servicePrice}>
                    Precio: ${selectedService.price.toLocaleString('es-CO')} COP | Duración: {selectedService.duration_minutes} min
                  </span>
                )}
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha *</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Hora *</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Duración (min)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    style={styles.input}
                    min="5"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    style={styles.select}
                  >
                    <option value="confirmado">Confirmado</option>
                    <option value="pospuesto">Pospuesto</option>
                    <option value="completado">Completado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notas</label>
                <LexicalEditor
                  value={formData.notes || ''}
                  onChange={(val) => setFormData({...formData, notes: val})}
                  placeholder="Notas de la cita..."
                />
              </div>

              <div style={styles.modalFooter}>
                {editingAppointment && (
                  <button
                    type="button"
                    onClick={() => { deleteAppointment(editingAppointment.id); closeModal() }}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                )}
                <div style={styles.footerRight}>
                  <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitBtn}>
                    {editingAppointment ? 'Guardar cambios' : 'Crear cita'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ver Detalle */}
      {showDetailModal && selectedAppointment && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Detalle de Cita</h2>
              <button onClick={() => setShowDetailModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.detailContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}><User size={16} /> Paciente</span>
                <span style={styles.detailValue}>{selectedAppointment.patient?.name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}><Calendar size={16} /> Fecha</span>
                <span style={styles.detailValue}>
                  {new Date(selectedAppointment.scheduled_at).toLocaleDateString('es-ES', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                  })}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Servicio</span>
                <span style={styles.detailValue}>{selectedAppointment.service?.name || 'Sin servicio'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Estado</span>
                <span style={{...styles.statusBadge, backgroundColor: statusColors[selectedAppointment.status] + '20', color: statusColors[selectedAppointment.status]}}>
                  {statusLabels[selectedAppointment.status]}
                </span>
              </div>
              {selectedAppointment.notes && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Notas</span>
                  <span style={styles.detailValue}>{selectedAppointment.notes}</span>
                </div>
              )}
              <div style={styles.detailActions}>
                {selectedAppointment.patient?.whatsapp && (
                  <button onClick={() => sendReminder(selectedAppointment)} style={styles.reminderDetailBtn}>
                    <MessageCircle size={16} /> Enviar recordatorio
                  </button>
                )}
                <button onClick={() => { setShowDetailModal(false); openModal(selectedAppointment) }} style={styles.editDetailBtn}>
                  <ChevronRight size={16} /> Editar cita
                </button>
              </div>
            </div>
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
  loading: { textAlign: 'center', padding: '3rem', color: '#6b7280' },
  
  todayTomorrowGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 },
  badge: { padding: '0.25rem 0.75rem', backgroundColor: '#fef5f4', color: '#e19c96', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 600 },
  emptyText: { fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center', padding: '1rem' },
  
  appointmentsList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  appointmentCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid' },
  appointmentCardLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  appointmentTime: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600 },
  appointmentInfo: {},
  appointmentPatient: { fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: 0 },
  appointmentService: { fontSize: '0.75rem', color: '#6b7280' },
  appointmentCardRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  whatsappBtn: { padding: '0.5rem', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  editBtn: { padding: '0.5rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' },
  
  confirmedSection: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem 0' },
  confirmedGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' },
  confirmedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px' },
  confirmedInfo: { display: 'flex', flexDirection: 'column', gap: '0.125rem' },
  confirmedPatient: { fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' },
  confirmedDate: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280' },
  miniWhatsappBtn: { padding: '0.375rem', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  
  legend: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  legendLabel: { fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' },
  
  calendarCard: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  eventContent: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '2px 4px', fontSize: '0.75rem' },
  eventDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white' },
  eventTitle: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
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
  servicePrice: { fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' },
  modalFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' },
  footerRight: { display: 'flex', gap: '0.75rem' },
  deleteBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.875rem', cursor: 'pointer' },
  cancelBtn: { padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.875rem', cursor: 'pointer' },
  submitBtn: { padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#e19c96', color: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  
  detailContent: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' },
  detailValue: { fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', textAlign: 'right' },
  statusBadge: { padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 500 },
  detailActions: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' },
  reminderDetailBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' },
  editDetailBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer' },
}