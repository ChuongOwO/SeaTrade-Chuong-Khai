const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const env = require('./config/env');
const pool = require('./config/database');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Seafood Trading API is running',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Seafood Trading API is running but Database connection failed',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);

// Global Error Handler
app.use(errorMiddleware);

// Start Server
app.listen(env.port, () => {
  console.log(`🚀 Seafood Trading Backend is running on http://localhost:${env.port}`);
  console.log(`👉 Health check: http://localhost:${env.port}/api/health`);
});
