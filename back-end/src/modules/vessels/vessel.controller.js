const vesselService = require('./vessel.service');

// ADMIN được thao tác trên mọi tàu (null = không lọc theo chủ tàu),
// các vai trò khác chỉ thao tác trên tàu của chính mình.
const getOwnerScope = (user) => (user.role === 'ADMIN' ? null : user.id);

// ADMIN có thể đăng ký tàu hộ người khác qua owner_phone; mặc định chủ tàu là người gọi.
const resolveOwnerId = async (user, owner_phone) => {
  if (user.role !== 'ADMIN' || !owner_phone) return user.id;
  return vesselService.findUserIdByPhone(owner_phone);
};

// [POST] /api/vessels
const createVessel = async (req, res, next) => {
  try {
    const { owner_phone, ...vesselData } = req.body;
    const owner_id = await resolveOwnerId(req.user, owner_phone);
    if (!owner_id) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tài khoản chủ tàu với số điện thoại này'
      });
    }

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
    const vessels = req.user.role === 'ADMIN'
      ? await vesselService.getAllVessels()
      : await vesselService.getVesselsByOwner(req.user.id);

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
    const owner_id = getOwnerScope(req.user);

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
    const owner_id = getOwnerScope(req.user);
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
    const owner_id = getOwnerScope(req.user);

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
    // Tàu đã có lô hàng / chuyến giao: 23001 = restrict_violation (ON DELETE RESTRICT),
    // 23503 = foreign_key_violation
    if (['23001', '23503'].includes(error.code)) {
      return res.status(409).json({
        status: 409,
        message: 'Tàu đã phát sinh lô hàng hoặc giao dịch nên không thể xóa. Hãy chuyển trạng thái sang Ngừng hoạt động.'
      });
    }
    next(error);
  }
};

// [GET] /api/vessels/locations — Danh sách tàu + vị trí mới nhất (công khai cho thành viên đăng nhập)
const getVesselsLocations = async (req, res, next) => {
  try {
    const vessels = await vesselService.getAllVesselsWithLocation();
    res.json({
      status: 200,
      message: 'Lấy danh sách vị trí tàu thành công',
      metadata: vessels,
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/vessels/my-vessel — Tàu hiện tại của user đang đăng nhập
const getMyVesselInfo = async (req, res, next) => {
  try {
    const vessel = await vesselService.getCurrentUserVessel(req.user.id);
    if (!vessel) {
      return res.status(404).json({
        status: 404,
        message: 'Bạn chưa đăng ký tàu nào',
      });
    }
    res.json({
      status: 200,
      message: 'Lấy thông tin tàu thành công',
      metadata: vessel,
    });
  } catch (error) {
    next(error);
  }
};

// [POST] /api/vessels/:id/locations — Ghi nhận vị trí GPS mới (mobile gửi định kỳ)
const addVesselLocation = async (req, res, next) => {
  try {
    const vessel_id = req.params.id;
    const owner_id = req.user.id;

    const newLocation = await vesselService.addVesselLocation(vessel_id, owner_id, req.body);
    if (!newLocation) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tàu hoặc bạn không có quyền ghi vị trí cho tàu này'
      });
    }

    res.status(201).json({
      status: 201,
      message: 'Ghi nhận vị trí GPS thành công',
      metadata: newLocation
    });
  } catch (error) {
    next(error);
  }
};

const getNavigationToVessel = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const info = await vesselService.getNavigationInfo(req.user.id, req.params.targetVesselId, lat, lng);
    res.json({
      status: 200,
      message: 'Tính toán dẫn đường thành công',
      metadata: info,
    });
  } catch (error) {
    // Lỗi domain tự định nghĩa (có field code)
    if (error.code) {
      const statusMap = {
        NO_CURRENT_VESSEL: 404,
        NO_CURRENT_LOCATION: 422,
        SAME_VESSEL: 400,
        TARGET_NOT_FOUND: 404,
        NO_TARGET_LOCATION: 422,
      };
      return res.status(statusMap[error.code] || 400).json({
        status: statusMap[error.code] || 400,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  createVessel,
  getMyVessels,
  getVesselById,
  updateVessel,
  deleteVessel,
  getVesselsLocations,
  getMyVesselInfo,
  getNavigationToVessel,
  addVesselLocation,
};
