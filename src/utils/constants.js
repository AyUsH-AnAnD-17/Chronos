const JOB_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled'
};

const JOB_TYPES = {
  IMMEDIATE: 'immediate',
  SCHEDULED: 'scheduled',
  RECURRING: 'recurring',
  DELAYED: 'delayed'
};

const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

module.exports = {
  JOB_STATUSES,
  JOB_TYPES,
  USER_ROLES,
  LOG_LEVELS
};