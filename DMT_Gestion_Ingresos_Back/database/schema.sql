CREATE TABLE IF NOT EXISTS ingresos (
  id SERIAL PRIMARY KEY,
  ticket VARCHAR(40) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  numero_cedula VARCHAR(10) NOT NULL,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  departamento VARCHAR(80) NOT NULL,
  motivo VARCHAR(120) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ingresos_tipo_ticket UNIQUE (tipo, ticket)
);

CREATE INDEX IF NOT EXISTS ix_ingresos_tipo ON ingresos(tipo);
CREATE INDEX IF NOT EXISTS ix_ingresos_fecha_ingreso ON ingresos(fecha_ingreso);
CREATE INDEX IF NOT EXISTS ix_ingresos_numero_cedula ON ingresos(numero_cedula);
CREATE INDEX IF NOT EXISTS ix_ingresos_departamento ON ingresos(departamento);
CREATE INDEX IF NOT EXISTS ix_ingresos_estado ON ingresos(estado);

CREATE TABLE IF NOT EXISTS ingreso_imagenes (
  id SERIAL PRIMARY KEY,
  ingreso_id INTEGER NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  ruta_archivo TEXT NOT NULL,
  mime_type VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_imagen_ingreso_tipo UNIQUE (ingreso_id, tipo)
);

CREATE INDEX IF NOT EXISTS ix_ingreso_imagenes_ingreso_id ON ingreso_imagenes(ingreso_id);

CREATE TABLE IF NOT EXISTS ocr_resultados (
  id SERIAL PRIMARY KEY,
  ingreso_id INTEGER REFERENCES ingresos(id) ON DELETE SET NULL,
  tipo_cedula VARCHAR(20),
  tipo_camara VARCHAR(20),
  texto_numero TEXT,
  texto_nombres TEXT,
  texto_apellidos TEXT,
  resultado_ia_json JSONB,
  confianza DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ocr_resultados_ingreso_id ON ocr_resultados(ingreso_id);

CREATE TABLE IF NOT EXISTS ia_cache (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(64) NOT NULL UNIQUE,
  texto_numero TEXT NOT NULL DEFAULT '',
  texto_nombres TEXT NOT NULL DEFAULT '',
  texto_apellidos TEXT NOT NULL DEFAULT '',
  respuesta_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ia_cache_hash ON ia_cache(hash);
