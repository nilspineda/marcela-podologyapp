import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import LexicalEditor from '../components/LexicalEditor'
import { Plus, Search, Pencil, Trash2, X, DollarSign, Clock, Tag } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  is_active: boolean
  created_at: string
}

const categories = ['Básico', 'Especializado', 'Tratamiento', 'Bienestar', 'Ortopédico', 'Evaluación']

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '30',
    category: '',
    is_active: true
  })
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadServices()
  }, [user])

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name')
    
    if (!error && data) {
      setServices(data)
    }
    setLoading(false)
  }

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  )

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        category: service.category || '',
        is_active: service.is_active
      })
    } else {
      setEditingService(null)
      setFormData({
        name: '',
        description: '',
        price: '',
        duration_minutes: '30',
        category: '',
        is_active: true
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingService(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const serviceData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      duration_minutes: parseInt(formData.duration_minutes),
      category: formData.category || null,
      is_active: formData.is_active
    }

    let result
    if (editingService) {
      result = await supabase
        .from('services')
        .update({ ...serviceData, updated_at: new Date().toISOString() })
        .eq('id', editingService.id)
    } else {
      result = await supabase
        .from('services')
        .insert([serviceData])
    }

    if (result.error) {
      alert('Error al guardar servicio: ' + result.error.message)
      console.error('Error:', result.error)
      return
    }

    loadServices()
    closeModal()
  }

  const deleteService = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
      await supabase.from('services').delete().eq('id', id)
      loadServices()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Servicios</h1>
          <p style={styles.subtitle}>{services.length} servicios disponibles</p>
        </div>
        <button onClick={() => openModal()} style={styles.addButton}>
          <Plus size={18} />
          Nuevo servicio
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Buscar servicios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Cargando...</div>
      ) : filteredServices.length === 0 ? (
        <div style={styles.empty}>
          <Tag size={48} color="#d1d5db" />
          <p>No hay servicios registrados</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredServices.map(service => (
            <div key={service.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleRow}>
                  <h3 style={styles.cardTitle}>{service.name}</h3>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: service.is_active ? '#dcfce7' : '#fee2e2',
                    color: service.is_active ? '#16a34a' : '#dc2626'
                  }}>
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {service.category && (
                  <span style={styles.category}>{service.category}</span>
                )}
              </div>
              
              {service.description && (
                <p style={styles.description}>{service.description}</p>
              )}

              <div style={styles.cardFooter}>
                <div style={styles.priceTag}>
                  <DollarSign size={16} color="#e19c96" />
                  <span>{formatPrice(service.price)}</span>
                </div>
                <div style={styles.durationTag}>
                  <Clock size={14} color="#6b7280" />
                  <span>{service.duration_minutes} min</span>
                </div>
              </div>

              <div style={styles.actions}>
                <button onClick={() => openModal(service)} style={styles.actionBtn}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => deleteService(service.id)} style={{...styles.actionBtn, color: '#dc2626'}}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
              <button onClick={closeModal} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Descripción</label>
                <LexicalEditor
                  value={formData.description || ''}
                  onChange={(val) => setFormData({...formData, description: val})}
                  placeholder="Descripción del servicio..."
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Precio (COP) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    style={styles.input}
                    min="0"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Duración (min) *</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    style={styles.input}
                    min="5"
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Categoría</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  style={styles.select}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    style={styles.checkbox}
                  />
                  Servicio activo
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingService ? 'Guardar cambios' : 'Crear servicio'}
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
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 },
  subtitle: { fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' },
  addButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', backgroundColor: '#e19c96', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  toolbar: { display: 'flex', gap: '1rem' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', flex: '1 1 100%', maxWidth: '400px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.875rem', width: '100%', color: '#1f2937' },
  loading: { textAlign: 'center', padding: '3rem', color: '#6b7280' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '12px', gap: '1rem', color: '#9ca3af' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card: { padding: '1.25rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' },
  cardHeader: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  cardTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 },
  badge: { padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 },
  category: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' },
  description: { fontSize: '0.875rem', color: '#6b7280', margin: 0 },
  cardFooter: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' },
  priceTag: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1rem', fontWeight: 600, color: '#1f2937' },
  durationTag: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#6b7280' },
  actions: { display: 'flex', gap: '0.5rem', position: 'absolute', top: '1rem', right: '1rem' },
  actionBtn: { padding: '0.375rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '4px', transition: 'background-color 0.15s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' },
  modal: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid #e5e7eb' },
  closeBtn: { padding: '0.25rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280' },
  form: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem' },
  textarea: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical' },
  select: { padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: 'white' },
  checkboxGroup: { display: 'flex', alignItems: 'center' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' },
  checkbox: { width: '16px', height: '16px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.875rem', cursor: 'pointer' },
  submitBtn: { padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#e19c96', color: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
}