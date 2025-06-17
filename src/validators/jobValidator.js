const Joi = require('joi');
const { JOB_TYPES } = require('../utils/constants');

const createJobSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().max(500).optional(),
  type: Joi.string().valid(...Object.values(JOB_TYPES)).required(),
  payload: Joi.object().required(),
  scheduledAt: Joi.date().greater('now').when('type', {
    is: JOB_TYPES.SCHEDULED,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  cronExpression: Joi.string().when('type', {
    is: JOB_TYPES.RECURRING,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  delay: Joi.number().min(0).when('type', {
    is: JOB_TYPES.DELAYED,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  priority: Joi.number().min(-10).max(10).default(0),
  maxRetries: Joi.number().min(0).max(10).default(5),
  tags: Joi.array().items(Joi.string().trim()).optional()
});

const updateJobSchema = Joi.object({
  name: Joi.string().trim().max(100).optional(),
  description: Joi.string().max(500).optional(),
  scheduledAt: Joi.date().greater('now').optional(),
  cronExpression: Joi.string().optional(),
  delay: Joi.number().min(0).optional(),
  priority: Joi.number().min(-10).max(10).optional(),
  maxRetries: Joi.number().min(0).max(10).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional()
});

module.exports = {
  createJobSchema,
  updateJobSchema
};