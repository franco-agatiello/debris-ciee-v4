CREATE TABLE IF NOT EXISTS suscriptores (
    email TEXT PRIMARY KEY,
    nombre TEXT,
    institucion TEXT,
    pais TEXT,
    perfil TEXT,
    consentimiento INTEGER,
    confirmado INTEGER DEFAULT 0,
    token TEXT,
    fecha_registro TEXT
);
