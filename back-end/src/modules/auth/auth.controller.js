const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const env = require('../../config/env');

// [POST] /api/auth/register
const register = async (req, res, next) => {
  const { phone, email, password, full_name, role } = req.body;

  try {
    // 1. Kiểm tra đầu vào cơ bản
    if (!phone || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Số điện thoại, Mật khẩu và Họ tên' });
    }

    // 2. Kiểm tra user đã tồn tại chưa
    const checkUser = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (checkUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Số điện thoại này đã được đăng ký' });
    }

    // 3. Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 4. Mặc định role là FISHERMAN nếu không truyền
    const userRole = role || 'FISHERMAN';

    // 5. Lưu vào database
    const insertQuery = `
      INSERT INTO users (phone, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, phone, full_name, role, status, created_at
    `;
    const values = [phone, email || null, password_hash, full_name, userRole];
    const newUser = await pool.query(insertQuery, values);

    const user = newUser.rows[0];

    // 6. Tạo Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: { user, token }
    });

  } catch (error) {
    next(error);
  }
};

// [POST] /api/auth/login
const login = async (req, res, next) => {
  const { phone, password } = req.body;

  try {
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });
    }

    // 1. Lấy thông tin user từ DB
    const userResult = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    const user = userResult.rows[0];

    // 2. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng' });
    }

    // 3. Kiểm tra trạng thái tài khoản
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc khóa' });
    }

    // 4. Tạo JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: '30d' }
    );

    // Xóa password_hash trước khi trả về client
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { user, token }
    });

  } catch (error) {
    next(error);
  }
};

// [GET] /api/auth/me
const getMe = async (req, res, next) => {
  try {
    // req.user được gán từ auth.middleware.js
    const userId = req.user.id;

    const userResult = await pool.query(
      'SELECT id, phone, email, full_name, avatar_url, role, status, created_at FROM users WHERE id = $1', 
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng' });
    }

    res.json({
      success: true,
      data: userResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
