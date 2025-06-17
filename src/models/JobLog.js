const mongoose = require('mongoose');

const jobLogSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  executionStep: {
    type: String
  },
  duration: {
    type: Number // in milliseconds
  }
}, {
  timestamps: true
});

// Index for performance
jobLogSchema.index({ jobId: 1, createdAt: -1 });

module.exports = mongoose.model('JobLog', jobLogSchema);