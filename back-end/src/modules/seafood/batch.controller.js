const fs = require('fs');
const batchService = require('./batch.service');
const { publishFromScanSchema } = require('./batch.validation');

// [POST] /api/seafood/batches
const createBatch = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const batchData = req.body;

    // 1. Kiểm tra Vessel thuộc về User
    const isVesselOwner = await batchService.checkVesselOwnership(batchData.vessel_id, owner_id);
    if (!isVesselOwner) {
      return res.status(403).json({
        status: 403,
        message: 'Bạn không có quyền tạo lô hàng cho tàu này'
      });
    }

    // 2. Kiểm tra Species tồn tại
    const isSpeciesExist = await batchService.checkSpeciesExists(batchData.species_id);
    if (!isSpeciesExist) {
      return res.status(404).json({
        status: 404,
        message: 'Loài hải sản không tồn tại'
      });
    }

    const newBatch = await batchService.createBatch(batchData);
    
    res.status(201).json({
      status: 201,
      message: 'Tạo lô hàng thành công',
      metadata: newBatch
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/seafood/batches
const getBatches = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const { species_id, vessel_id, status, quality_level } = req.query;
    
    const filters = {};
    if (species_id) filters.species_id = species_id;
    if (vessel_id) filters.vessel_id = vessel_id;
    if (status) filters.status = status;
    if (quality_level) filters.quality_level = quality_level;

    const batches = await batchService.getBatchesByOwner(owner_id, filters);

    res.json({
      status: 200,
      message: 'Lấy danh sách lô hàng thành công',
      metadata: batches
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/seafood/batches/:id
const getBatchById = async (req, res, next) => {
  try {
    const batch_id = req.params.id;
    const owner_id = req.user.id;

    const batch = await batchService.getBatchByIdAndOwner(batch_id, owner_id);
    
    if (!batch) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy lô hàng hoặc bạn không có quyền truy cập'
      });
    }

    res.json({
      status: 200,
      message: 'Lấy chi tiết lô hàng thành công',
      metadata: batch
    });
  } catch (error) {
    next(error);
  }
};

// [PUT] /api/seafood/batches/:id
const updateBatch = async (req, res, next) => {
  try {
    const batch_id = req.params.id;
    const owner_id = req.user.id;
    const updateData = req.body;

    // 1. Kiểm tra quyền sở hữu batch
    const isOwner = await batchService.checkBatchOwnership(batch_id, owner_id);
    if (!isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy lô hàng hoặc bạn không có quyền cập nhật'
      });
    }

    // 2. Nếu update species_id thì check tồn tại
    if (updateData.species_id) {
      const isSpeciesExist = await batchService.checkSpeciesExists(updateData.species_id);
      if (!isSpeciesExist) {
        return res.status(404).json({
          status: 404,
          message: 'Loài hải sản không tồn tại'
        });
      }
    }

    await batchService.updateBatch(batch_id, updateData);
    
    const updatedBatch = await batchService.getBatchByIdAndOwner(batch_id, owner_id);

    res.json({
      status: 200,
      message: 'Cập nhật lô hàng thành công',
      metadata: updatedBatch
    });
  } catch (error) {
    next(error);
  }
};

// [DELETE] /api/seafood/batches/:id
const deleteBatch = async (req, res, next) => {
  try {
    const batch_id = req.params.id;
    const owner_id = req.user.id;

    const isOwner = await batchService.checkBatchOwnership(batch_id, owner_id);
    if (!isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy lô hàng hoặc bạn không có quyền xóa'
      });
    }

    await batchService.deleteBatch(batch_id);

    res.json({
      status: 200,
      message: 'Xóa lô hàng thành công',
      metadata: null
    });
  } catch (error) {
    // 23001 = restrict_violation, 23503 = foreign_key_violation
    if (['23001', '23503'].includes(error.code)) {
      return res.status(409).json({
        status: 409,
        message: 'Mẻ cá đã có người trả giá hoặc đã thành đơn hàng nên không thể gỡ khỏi chợ'
      });
    }
    next(error);
  }
};
// [GET] /api/seafood/batches/market — Chợ hải sản (tất cả mẻ cá AVAILABLE)
const getMarketBatches = async (req, res, next) => {
  try {
    const batches = await batchService.getMarketBatches();
    res.json({
      status: 200,
      message: 'Lấy danh sách chợ hải sản thành công',
      metadata: batches
    });
  } catch (error) {
    next(error);
  }
};

// Xoá ảnh đã upload khi request thất bại — tránh rác trong uploads/batches
const removeUploadedFile = (file) => {
  if (file) fs.unlink(file.path, () => {});
};

// [POST] /api/seafood/batches/from-scan — đăng bán ngay từ ảnh vừa quét AI
// (multipart: field "image" + các field trong publishFromScanSchema)
const publishFromScan = async (req, res, next) => {
  const reject = (status, message, error) => {
    removeUploadedFile(req.file);
    return res.status(status).json({ status, message, error });
  };

  try {
    if (!req.file) return reject(400, 'Thiếu ảnh hải sản (field "image")');

    const { error, value } = publishFromScanSchema.validate(req.body, { abortEarly: false });
    if (error) return reject(400, 'Dữ liệu không hợp lệ', error.details.map(err => err.message));

    const seller_id = req.user.id;
    if (!(await batchService.checkVesselOwnership(value.vessel_id, seller_id))) {
      return reject(403, 'Bạn không có quyền đăng bán cho tàu này');
    }
    if (!(await batchService.checkSpeciesExists(value.species_id))) {
      return reject(404, 'Loài hải sản không tồn tại');
    }

    // multipart gửi field rỗng thành '' -> coi như không có
    const optional = (v) => (v === '' ? null : v);
    const published = await batchService.publishBatchFromScan({
      ...value,
      quality_level: optional(value.quality_level),
      latitude: optional(value.latitude),
      longitude: optional(value.longitude),
      ai_model_version: optional(value.ai_model_version),
      ai_confidence: optional(value.ai_confidence),
      ai_x1: optional(value.ai_x1),
      ai_y1: optional(value.ai_y1),
      ai_x2: optional(value.ai_x2),
      ai_y2: optional(value.ai_y2),
      seller_id,
      image_url: `/uploads/batches/${req.file.filename}`
    });

    res.status(201).json({
      status: 201,
      message: 'Đã đăng mẻ hải sản lên chợ',
      metadata: published
    });
  } catch (error) {
    removeUploadedFile(req.file);
    next(error);
  }
};

module.exports = {
  createBatch,
  publishFromScan,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getMarketBatches
};
