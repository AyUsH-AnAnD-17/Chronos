const Job = require('../models/Job');
const JobLog = require('../models/JobLog');
const logger = require('../utils/logger');
const { JOB_STATUSES } = require('../utils/constants');

const executeJob = async (jobData) => {
  const startTime = Date.now();
  let job;
  
  try {
    // Find the job in database
    job = await Job.findById(jobData.id);
    if (!job) {
      throw new Error(`Job ${jobData.id} not found`);
    }

    // Update job status to active
    await job.updateStatus(JOB_STATUSES.ACTIVE);

    // Log job start
    await createJobLog(job._id, 'info', 'Job execution started', { payload: job.payload });

    // Execute job based on type
    let result;
    switch (job.payload.type) {
      case 'email':
        result = await executeEmailJob(job.payload);
        break;
      case 'webhook':
        result = await executeWebhookJob(job.payload);
        break;
      case 'data_processing':
        result = await executeDataProcessingJob(job.payload);
        break;
      case 'cleanup':
        result = await executeCleanupJob(job.payload);
        break;
      default:
        result = await executeCustomJob(job.payload);
    }

    const executionTime = Date.now() - startTime;

    // Update job as completed
    await job.updateStatus(JOB_STATUSES.COMPLETED, {
      result,
      executionTime
    });

    // Log job completion
    await createJobLog(job._id, 'info', 'Job completed successfully', { 
      result, 
      executionTime 
    });

    logger.info(`Job ${job._id} completed successfully in ${executionTime}ms`);
    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    if (job) {
      // Update job as failed
      await job.updateStatus(JOB_STATUSES.FAILED, {
        error: error.message,
        executionTime
      });

      // Log job failure
      await createJobLog(job._id, 'error', 'Job failed', { 
        error: error.message,
        stack: error.stack,
        executionTime 
      });
    }

    logger.error(`Job ${jobData.id} failed:`, error);
    throw error;
  }
};

const executeEmailJob = async (payload) => {
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    type: 'email',
    recipient: payload.recipient,
    subject: payload.subject,
    sentAt: new Date(),
    messageId: `msg_${Date.now()}`
  };
};

const executeWebhookJob = async (payload) => {
  // Simulate webhook call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    type: 'webhook',
    url: payload.url,
    method: payload.method || 'POST',
    status: 200,
    response: { success: true },
    calledAt: new Date()
  };
};

const executeDataProcessingJob = async (payload) => {
  // Simulate data processing
  const processingTime = payload.complexity === 'high' ? 3000 : 1000;
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  return {
    type: 'data_processing',
    recordsProcessed: payload.recordCount || 100,
    complexity: payload.complexity || 'medium',
    processedAt: new Date(),
    outputLocation: payload.outputPath || '/tmp/processed_data'
  };
};

const executeCleanupJob = async (payload) => {
  // Simulate cleanup operations
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    type: 'cleanup',
    itemsDeleted: payload.itemCount || 50,
    location: payload.location || '/tmp/cleanup',
    freedSpace: `${Math.random() * 100}MB`,
    cleanedAt: new Date()
  };
};

const executeCustomJob = async (payload) => {
  // Execute custom job logic
  const executionTime = Math.random() * 2000; // Random execution time
  await new Promise(resolve => setTimeout(resolve, executionTime));
  
  return {
    type: 'custom',
    action: payload.action || 'unknown',
    parameters: payload.parameters || {},
    executedAt: new Date(),
    customResult: 'Job executed successfully'
  };
};

const createJobLog = async (jobId, level, message, data = {}) => {
  try {
    await JobLog.create({
      jobId,
      level,
      message,
      data,
      executionStep: data.step || 'execution'
    });
  } catch (error) {
    logger.error('Failed to create job log:', error);
  }
};

module.exports = {
  executeJob,
  executeEmailJob,
  executeWebhookJob,
  executeDataProcessingJob,
  executeCleanupJob,
  executeCustomJob,
  createJobLog
};
