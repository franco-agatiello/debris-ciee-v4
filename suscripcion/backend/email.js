const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    secure: false
});

function enviarConfirmacion(email, nombre, confirmUrl) {
    const mailOptions = {
        from: `"Debris-CIEE" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Confirma tu suscripción para acceder a los informes',
        html: `
            <p>Hola ${nombre || ''},</p>
            <p>Gracias por suscribirte. Haz click en el siguiente enlace para confirmar tu email y acceder a los informes:</p>
            <p><a href="${confirmUrl}">${confirmUrl}</a></p>
            <p>Si no solicitaste esta suscripción, ignora este mensaje.</p>
        `
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { enviarConfirmacion };
