const vesselService = require('./vessel.service');

// [POST] /api/vessels
const createVessel = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const vesselData = req.body;

    // Kiểm tra trùng lặp mã tàu
    const exists = await vesselService.checkVesselCodeExists(vesselData.vessel_code);
    if (exists) {
      return res.status(409).json({
        status: 409,
        message: 'Mã tàu (vessel_code) đã tồn tại trong hệ thống'
      });
    }

    const newVessel = await vesselService.createVessel(owner_id, vesselData);
    
    res.status(201).json({
      status: 201,
      message: 'Đăng ký tàu thành công',
      metadata: newVessel
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/vessels
const getMyVessels = async (req, res, next) => {
  try {
    const owner_id = req.user.id;
    const vessels = await vesselService.getVesselsByOwner(owner_id);

    res.json({
      status: 200,
      message: 'Lấy danh sách tàu thành công',
      metadata: vessels
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/vessels/:id
const getVesselById = async (req, res, next) => {
  try {
    const vessel_id = req.params.id;
    const owner_id = req.user.id;

    const vessel = await vesselService.getVesselByIdAndOwner(vessel_id, owner_id);
    
    if (!vessel) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tàu hoặc bạn không có quyền truy cập tàu này (Forbidden)'
      });
    }

    res.json({
      status: 200,
      message: 'Lấy chi tiết tàu thành công',
      metadata: vessel
    });
  } catch (error) {
    next(error);
  }
};

// [PUT] /api/vessels/:id
const updateVessel = async (req, res, next) => {
  try {
    const vessel_id = req.params.id;
    const owner_id = req.user.id;
    const updateData = req.body;

    const updatedVessel = await vesselService.updateVessel(vessel_id, owner_id, updateData);

    if (!updatedVessel) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tàu hoặc bạn không có quyền cập nhật tàu này'
      });
    }

    res.json({
      status: 200,
      message: 'Cập nhật thông tin tàu thành công',
      metadata: updatedVessel
    });
  } catch (error) {
    next(error);
  }
};

// [DELETE] /api/vessels/:id
const deleteVessel = async (req, res, next) => {
  try {
    const vessel_id = req.params.id;
    const owner_id = req.user.id;

    const deleted = await vesselService.deleteVessel(vessel_id, owner_id);

    if (!deleted) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tàu hoặc bạn không có quyền xóa tàu này'
      });
    }

    res.json({
      status: 200,
      message: 'Xóa tàu thành công',
      metadata: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVessel,
  getMyVessels,
  getVesselById,
  updateVessel,
  deleteVessel
};
