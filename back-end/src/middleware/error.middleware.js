const errorMiddleware = (err, req, res, next) => {
  console.error('[Error]:', err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Lỗi hệ thống nội bộ máy chủ';

  res.status(statusCode).json({
    status: statusCode,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorMiddleware;
