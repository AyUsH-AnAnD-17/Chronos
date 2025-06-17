const Queue = require('bull');
const { getRedisClient } = require('./redis');
const logger = require('../utils/logger');
const jobService = require('../services/jobService');

let jobQueue;

const setupQueue = () => {
  try {
    jobQueue = new Queue('job processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 50,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Process jobs
    jobQueue.process('*', async (job) => {
      logger.info(`Processing job ${job.id} of type ${job.data.type}`);
      return await jobService.executeJob(job.data);
    });

    // Queue event listeners
    jobQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed with result:`, result);
    });

    jobQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
    });

    jobQueue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });

    logger.info('📋 Job queue initialized');
  } catch (error) {
    logger.error('Queue setup failed:', error);
    process.exit(1);
  }
};

const getJobQueue = () => {
  if (!jobQueue) {
    throw new Error('Job queue not initialized');
  }
  return jobQueue;
};

module.exports = { setupQueue, getJobQueue };