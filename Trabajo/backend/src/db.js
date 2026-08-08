const { Pool } = require('pg');
require('dotenv').config();

// Configuración de PostgreSQL leyendo estrictamente de las variables de entorno
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL Pool:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
