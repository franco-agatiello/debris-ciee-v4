require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const emailer = require('./email');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Endpoint: consulta estado de email
app.post('/api/estado-email', (req, res) => {
    const { email } = req.body;
    db.get('SELECT confirmado FROM suscriptores WHERE email = ?', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!row) return res.json({ registrado: false, confirmado: false });
        return res.json({ registrado: true, confirmado: !!row.confirmado });
    });
});

// Endpoint: suscripción y envío de confirmación
app.post('/api/suscripcion', (req, res) => {
    const { email, nombre, institucion, pais, perfil, consentimiento } = req.body;
    // Generar token único
    const token = crypto.randomBytes(24).toString('hex');
    const fecha_registro = new Date().toISOString();

    // Insertar o actualizar usuario en DB
    db.run(
        `INSERT OR REPLACE INTO suscriptores 
        (email, nombre, institucion, pais, perfil, consentimiento, confirmado, token, fecha_registro) 
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [email, nombre, institucion, pais, perfil, consentimiento ? 1 : 0, token, fecha_registro],
        function(err) {
            if (err) return res.status(500).json({ error: 'DB error' });

            // Enviar mail de confirmación
            const confirmUrl = `${process.env.APP_URL}/api/confirmar?token=${token}`;
            emailer.enviarConfirmacion(email, nombre, confirmUrl)
                .then(() => {
                    res.json({ ok: true, enviado: true });
                })
                .catch(error => {
                    res.status(500).json({ error: 'No se pudo enviar el email de confirmación.' });
                });
        }
    );
});

// Endpoint: confirmar email
app.get('/api/confirmar', (req, res) => {
    const { token } = req.query;
    db.get('SELECT email FROM suscriptores WHERE token = ?', [token], (err, row) => {
        if (err || !row) {
            return res.status(400).send('Token inválido o expirado.');
        }
        db.run('UPDATE suscriptores SET confirmado = 1 WHERE token = ?', [token], function(err) {
            if (err) return res.status(500).send('Error al confirmar email.');
            res.send('¡Email confirmado correctamente! Ya puedes acceder a los informes.');
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de suscripción corriendo en puerto ${PORT}`);
});
