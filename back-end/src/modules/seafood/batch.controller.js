const batchService = require('./batch.service');

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
    if (error.code === '23503') {
      return res.status(409).json({
        status: 409,
        message: 'Không thể xóa lô hàng này vì đang có dữ liệu ràng buộc (Images/Listings)'
      });
    }
    next(error);
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch
};
