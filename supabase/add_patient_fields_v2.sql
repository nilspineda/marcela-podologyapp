-- =====================================================
-- AGREGAR CAMPOS DE DOCUMENTO Y CONTACTO A PATIENTS
-- =====================================================

-- Agregar campos de identificación
ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_type VARCHAR(10);  -- CC, CE, TI, RC, NIT, otro
ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);  -- Nombre del contacto de emergencia
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);  -- Teléfono del contacto

-- Verificar estructura actualizada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;