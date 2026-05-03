-- =====================================================
-- SCHEMA PARA CLÍNICA PODOLÓGICA - MARCELA PODOLOGÍA
-- =====================================================

-- =====================================================
-- TABLA: SERVICIOS (Tratamientos disponibles)
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: PACIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: CITAS (APPOINTMENTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'pospuesto', 'cancelado', 'completado')),
    notes TEXT,
    total_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: TRATAMIENTOS (Historial de tratamientos por paciente)
-- =====================================================
CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    appointment_id UUID REFERENCES appointments(id),
    treatment_date DATE DEFAULT CURRENT_DATE,
    diagnosis TEXT,
    observations TEXT,
    price_paid DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: INGRESOS (Seguimiento financiero)
-- =====================================================
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
    description TEXT,
    income_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INSERTAR SERVICIOS PREDEFINIDOS CON PRECIOS EN COP
-- =====================================================
INSERT INTO services (name, description, price, duration_minutes, category) VALUES
('Corte de Uñas', 'Corte y limado de uñas de los pies', 25000, 15, 'Básico'),
('Corte Uñas Micha', 'Corte de uñas con problema de encarnación', 35000, 20, 'Especializado'),
('Tratamiento Callos', 'Eliminación de callos y durezas', 40000, 30, 'Tratamiento'),
('Uñas Encarnadas', 'Tratamiento para uñas encarnadas', 45000, 30, 'Especializado'),
('Tratamiento Hongos', 'Tratamiento para hongos en uñas', 50000, 40, 'Tratamiento'),
('Masaje Podal', 'Masaje relajante para pies', 30000, 20, 'Bienestar'),
('Plantillas Ortopédicas', 'Fabricación de plantillas personalizadas', 120000, 45, 'Ortopédico'),
('Análisis Biomecánico', 'Análisis de pisada y marcha', 80000, 60, 'Evaluación'),
('Cuidado Diabético', 'Cuidado especial para pies diabéticos', 55000, 40, 'Especializado'),
('Pediluvio', 'Baño terapéutico para pies', 20000, 15, 'Bienestar'),
('Deslaminado', 'Eliminación de piel gruesa', 35000, 25, 'Tratamiento'),
('Verruga Plantar', 'Tratamiento para verrugas plantares', 45000, 30, 'Especializado')
ON CONFLICT DO NOTHING;

-- =====================================================
-- CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_date ON treatments(treatment_date);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(income_date);

-- =====================================================
-- FUNCIÓN: Obtener citas de un paciente específico
-- =====================================================
CREATE OR REPLACE FUNCTION get_patient_appointments(p_patient_id UUID)
RETURNS TABLE (
    id UUID,
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50),
    service_name VARCHAR(255),
    price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.scheduled_at,
        a.status,
        s.name,
        COALESCE(a.total_price, s.price) as price
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    WHERE a.patient_id = p_patient_id
    ORDER BY a.scheduled_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Obtener ingresos por período
-- =====================================================
CREATE OR REPLACE FUNCTION get_incomes_by_period(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
    total_amount DECIMAL(10,2),
    count_records INTEGER,
    payment_method VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(i.amount) as total_amount,
        COUNT(*) as count_records,
        i.payment_method
    FROM incomes i
    WHERE i.income_date BETWEEN p_start_date AND p_end_date
    GROUP BY i.payment_method
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Dashboard - Stats rápidas
-- =====================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_patients BIGINT,
    total_appointments BIGINT,
    total_services BIGINT,
    total_income DECIMAL(10,2),
    appointments_today BIGINT,
    pending_appointments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM patients)::BIGINT as total_patients,
        (SELECT COUNT(*) FROM appointments)::BIGINT as total_appointments,
        (SELECT COUNT(*) FROM services WHERE is_active = true)::BIGINT as total_services,
        (SELECT COALESCE(SUM(amount), 0) FROM incomes)::DECIMAL(10,2) as total_income,
        (SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_at) = CURRENT_DATE)::BIGINT as appointments_today,
        (SELECT COUNT(*) FROM appointments WHERE status = 'confirmado')::BIGINT as pending_appointments;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Citas por mes para gráficas
-- =====================================================
CREATE OR REPLACE FUNCTION get_appointments_by_month(p_months INTEGER DEFAULT 6)
RETURNS TABLE (
    month_name VARCHAR(20),
    total_count INTEGER,
    completed_count INTEGER,
    cancelled_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', generate_series), 'Mon') as month_name,
        COUNT(*)::INTEGER as total_count,
        COUNT(*) FILTER (WHERE a.status = 'completado')::INTEGER as completed_count,
        COUNT(*) FILTER (WHERE a.status = 'cancelado')::INTEGER as cancelled_count
    FROM appointments a,
         generate_series(
             CURRENT_DATE - (p_months || ' months')::INTERVAL,
             CURRENT_DATE,
             '1 month'::INTERVAL
         ) as generate_series
    WHERE DATE_TRUNC('month', a.scheduled_at) = DATE_TRUNC('month', generate_series)
    GROUP BY DATE_TRUNC('month', generate_series)
    ORDER BY DATE_TRUNC('month', generate_series);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS (Row Level Security) - SEGURIDAD
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- Políticas para services (público para lectura)
CREATE POLICY "services_read_all" ON services FOR SELECT USING (true);
CREATE POLICY "services_insert_auth" ON services FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "services_update_auth" ON services FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "services_delete_auth" ON services FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para patients (solo usuarios autenticados)
CREATE POLICY "patients_read_auth" ON patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "patients_insert_auth" ON patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "patients_update_auth" ON patients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "patients_delete_auth" ON patients FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para appointments
CREATE POLICY "appointments_read_auth" ON appointments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "appointments_insert_auth" ON appointments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "appointments_update_auth" ON appointments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "appointments_delete_auth" ON appointments FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para treatments
CREATE POLICY "treatments_read_auth" ON treatments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "treatments_insert_auth" ON treatments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "treatments_update_auth" ON treatments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "treatments_delete_auth" ON treatments FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para incomes
CREATE POLICY "incomes_read_auth" ON incomes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "incomes_insert_auth" ON incomes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "incomes_update_auth" ON incomes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "incomes_delete_auth" ON incomes FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE services IS 'Servicios/treatments ofrecidos con precios en COP';
COMMENT ON TABLE patients IS 'Pacientes de la clínica';
COMMENT ON TABLE appointments IS 'Citas programadas';
COMMENT ON TABLE treatments IS 'Historial de tratamientos realizados';
COMMENT ON TABLE incomes IS 'Registro de ingresos/pagos';

-- =====================================================
-- VERIFICAR DATOS
-- =====================================================
SELECT 'Servicios creados:' as info, COUNT(*) as total FROM services;
SELECT 'Pacientes:' as info, COUNT(*) as total FROM patients;
SELECT 'Citas:' as info, COUNT(*) as total FROM appointments;
SELECT 'Ingresos:' as info, COUNT(*) as total FROM incomes;

-- Listar servicios con precios
SELECT name, price, duration_minutes, category FROM services WHERE is_active = true ORDER BY category, name;