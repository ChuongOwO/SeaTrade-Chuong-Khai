const speciesService = require('./species.service');

// [POST] /api/seafood/species
const createSpecies = async (req, res, next) => {
  try {
    const speciesData = req.body;
    
    const exists = await speciesService.checkSpeciesNameExists(speciesData.name_vi);
    if (exists) {
      return res.status(409).json({
        status: 409,
        message: 'Tên loài hải sản (name_vi) đã tồn tại trong hệ thống'
      });
    }

    const newSpecies = await speciesService.createSpecies(speciesData);
    
    res.status(201).json({
      status: 201,
      message: 'Thêm mới loài hải sản thành công',
      metadata: newSpecies
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/seafood/species
const getAllSpecies = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filters = {};
    if (status !== undefined) filters.status = status === 'true';
    if (search) filters.search = search;

    const speciesList = await speciesService.getAllSpecies(filters);

    res.json({
      status: 200,
      message: 'Lấy danh sách loài hải sản thành công',
      metadata: speciesList
    });
  } catch (error) {
    next(error);
  }
};

// [GET] /api/seafood/species/:id
const getSpeciesById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const species = await speciesService.getSpeciesById(id);
    
    if (!species) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy loài hải sản này'
      });
    }

    res.json({
      status: 200,
      message: 'Lấy thông tin loài hải sản thành công',
      metadata: species
    });
  } catch (error) {
    next(error);
  }
};

// [PUT] /api/seafood/species/:id
const updateSpecies = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const species = await speciesService.getSpeciesById(id);
    if (!species) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy loài hải sản này'
      });
    }

    if (updateData.name_vi && updateData.name_vi !== species.name_vi) {
      const exists = await speciesService.checkSpeciesNameExists(updateData.name_vi, id);
      if (exists) {
        return res.status(409).json({
          status: 409,
          message: 'Tên loài hải sản (name_vi) đã tồn tại trong hệ thống'
        });
      }
    }

    const updatedSpecies = await speciesService.updateSpecies(id, updateData);

    res.json({
      status: 200,
      message: 'Cập nhật loài hải sản thành công',
      metadata: updatedSpecies
    });
  } catch (error) {
    next(error);
  }
};

// [DELETE] /api/seafood/species/:id
const deleteSpecies = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const species = await speciesService.getSpeciesById(id);
    if (!species) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy loài hải sản này'
      });
    }

    await speciesService.deleteSpecies(id);

    res.json({
      status: 200,
      message: 'Xóa loài hải sản thành công',
      metadata: null
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        status: 409,
        message: 'Không thể xóa loài hải sản này vì đang có Lô hàng (Batch) sử dụng'
      });
    }
    next(error);
  }
};

module.exports = {
  createSpecies,
  getAllSpecies,
  getSpeciesById,
  updateSpecies,
  deleteSpecies
};
