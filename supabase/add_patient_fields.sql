-- =====================================================
-- AGREGAR CAMPOS A TABLA PATIENTS PARA HISTORIA CLÍNICA
-- =====================================================

-- Agregar campos faltantes si no existen
ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =====================================================
-- CREAR TABLA PARA IMÁGENES DE PACIENTES (pies, lesiones, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES treatments(id),
    image_url TEXT NOT NULL,
    image_type VARCHAR(50) DEFAULT 'treatment', -- 'treatment', 'initial', 'progress', 'final'
    description TEXT,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar campo image_url a treatments si no existe
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Habilitar RLS
ALTER TABLE patient_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_images_read_auth" ON patient_images FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "patient_images_insert_auth" ON patient_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "patient_images_delete_auth" ON patient_images FOR DELETE USING (auth.role() = 'authenticated');

-- Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;