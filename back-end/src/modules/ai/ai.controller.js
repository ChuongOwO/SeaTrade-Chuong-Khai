const aiService = require('./ai.service');

// [POST] /api/ai/detections
const createDetection = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const { image_id, species_id } = req.body;

    // 1. Kiểm tra image tồn tại và thuộc quyền sở hữu
    const isImageOwner = await aiService.checkImageOwnershipForDetection(image_id, owner_id);
    if (!isImageOwner) {
      return res.status(403).json({
        status: 403,
        message: 'Ảnh không tồn tại hoặc bạn không có quyền tạo detection cho ảnh này'
      });
    }

    // 2. Nếu có species_id, kiểm tra tồn tại
    if (species_id) {
      const isSpeciesExist = await aiService.checkSpeciesExists(species_id);
      if (!isSpeciesExist) {
        return res.status(404).json({
          status: 404,
          message: 'Loài hải sản không tồn tại'
        });
      }
    }

    const newDetection = await aiService.createDetection(req.body);

    res.status(201).json({
      status: 201,
      message: 'Tạo kết quả AI detection thành công',
      metadata: newDetection
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/ai/detections/image/:imageId
const getDetectionsByImageId = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const { imageId } = req.params;

    // Kiểm tra ownership của image
    const isImageOwner = await aiService.checkImageOwnershipForDetection(imageId, owner_id);
    if (!isImageOwner) {
      return res.status(403).json({
        status: 403,
        message: 'Ảnh không tồn tại hoặc bạn không có quyền xem detections của ảnh này'
      });
    }

    const detections = await aiService.getDetectionsByImageId(imageId);

    res.json({
      status: 200,
      message: 'Lấy danh sách AI detections thành công',
      metadata: detections
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/ai/detections/:id
const getDetectionById = async (req, res, next) => {
  try {
    const detection_id = req.params.id;
    const owner_id = req.user.id;

    const detection = await aiService.getDetectionByIdAndOwner(detection_id, owner_id);

    if (!detection) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy kết quả AI detection hoặc bạn không có quyền truy cập'
      });
    }

    res.json({
      status: 200,
      message: 'Lấy chi tiết AI detection thành công',
      metadata: detection
    });
  } catch (error) {
    next(error);
  }
};

// [PUT] /api/ai/detections/:id
const updateDetection = async (req, res, next) => {
  try {
    const detection_id = req.params.id;
    const owner_id = req.user.id;
    const updateData = req.body;

    // 1. Kiểm tra quyền sở hữu
    const isOwner = await aiService.checkDetectionOwnership(detection_id, owner_id);
    if (!isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy AI detection hoặc bạn không có quyền cập nhật'
      });
    }

    // 2. Nếu có species_id mới, kiểm tra tồn tại
    if (updateData.species_id) {
      const isSpeciesExist = await aiService.checkSpeciesExists(updateData.species_id);
      if (!isSpeciesExist) {
        return res.status(404).json({
          status: 404,
          message: 'Loài hải sản không tồn tại'
        });
      }
    }

    const updated = await aiService.updateDetection(detection_id, updateData);

    res.json({
      status: 200,
      message: 'Cập nhật AI detection thành công',
      metadata: updated
    });
  } catch (error) {
    next(error);
  }
};

// [DELETE] /api/ai/detections/:id
const deleteDetection = async (req, res, next) => {
  try {
    const detection_id = req.params.id;
    const owner_id = req.user.id;

    const isOwner = await aiService.checkDetectionOwnership(detection_id, owner_id);
    if (!isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy AI detection hoặc bạn không có quyền xóa'
      });
    }

    await aiService.deleteDetection(detection_id);

    res.json({
      status: 200,
      message: 'Xóa AI detection thành công',
      metadata: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDetection,
  getDetectionsByImageId,
  getDetectionById,
  updateDetection,
  deleteDetection
};
