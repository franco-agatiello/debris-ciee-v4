const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./suscriptores.db');

// Ejecutar el esquema al iniciar
const fs = require('fs');
const schema = fs.readFileSync(__dirname + '/schema.sql', 'utf8');
db.exec(schema);

module.exports = db;
