-- Arreglar políticas de seguridad para servicios
DROP POLICY IF EXISTS "services_read_all" ON services;
DROP POLICY IF EXISTS "services_insert_auth" ON services;
DROP POLICY IF EXISTS "services_update_auth" ON services;
DROP POLICY IF EXISTS "services_delete_auth" ON services;
CREATE POLICY "services_all" ON services FOR ALL USING (true) WITH CHECK (true);

-- Insertar servicios
INSERT INTO services (name, description, price, duration_minutes, category) VALUES
('Uñas Encarnadas (Espiculotomía)', 'Tratamiento preciso para aliviar el dolor causado por uñas encarnadas, sin necesidad de retirar toda la uña. Recupera la comodidad al caminar desde la primera sesión.', 45000, 30, 'Especializado'),
('Quiropodia', 'Limpieza profunda y eliminación de durezas, callos y alteraciones dérmicas. Mejora la estética y funcionalidad del pie con atención podológica especializada.', 35000, 25, 'Tratamiento'),
('Plantillas Personalizadas', 'Fabricadas a medida para corregir pisada, aliviar molestias articulares y mejorar el rendimiento al caminar o realizar actividad física.', 120000, 45, 'Ortopédico'),
('Cauterización de Verrugas (Cuello)', 'Eliminación controlada de verrugas en zonas sensibles como el cuello mediante técnicas de cauterización seguras y eficaces.', 40000, 20, 'Tratamiento'),
('Verrugas Plantares', 'Tratamiento podológico para eliminar verrugas en la planta del pie, reduciendo el dolor al caminar y evitando su reaparición.', 45000, 30, 'Especializado'),
('Matricectomía', 'Intervención quirúrgica que elimina parcial o totalmente la matriz ungueal para resolver casos crónicos de uñas encarnadas o deformadas.', 55000, 40, 'Especializado'),
('Onicectomía', 'Procedimiento de extracción de la uña afectada por infecciones, traumatismos o alteraciones estructurales, favoreciendo una recuperación saludable.', 50000, 35, 'Especializado'),
('Ortonixia', 'Corrección progresiva de la curvatura ungueal mediante dispositivos ortésicos que evitan encarnaciones y mejoran la estética de la uña.', 40000, 30, 'Especializado'),
('Valoración de Pie Diabético', 'Evaluación clínica integral para detectar riesgos en pacientes diabéticos, incluyendo análisis de sensibilidad, circulación y estado dérmico.', 55000, 40, 'Evaluación'),
('Curación de Heridas', 'Atención especializada para heridas en pies, con técnicas de limpieza, desinfección y vendaje que favorecen una cicatrización segura.', 35000, 30, 'Tratamiento'),
('Pie de Atleta', 'Diagnóstico y tratamiento antifúngico para eliminar el hongo causante del pie de atleta, restaurando la salud y apariencia de la piel.', 35000, 25, 'Tratamiento'),
('Onicomicosis', 'Tratamiento integral para hongos en las uñas, combinando limpieza profesional, antifúngicos y seguimiento clínico para una recuperación efectiva.', 50000, 40, 'Tratamiento')
ON CONFLICT DO NOTHING;