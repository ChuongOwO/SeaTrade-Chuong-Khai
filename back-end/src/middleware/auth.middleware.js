const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy Token xác thực (Unauthorized)'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Giải mã token
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Đính kèm thông tin user vào request để các middleware/controller sau sử dụng
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn (Forbidden)'
    });
  }
};

module.exports = authMiddleware;
