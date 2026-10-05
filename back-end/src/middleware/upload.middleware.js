const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

// Chỉ nhận file ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên file hình ảnh (jpeg, png, v.v...)'), false);
  }
};

/**
 * Tạo middleware multer lưu ảnh vào uploads/<subDir>/<prefix>-<số ngẫu nhiên>.<đuôi>
 * (được phục vụ tĩnh qua /uploads, xem server.js).
 */
const createImageUpload = (subDir, prefix, maxSizeMb = 5) => {
  const uploadDir = path.join(UPLOAD_ROOT, subDir);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // Ảnh gửi từ mobile đôi khi không có đuôi file -> mặc định .jpg
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });

  return multer({ storage, limits: { fileSize: maxSizeMb * 1024 * 1024 }, fileFilter });
};

// Mặc định: upload avatar (auth.routes.js dùng trực tiếp)
module.exports = createImageUpload('avatars', 'avatar');
module.exports.createImageUpload = createImageUpload;
