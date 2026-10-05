const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const env = require('./config/env');
const pool = require('./config/database');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const vesselRoutes = require('./modules/vessels/vessel.routes');
const speciesRoutes = require('./modules/seafood/species.routes');
const batchRoutes = require('./modules/seafood/batch.routes');
const imageRoutes = require('./modules/seafood/image.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const offerRoutes = require('./modules/offers/offer.routes');
const orderRoutes = require('./modules/orders/order.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 200,
      message: 'Seafood Trading API is running',
      metadata: {
        database: 'connected',
        timestamp: result.rows[0].now
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: 'Seafood Trading API is running but Database connection failed',
      error: err.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vessels', vesselRoutes);
app.use('/api/seafood/species', speciesRoutes);
app.use('/api/seafood/batches', batchRoutes);
app.use('/api/seafood/images', imageRoutes);
app.use('/api/ai/detections', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use(errorMiddleware);

// Initialize Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Pass io object to routes/controllers if needed via app locals
app.set('io', io);

const onlineUsers = new Map();

io.on('connection', (socket) => {
  // Client kết nối, gửi userId lên
  socket.on('register', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      // Gửi trạng thái online cho mọi người biết
      io.emit('user_online', userId);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      // Gửi trạng thái offline
      io.emit('user_offline', socket.userId);
    }
  });
});

// API hỗ trợ lấy trạng thái online của một user
app.get('/api/users/:id/online', (req, res) => {
  const isOnline = onlineUsers.has(req.params.id);
  res.json({ isOnline });
});

// Start Server
server.listen(env.port, () => {
  console.log(`🚀 Seafood Trading Backend is running on http://localhost:${env.port}`);
  console.log(`👉 Health check: http://localhost:${env.port}/api/health`);
  console.log(`🔌 Socket.io is ready`);
});
