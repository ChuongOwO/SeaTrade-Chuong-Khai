require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_cho_seatrade_2026',
};
