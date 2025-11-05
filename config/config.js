require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ardigg12@',
    database: process.env.DB_NAME || 'wagateway',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log, // tampilkan query SQL di terminal (bisa dihapus jika tidak perlu)
  },

  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ardigg12@',
    database: `${process.env.DB_NAME || 'wagateway'}_test`,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },

  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Ardigg12@',
    database: process.env.DB_NAME || 'wagateway',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
};
