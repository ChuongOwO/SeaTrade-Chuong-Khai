const Joi = require('joi');

const createImageSchema = Joi.object({
  batch_id: Joi.string().uuid().required(),
  image_url: Joi.string().uri().required(),
  thumbnail_url: Joi.string().uri().allow(null, ''),
  captured_at: Joi.date().iso().allow(null)
}).options({ stripUnknown: true }); 
// using stripUnknown/allowUnknown appropriately to not allow extra fields.
// Or we can just let Joi's default behavior, which is allowUnknown: false.
// Let's set it globally for this validation function below or just rely on default.

const updateImageSchema = Joi.object({
  image_url: Joi.string().uri(),
  thumbnail_url: Joi.string().uri().allow(null, ''),
  captured_at: Joi.date().iso().allow(null)
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
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
  createImageSchema,
  updateImageSchema,
  validate
};
