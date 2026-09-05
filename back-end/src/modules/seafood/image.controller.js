const imageService = require('./image.service');

// [POST] /api/seafood/images
const createImage = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const { batch_id, image_url, thumbnail_url, captured_at } = req.body;

    // Kiểm tra lô hàng thuộc quyền sở hữu của user (via vessel)
    const isBatchOwner = await imageService.checkBatchExistsAndOwnership(batch_id, owner_id);
    if (!isBatchOwner) {
      return res.status(403).json({
        status: 403,
        message: 'Lô hàng không tồn tại hoặc bạn không có quyền thêm ảnh vào lô hàng này'
      });
    }

    const newImage = await imageService.createImage({
      batch_id,
      image_url,
      thumbnail_url,
      uploaded_by: owner_id,
      captured_at
    });
    
    res.status(201).json({
      status: 201,
      message: 'Thêm ảnh thành công',
      metadata: newImage
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/seafood/images/batch/:batchId
const getImagesByBatchId = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const { batchId } = req.params;

    // Check ownership of the batch to view its images
    const isBatchOwner = await imageService.checkBatchExistsAndOwnership(batchId, owner_id);
    if (!isBatchOwner) {
      return res.status(403).json({
        status: 403,
        message: 'Lô hàng không tồn tại hoặc bạn không có quyền xem ảnh của lô hàng này'
      });
    }

    const images = await imageService.getImagesByBatchId(batchId);

    res.json({
      status: 200,
      message: 'Lấy danh sách ảnh thành công',
      metadata: images
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/seafood/images/:id
const getImageById = async (req, res, next) => {
  try {
    const image_id = req.params.id;
    const owner_id = req.user.id;

    const image = await imageService.getImageByIdAndOwner(image_id, owner_id);
    
    if (!image) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy ảnh hoặc bạn không có quyền truy cập'
      });
    }

    res.json({
      status: 200,
      message: 'Lấy chi tiết ảnh thành công',
      metadata: image
    });
  } catch (error) {
    next(error);
  }
};

// [PUT] /api/seafood/images/:id
const updateImage = async (req, res, next) => {
  try {
    const image_id = req.params.id;
    const owner_id = req.user.id;
    const updateData = req.body;

    // Kiểm tra quyền sở hữu ảnh (thông qua batch -> vessel)
    const isOwner = await imageService.checkImageOwnership(image_id, owner_id);
    if (!isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy ảnh hoặc bạn không có quyền cập nhật'
      });
    }

    const updatedImage = await imageService.updateImage(image_id, updateData);

    res.json({
      status: 200,
      message: 'Cập nhật thông tin ảnh thành công',
      metadata: updatedImage
    });
  } catch (error) {
    next(error);
  }
};

// [DELETE] /api/seafood/images/:id
const deleteImage = async (req, res, next) => {
  try {
    const image_id = req.params.id;
    const owner_id = req.user.id;

    const isOwner = await imageService.checkImageOwnership(image_id, owner_id);
    if (!isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy ảnh hoặc bạn không có quyền xóa'
      });
    }

    await imageService.deleteImage(image_id);

    res.json({
      status: 200,
      message: 'Xóa ảnh thành công',
      metadata: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createImage,
  getImagesByBatchId,
  getImageById,
  updateImage,
  deleteImage
};
