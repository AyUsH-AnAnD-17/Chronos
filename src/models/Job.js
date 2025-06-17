const mongoose = require('mongoose');
const { JOB_STATUSES, JOB_TYPES } = require('../utils/constants');

const jobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Job name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  type: {
    type: String,
    enum: Object.values(JOB_TYPES),
    required: [true, 'Job type is required']
  },
  status: {
    type: String,
    enum: Object.values(JOB_STATUSES),
    default: JOB_STATUSES.PENDING
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  scheduledAt: {
    type: Date
  },
  cronExpression: {
    type: String
  },
  delay: {
    type: Number, // in milliseconds
    min: 0
  },
  priority: {
    type: Number,
    default: 0,
    min: -10,
    max: 10
  },
  maxRetries: {
    type: Number,
    default: 5,
    min: 0,
    max: 10
  },
  currentRetries: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bullJobId: {
    type: String
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  result: {
    type: mongoose.Schema.Types.Mixed
  },
  error: {
    type: String
  },
  executionTime: {
    type: Number // in milliseconds
  },
  nextRunAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for performance
jobSchema.index({ owner: 1, status: 1 });
jobSchema.index({ scheduledAt: 1 });
jobSchema.index({ status: 1, scheduledAt: 1 });
jobSchema.index({ type: 1 });
jobSchema.index({ tags: 1 });

// Update status method
jobSchema.methods.updateStatus = async function(status, additionalData = {}) {
  this.status = status;
  
  if (status === JOB_STATUSES.ACTIVE) {
    this.startedAt = new Date();
  } else if (status === JOB_STATUSES.COMPLETED) {
    this.completedAt = new Date();
    if (this.startedAt) {
      this.executionTime = this.completedAt - this.startedAt;
    }
  } else if (status === JOB_STATUSES.FAILED) {
    this.failedAt = new Date();
    this.currentRetries += 1;
  }
  
  Object.assign(this, additionalData);
  return await this.save();
};

module.exports = mongoose.model('Job', jobSchema);