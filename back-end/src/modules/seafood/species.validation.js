const Joi = require('joi');

const createSpeciesSchema = Joi.object({
  name_vi: Joi.string().trim().max(150).required().messages({
    'string.empty': 'Tên tiếng Việt không được để trống',
    'any.required': 'Tên tiếng Việt là bắt buộc'
  }),
  name_en: Joi.string().trim().max(150).allow('', null),
  scientific_name: Joi.string().trim().max(200).allow('', null),
  description: Joi.string().trim().allow('', null),
  image_url: Joi.string().trim().uri().allow('', null),
  status: Joi.boolean().default(true)
});

const updateSpeciesSchema = Joi.object({
  name_vi: Joi.string().trim().max(150),
  name_en: Joi.string().trim().max(150).allow('', null),
  scientific_name: Joi.string().trim().max(200).allow('', null),
  description: Joi.string().trim().allow('', null),
  image_url: Joi.string().trim().uri().allow('', null),
  status: Joi.boolean()
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 400,
      message: 'Dữ liệu không hợp lệ',
      error: error.details.map(err => err.message)
    });
  }
  next();
};

module.exports = {
  createSpeciesSchema,
  updateSpeciesSchema,
  validate
};
