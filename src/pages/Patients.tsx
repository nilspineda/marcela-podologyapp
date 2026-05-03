import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, Pencil, Trash2, X, User, Phone, Mail, Calendar, 
  MessageCircle, Clock, Eye, Stethoscope, FileText,
  ChevronLeft, AlertCircle, Bell, MapPin, CreditCard, UserPlus,
  ArrowLeft
} from 'lucide-react'
import LexicalEditor from '../components/LexicalEditor'

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  date_of_birth: string | null
  notes: string | null
  emergency_contact: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  allergies: string | null
  medical_history: string | null
  document_type: string | null
  document_number: string | null
  avatar_url: string | null
  created_at: string
  treatment_count?: number
  last_treatment?: string | null
}

interface Treatment {
  id: string
  patient_id: string
  service_id: string | null
  appointment_id: string | null
  treatment_date: string
  diagnosis: string | null
  observations: string | null
  price_paid: number | null
  payment_status: 'pendiente' | 'pagado' | 'parcial' | null
  service?: { name: string }
}

interface Appointment {
  id: string
  patient_id: string
  scheduled_at: string
  status: string
  service?: { name: string }
}

const documentTypes = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PAS', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' },
]

export default function Patients() {
  const { patientId } = useParams()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState(false)
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<any[]>([])
  
  const [showTreatmentModal, setShowTreatmentModal] = useState(false)
  const [showNewTreatmentModal, setShowNewTreatmentModal] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    date_of_birth: '',
    email: '',
    address: '',
    document_type: '',
    document_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    allergies: '',
    medical_history: '',
    notes: ''
  })

  const [treatmentForm, setTreatmentForm] = useState({
    service_id: '',
    diagnosis: '',
    observations: '',
    price_paid: '',
    treatment_date: new Date().toISOString().split('T')[0],
    treatment_time: new Date().toTimeString().slice(0, 5),
    payment_status: 'pendiente'
  })

  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [shouldOpenTreatmentModal, setShouldOpenTreatmentModal] = useState(false)
  const [sentReviews, setSentReviews] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadPatients()
    loadServices()
    if (patientId) {
      loadPatientById(patientId)
      // Check if we should open treatment modal after navigation
      if (location.state && (location.state as any).openTreatmentModal) {
        setShouldOpenTreatmentModal(true)
        // Clear the state to avoid reopening on re-render
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
  }, [user, patientId])

  // Open treatment modal if flagged
  useEffect(() => {
    if (shouldOpenTreatmentModal && selectedPatient) {
      setShowNewTreatmentModal(true)
      setShouldOpenTreatmentModal(false)
    }
  }, [shouldOpenTreatmentModal, selectedPatient])

  const loadPatients = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*, treatments(count, treatment_date)')
      .order('name')
    
    if (!error && data) {
      // Transformar los datos para incluir el conteo de tratamientos
      const patientsWithTreatments = data.map(p => ({
        ...p,
        treatment_count: p.treatments?.[0]?.count || 0,
        last_treatment: p.treatments?.[0]?.treatment_date || null
      }))
      setPatients(patientsWithTreatments)
    }
    setLoading(false)
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('is_active', true)
      .order('name')
    if (data) setServices(data)
  }

  const loadPatientById = async (id: string) => {
    const { data } = await supabase.from('patients').select('*').eq('id', id).single()
    if (data) {
      setSelectedPatient(data)
      loadPatientDetails(data)
    }
  }

  const loadPatientDetails = async (patient: Patient) => {
    const [treatmentsData, appointmentsData] = await Promise.all([
      supabase.from('treatments').select('*, service:services(name)').eq('patient_id', patient.id).order('treatment_date', { ascending: false }),
      supabase.from('appointments').select('*, service:services(name)').eq('patient_id', patient.id).order('scheduled_at', { ascending: false })
    ])

    if (treatmentsData.data) setTreatments(treatmentsData.data)
    if (appointmentsData.data) setAppointments(appointmentsData.data)
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)
  }

  const sendAppointmentReminder = (appointment: Appointment) => {
    if (selectedPatient?.whatsapp) {
      const cleanPhone = selectedPatient.whatsapp.replace(/\D/g, '')
      const date = new Date(appointment.scheduled_at).toLocaleDateString('es-ES', { 
        weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' 
      })
      const message = encodeURIComponent(`Hola ${selectedPatient.name}, te recordamos tu cita el ${date}. Por favor confirma tu asistencia.`)
      window.open(`https://wa.me/57${cleanPhone}?text=${message}`, '_blank')
    }
  }

  const sendWhatsAppMessage = (patient: Patient) => {
    if (patient.whatsapp) {
      const cleanPhone = patient.whatsapp.replace(/\D/g, '')
      // Buscar si tiene próxima cita
      const nextAppointment = appointments.find(apt => {
        const aptDate = new Date(apt.scheduled_at)
        return aptDate >= new Date() && apt.status === 'confirmado'
      })
      
      let message = ''
      if (nextAppointment) {
        const date = new Date(nextAppointment.scheduled_at).toLocaleDateString('es-ES', { 
          weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' 
        })
        const serviceName = nextAppointment.service?.name || 'cita'
        message = encodeURIComponent(`Hola ${patient.name}, te confirmamos tu ${serviceName} el ${date}. Por favor confirma tu asistencia.`)
      } else {
        message = encodeURIComponent(`Hola ${patient.name}, ¿cómo estás? ¿Necesitas agendar una cita?`)
      }
      window.open(`https://wa.me/57${cleanPhone}?text=${message}`, '_blank')
    }
  }

  const sendGoogleReview = (patient: Patient) => {
    if (patient.whatsapp) {
      const cleanPhone = patient.whatsapp.replace(/\D/g, '')
      const reviewLink = 'https://maps.app.goo.gl/TuLinkDeGoogle'
      const message = encodeURIComponent(`Hola ${patient.name}, gracias por visitarnos. Nos encantaría que deixar tu opinión sobre nuestro servicio: ${reviewLink}`)
      window.open(`https://wa.me/57${cleanPhone}?text=${message}`, '_blank')
      setSentReviews(prev => new Set(prev).add(patient.id))
    }
  }

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.whatsapp?.includes(search) ||
    p.document_number?.includes(search)
  )

  const viewPatient = async (patient: Patient) => {
    setSelectedPatient(patient)
    await loadPatientDetails(patient)
    navigate(`/patients/${patient.id}`)
  }

  const goBack = () => {
    setSelectedPatient(null)
    navigate('/patients')
  }

  const handleSaveNewPatient = async () => {
    console.log('Guardando paciente...', formData)
    
    const { data: patientData, error: patientError } = await supabase.from('patients').insert([{
      name: formData.name,
      whatsapp: formData.whatsapp || null,
      date_of_birth: formData.date_of_birth || null,
      email: formData.email || null,
      address: formData.address || null,
      document_type: formData.document_type || null,
      document_number: formData.document_number || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      allergies: formData.allergies || null,
      medical_history: formData.medical_history || null,
      notes: formData.notes || null
    }]).select().single()

    console.log('Patient insert result:', patientData, patientError)

    if (patientError) {
      console.error('Error creating patient:', patientError)
      alert('Error al crear paciente: ' + patientError.message)
      return
    }

    console.log('Paciente guardado exitosamente')
    loadPatients()
    setShowNewPatientForm(false)
    setFormData({
      name: '', whatsapp: '', date_of_birth: '', email: '', address: '',
      document_type: '', document_number: '', emergency_contact_name: '', emergency_contact_phone: '',
      allergies: '', medical_history: '', notes: ''
    })
  }

  const handleSaveTreatment = async () => {
    if (!selectedPatient) return
    
    const treatmentDateTime = treatmentForm.treatment_time 
      ? `${treatmentForm.treatment_date}T${treatmentForm.treatment_time}:00`
      : treatmentForm.treatment_date
    
    const treatmentData = {
      patient_id: selectedPatient.id,
      service_id: treatmentForm.service_id || null,
      treatment_date: treatmentDateTime,
      diagnosis: treatmentForm.diagnosis || null,
      observations: treatmentForm.observations || null,
      price_paid: treatmentForm.price_paid ? parseFloat(treatmentForm.price_paid) : null,
      payment_status: treatmentForm.payment_status
    }

    if (editingTreatment) {
      await supabase.from('treatments').update(treatmentData).eq('id', editingTreatment.id)
    } else {
      await supabase.from('treatments').insert([treatmentData]).select().single()
    }

    await loadPatientDetails(selectedPatient)
    setShowNewTreatmentModal(false)
    setEditingTreatment(null)
    setTreatmentForm({ 
      service_id: '', 
      diagnosis: '', 
      observations: '', 
      price_paid: '', 
      treatment_date: new Date().toISOString().split('T')[0],
      treatment_time: new Date().toTimeString().slice(0, 5),
      payment_status: 'pendiente'
    })
  }

  const deleteTreatment = async (id: string) => {
    if (confirm('¿Eliminar esta atención?')) {
      await supabase.from('treatments').delete().eq('id', id)
      if (selectedPatient) await loadPatientDetails(selectedPatient)
    }
  }

  const editTreatment = (treatment: Treatment) => {
    const treatmentDate = new Date(treatment.treatment_date)
    setEditingTreatment(treatment)
    setTreatmentForm({
      service_id: treatment.service_id || '',
      diagnosis: treatment.diagnosis || '',
      observations: treatment.observations || '',
      price_paid: treatment.price_paid?.toString() || '',
      treatment_date: treatmentDate.toISOString().split('T')[0],
      treatment_time: treatmentDate.toTimeString().slice(0, 5),
      payment_status: treatment.payment_status || 'pendiente'
    })
    setShowNewTreatmentModal(true)
  }

  // === VISTA DE PÁGINA COMPLETA DE PACIENTE ===
  if (selectedPatient && patientId) {
    return (
      <div style={styles.patientPage}>
        <button onClick={goBack} style={styles.backButton}>
          <ArrowLeft size={20} /> Volver a pacientes
        </button>

        <div style={styles.patientHeader}>
          <div style={styles.patientAvatarLarge}>{selectedPatient.name.charAt(0)}</div>
          <div style={styles.patientHeaderInfo}>
            <h1 style={styles.patientPageName}>{selectedPatient.name}</h1>
            <div style={styles.patientPageMeta}>
              {selectedPatient.date_of_birth && calculateAge(selectedPatient.date_of_birth) && (
                <span>{calculateAge(selectedPatient.date_of_birth)} años</span>
              )}
              {selectedPatient.document_type && selectedPatient.document_number && (
                <span>• {selectedPatient.document_type} {selectedPatient.document_number}</span>
              )}
              <span>• Desde {new Date(selectedPatient.created_at).toLocaleDateString('es-ES')}</span>
            </div>
          </div>
          <button onClick={() => setEditingPatient(!editingPatient)} style={styles.editBtn}>
            <Pencil size={18} /> {editingPatient ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        <div style={styles.patientGrid}>
          {/* Card de Contacto */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><Phone size={18} /> Contacto</h3>
            <div style={styles.cardContent}>
              {selectedPatient.whatsapp && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>WhatsApp</span>
                  <a href={`https://wa.me/57${selectedPatient.whatsapp.replace(/\D/g,'')}`} target="_blank" style={styles.whatsappLink}>
                    <MessageCircle size={16} /> {selectedPatient.whatsapp}
                  </a>
                </div>
              )}
              {selectedPatient.email && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>Correo</span>
                  <a href={`mailto:${selectedPatient.email}`} style={styles.emailLink}>
                    <Mail size={16} /> {selectedPatient.email}
                  </a>
                </div>
              )}
              {selectedPatient.address && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>Dirección</span>
                  <span><MapPin size={14} /> {selectedPatient.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card de Identificación */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><CreditCard size={18} /> Identificación</h3>
            <div style={styles.cardContent}>
              {selectedPatient.document_type && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>Tipo</span>
                  <span>{documentTypes.find(d => d.value === selectedPatient.document_type)?.label || selectedPatient.document_type}</span>
                </div>
              )}
              {selectedPatient.document_number && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>Número</span>
                  <span style={styles.highlightText}>{selectedPatient.document_number}</span>
                </div>
              )}
              {selectedPatient.date_of_birth && (
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>Fecha de nacimiento</span>
                  <span>{new Date(selectedPatient.date_of_birth).toLocaleDateString('es-ES')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card de Contacto de Emergencia */}
          {(selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_phone) && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}><UserPlus size={18} /> Contacto de Emergencia</h3>
              <div style={styles.cardContent}>
                {selectedPatient.emergency_contact_name && (
                  <div style={styles.contactRow}>
                    <span style={styles.contactLabel}>Nombre</span>
                    <span>{selectedPatient.emergency_contact_name}</span>
                  </div>
                )}
                {selectedPatient.emergency_contact_phone && (
                  <div style={styles.contactRow}>
                    <span style={styles.contactLabel}>Teléfono</span>
                    <a href={`https://wa.me/57${selectedPatient.emergency_contact_phone.replace(/\D/g,'')}`} target="_blank" style={styles.whatsappLink}>
                      <MessageCircle size={16} /> {selectedPatient.emergency_contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Información Médica */}
          {(selectedPatient.allergies || selectedPatient.medical_history) && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}><AlertCircle size={18} /> Información Médica</h3>
              <div style={styles.cardContent}>
                {selectedPatient.allergies && (
                  <div style={styles.medicalInfo}>
                    <span style={styles.medicalLabel}>Alergias</span>
                    <span style={styles.medicalValue}>{selectedPatient.allergies}</span>
                  </div>
                )}
                {selectedPatient.medical_history && (
                  <div style={styles.medicalInfo}>
                    <span style={styles.medicalLabel}>Historial médico</span>
                    <span style={styles.medicalValue}>{selectedPatient.medical_history}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card de Historia Clínica */}
          <div style={{...styles.card, ...styles.cardWide}}>
            <div style={styles.cardHeaderRow}>
              <h3 style={styles.cardTitle}><Stethoscope size={18} /> Historia Clínica</h3>
              <button onClick={() => setShowNewTreatmentModal(true)} style={styles.addBtn}>
                <Plus size={16} /> Nueva Atención
              </button>
            </div>
            {treatments.length === 0 ? (
              <p style={styles.emptyText}>No hay atenciones registradas</p>
            ) : (
              <div style={styles.treatmentsTable}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Servicio</th>
                      <th style={styles.th}>Diagnóstico</th>
                      <th style={styles.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map(t => (
                      <tr key={t.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(t.treatment_date).toLocaleDateString('es-ES')}</td>
                        <td style={styles.td}>{t.service?.name || '-'}</td>
                        <td style={styles.td}>{t.diagnosis || '-'}</td>
                        <td style={styles.td}>
                          <button onClick={() => { setSelectedTreatment(t); setShowTreatmentModal(true) }} style={styles.iconBtn}><Eye size={14} /></button>
                          <button onClick={() => deleteTreatment(t.id)} style={{...styles.iconBtn, color: '#dc2626'}}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card de Citas Próximas */}
          <div style={{...styles.card, ...styles.cardWide}}>
            <h3 style={styles.cardTitle}><Calendar size={18} /> Citas Próximas</h3>
            {appointments.length === 0 ? (
              <p style={styles.emptyText}>No hay citas programadas</p>
            ) : (
              <div style={styles.appointmentsList}>
                {appointments.slice(0, 3).map(apt => (
                  <div key={apt.id} style={styles.appointmentItem}>
                    <div style={styles.appointmentDate}>
                      <Clock size={14} color="#e19c96" />
                      {new Date(apt.scheduled_at).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div style={styles.appointmentService}>{apt.service?.name || 'Sin servicio'}</div>
                    <button onClick={() => sendAppointmentReminder(apt)} style={styles.reminderBtn}>
                      <Bell size={14} /> Recordar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card de Notas */}
          {selectedPatient.notes && (
            <div style={{...styles.card, ...styles.cardWide}}>
              <h3 style={styles.cardTitle}><FileText size={18} /> Notas</h3>
              <p style={styles.notes}>{selectedPatient.notes}</p>
            </div>
          )}
        </div>

        {/* Modal de Nueva Atención */}
        {showNewTreatmentModal && (
          <div style={styles.modalOverlay} onClick={() => setShowNewTreatmentModal(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>Nueva Atención</h3>
                <button onClick={() => setShowNewTreatmentModal(false)}><X size={20} /></button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}><label>Servicio</label>
                  <select 
                    value={treatmentForm.service_id} 
                    onChange={e => {
                      const selectedService = services.find(s => s.id === e.target.value)
                      setTreatmentForm({
                        ...treatmentForm, 
                        service_id: e.target.value,
                        price_paid: selectedService ? selectedService.price.toString() : ''
                      })
                    }} 
                    style={styles.select}>
                    <option value="">Seleccionar...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatPrice(s.price)}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}><label>Fecha</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="date" value={treatmentForm.treatment_date} onChange={e => setTreatmentForm({...treatmentForm, treatment_date: e.target.value})} style={{...styles.input, flex: 1}} />
                    <input type="time" value={treatmentForm.treatment_time} onChange={e => setTreatmentForm({...treatmentForm, treatment_time: e.target.value})} style={{...styles.input, width: '120px'}} />
                  </div>
                </div>
                <div style={styles.formGroup}><label>Diagnóstico</label>
                  <LexicalEditor value={treatmentForm.diagnosis} onChange={(val) => setTreatmentForm({...treatmentForm, diagnosis: val})} placeholder="Diagnóstico del paciente..." />
                </div>
                <div style={styles.formGroup}><label>Observaciones</label>
                  <LexicalEditor value={treatmentForm.observations} onChange={(val) => setTreatmentForm({...treatmentForm, observations: val})} placeholder="Observaciones adicionales..." />
                </div>
                <div style={styles.formGroup}><label>Precio (COP)</label>
                  <input type="number" value={treatmentForm.price_paid} onChange={e => setTreatmentForm({...treatmentForm, price_paid: e.target.value})} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label>Estado de Pago</label>
                  <select 
                    value={treatmentForm.payment_status} 
                    onChange={e => setTreatmentForm({...treatmentForm, payment_status: e.target.value})}
                    style={styles.select}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
                <div style={styles.modalFooter}>
                  <button onClick={() => setShowNewTreatmentModal(false)} style={styles.cancelBtn}>Cancelar</button>
                  <button onClick={handleSaveTreatment} style={styles.submitBtn}>Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Ver Atención */}
        {showTreatmentModal && selectedTreatment && (
          <div style={styles.modalOverlay} onClick={() => setShowTreatmentModal(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>Detalle de Atención</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setShowTreatmentModal(false); editTreatment(selectedTreatment) }} style={styles.editBtnSmall} title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setShowTreatmentModal(false)}><X size={20} /></button>
                </div>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.detailSection}>
                  <h4 style={styles.detailSectionTitle}>Información Principal</h4>
                  <div style={styles.detailRow}><span style={styles.detailLabel}>Fecha:</span> <span>{new Date(selectedTreatment.treatment_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                  <div style={styles.detailRow}><span style={styles.detailLabel}>Servicio:</span> <span style={styles.serviceValue}>{selectedTreatment.service?.name || 'Sin servicio'}</span></div>
                  {selectedTreatment.price_paid && <div style={styles.detailRow}><span style={styles.detailLabel}>Precio Pagado:</span> <span style={styles.priceValue}>{formatPrice(selectedTreatment.price_paid)}</span></div>}
                </div>

                {selectedTreatment.diagnosis && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>Diagnóstico</h4>
                    <div style={styles.textContent} dangerouslySetInnerHTML={{ __html: selectedTreatment.diagnosis }} />
                  </div>
                )}

                {selectedTreatment.observations && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>Observaciones</h4>
                    <div style={styles.textContent} dangerouslySetInnerHTML={{ __html: selectedTreatment.observations }} />
                  </div>
                )}

                {appointments.length > 0 && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>Próxima Cita</h4>
                    {appointments.slice(0, 1).map(apt => (
                      <div key={apt.id} style={styles.nextAppointment}>
                        <Calendar size={16} />
                        <span>{new Date(apt.scheduled_at).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</span>
                        <span style={styles.appointmentStatus}>{apt.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // === FORMULARIO NUEVO PACIENTE ===
  if (showNewPatientForm) {
    return (
      <div style={styles.newPatientPage}>
        <button onClick={() => setShowNewPatientForm(false)} style={styles.backButton}>
          <ArrowLeft size={20} /> Volver
        </button>
        
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Nuevo Paciente</h2>
          
          <div style={styles.formSection}>
            <h3 style={styles.formSectionTitle}>Información Personal</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.required}>Nombre completo *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} placeholder="Ej: María García López" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.required}>WhatsApp *</label>
                <div style={styles.whatsappInputWrapper}>
                  <span style={styles.whatsappPrefix}>+57</span>
                  <input 
                    type="tel" 
                    value={formData.whatsapp} 
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                    style={styles.whatsappInput} 
                    placeholder="3001234567" 
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.required}>Fecha de nacimiento *</label>
                <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label>Correo electrónico</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={styles.input} placeholder="correo@ejemplo.com" />
              </div>
              <div style={styles.formGroup}>
                <label>Dirección</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={styles.input} placeholder="Dirección de residencia" />
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.formSectionTitle}>Documento de Identidad</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label>Tipo de documento</label>
                <select value={formData.document_type} onChange={e => setFormData({...formData, document_type: e.target.value})} style={styles.select}>
                  <option value="">Seleccionar...</option>
                  {documentTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label>Número de documento</label>
                <input type="text" value={formData.document_number} onChange={e => setFormData({...formData, document_number: e.target.value})} style={styles.input} placeholder="Número de documento" />
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.formSectionTitle}>Contacto de Emergencia</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label>Nombre del contacto</label>
                <input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} style={styles.input} placeholder="Nombre de persona de contacto" />
              </div>
              <div style={styles.formGroup}>
                <label>Teléfono de contacto</label>
                <input type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} style={styles.input} placeholder="Teléfono de contacto" />
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.formSectionTitle}>Información Médica</h3>
            <div style={styles.formGridFull}>
              <div style={styles.formGroup}>
                <label>Alergias</label>
                <LexicalEditor value={formData.allergies} onChange={(val) => setFormData({...formData, allergies: val})} placeholder="Alergias conocidas..." />
              </div>
              <div style={styles.formGroup}>
                <label>Historial médico</label>
                <LexicalEditor value={formData.medical_history} onChange={(val) => setFormData({...formData, medical_history: val})} placeholder="Enfermedades, cirugías, tratamientos..." />
              </div>
            </div>
          </div>

          <div style={styles.formSection}>
            <h3 style={styles.formSectionTitle}>Notas</h3>
            <div style={styles.formGroup}>
              <LexicalEditor value={formData.notes} onChange={(val) => setFormData({...formData, notes: val})} placeholder="Notas adicionales sobre el paciente..." />
            </div>
          </div>

          <div style={styles.formActions}>
            <button onClick={() => setShowNewPatientForm(false)} style={styles.cancelBtn}>Cancelar</button>
            <button onClick={handleSaveNewPatient} disabled={!formData.name || !formData.whatsapp || !formData.date_of_birth} style={styles.submitBtn}>
              Guardar Paciente
            </button>
          </div>
        </div>
      </div>
    )
  }

  // === LISTA DE PACIENTES ===
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pacientes</h1>
          <p style={styles.subtitle}>{patients.length} pacientes registrados</p>
        </div>
        <button onClick={() => setShowNewPatientForm(true)} style={styles.addButton}>
          <Plus size={18} /> Nuevo paciente
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#9ca3af" />
          <input type="text" placeholder="Buscar por nombre, WhatsApp o documento..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Cargando...</div>
      ) : filteredPatients.length === 0 ? (
        <div style={styles.empty}>
          <User size={48} color="#d1d5db" />
          <p>No hay pacientes registrados</p>
        </div>
      ) : (
        <div style={styles.patientsList}>
          {filteredPatients.map(patient => (
            <div key={patient.id} style={styles.patientCard} onClick={() => viewPatient(patient)}>
              <div style={styles.patientCardLeft}>
                <div style={styles.avatar}>{patient.name.charAt(0)}</div>
                <div style={styles.patientInfo}>
                  <h3 style={styles.patientName}>{patient.name}</h3>
                  <div style={styles.patientMeta}>
                    {patient.date_of_birth && calculateAge(patient.date_of_birth) && (
                      <span>{calculateAge(patient.date_of_birth)} años</span>
                    )}
                    {patient.document_type && patient.document_number && (
                      <span>• {patient.document_type} {patient.document_number}</span>
                    )}
                  </div>
                  {(patient.treatment_count !== undefined && patient.treatment_count > 0) && (
                    <div style={styles.treatmentInfo}>
                      <Stethoscope size={12} />
                      <span>{patient.treatment_count} atención{patient.treatment_count > 1 ? 'es' : ''}</span>
                      {patient.last_treatment && (
                        <span>•Últ: {new Date(patient.last_treatment).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={styles.patientCardRight}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/patients/${patient.id}`, { state: { openTreatmentModal: true } })
                  }}
                  style={styles.attentionBtn}
                  title="Nueva Atención"
                >
                  <Stethoscope size={14} />
                </button>
                {patient.whatsapp && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); sendWhatsAppMessage(patient) }}
                      style={styles.whatsappBtn}
                      title="Enviar mensaje"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); sendGoogleReview(patient) }}
                      style={sentReviews.has(patient.id) ? styles.reviewSentBtn : styles.reviewBtn}
                      title="Enviar review"
                    >
                      {sentReviews.has(patient.id) ? '✓' : '⭐'}
                    </button>
                  </div>
                )}
                <ChevronLeft size={20} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 },
  subtitle: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' },
  addButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', backgroundColor: '#e19c96', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  toolbar: { display: 'flex', gap: '1rem' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', flex: '1 1 100%', maxWidth: '500px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.875rem', width: '100%', color: '#1f2937' },
  loading: { textAlign: 'center', padding: '3rem', color: '#6b7280' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', gap: '1rem', color: '#9ca3af' },
  patientsList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  patientCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.15s', flexWrap: 'wrap' },
  patientCardLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef5f4', color: '#e19c96', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 },
  patientInfo: {},
  patientName: { fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 },
  patientMeta: { display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' },
  treatmentInfo: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#e19c96', marginTop: '0.375rem', fontWeight: 500 },
  patientCardRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  whatsappTag: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '20px', fontSize: '0.8125rem' },
  attentionBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#fef5f4', color: '#e19c96', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' },
  
  // Página de nuevo paciente
  newPatientPage: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  backButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', color: '#6b7280', width: 'fit-content' },
  formCard: { backgroundColor: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  formTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '1.5rem' },
  formSection: { marginBottom: '1.5rem' },
  formSectionTitle: { fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' },
  formGridFull: { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  required: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem' },
  select: { padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'white' },
  textarea: { padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' },
  whatsappInputWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
  whatsappPrefix: { display: 'flex', alignItems: 'center', padding: '0 0.75rem', backgroundColor: '#f3f4f6', color: '#374151', fontSize: '0.875rem', fontWeight: 500, height: '100%', borderRight: '1px solid #e5e7eb' },
  whatsappInput: { flex: 1, padding: '0.75rem', border: 'none', borderRadius: '0', fontSize: '0.875rem', outline: 'none' },
  submitBtn: { padding: '0.75rem 1.5rem', backgroundColor: '#e19c96', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  cancelBtn: { padding: '0.75rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer', backgroundColor: 'white' },
  
  // Página de paciente completo
  patientPage: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  editBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' },
  patientHeader: { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  patientAvatarLarge: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e19c96', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600 },
  patientHeaderInfo: { flex: 1 },
  patientPageName: { fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 },
  patientPageMeta: { display: 'flex', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' },
  patientGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardWide: { gridColumn: 'span 2' },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem 0' },
  cardContent: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  contactRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  contactLabel: { fontSize: '0.8125rem', color: '#9ca3af' },
  whatsappLink: { display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#25D366', textDecoration: 'none', fontSize: '0.875rem' },
  emailLink: { display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#EA4335', textDecoration: 'none', fontSize: '0.875rem' },
  highlightText: { fontWeight: 600, color: '#1f2937' },
  medicalInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  medicalLabel: { fontSize: '0.8125rem', color: '#9ca3af' },
  medicalValue: { fontSize: '0.875rem', color: '#4b5563' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', backgroundColor: '#fef5f4', color: '#e19c96', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', cursor: 'pointer' },
  treatmentsTable: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.75rem', fontSize: '0.875rem', color: '#4b5563' },
  iconBtn: { padding: '0.25rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '4px', color: '#6b7280', marginRight: '0.25rem' },
  appointmentsList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  appointmentItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' },
  appointmentDate: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' },
  appointmentService: { flex: 1, fontSize: '0.875rem', fontWeight: 500 },
  reminderBtn: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#fef5f4', color: '#e19c96', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' },
  notes: { fontSize: '0.875rem', color: '#4b5563', whiteSpace: 'pre-wrap' },
  emptyText: { fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '1rem' },
  
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' },
  modal: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #e5e7eb' },
  modalBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' },
  detailSection: { padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' },
  detailSectionTitle: { fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' },
  detailLabel: { color: '#6b7280', fontSize: '0.875rem' },
  serviceValue: { fontWeight: 600, color: '#1f2937' },
  textContent: { fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 },
  nextAppointment: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#fef5f4', borderRadius: '8px', color: '#e19c96', fontWeight: 500 },
  appointmentStatus: { marginLeft: 'auto', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', borderRadius: '4px', fontSize: '0.75rem', color: '#16a34a' },
  priceValue: { fontWeight: 600, color: '#22c55e' },
}