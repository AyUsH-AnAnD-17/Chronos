# Chronos Web Scheduler Backend

A robust job scheduling system built with Node.js, Express, MongoDB, Redis, and Bull Queue.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Bull Queue](https://img.shields.io/badge/Bull-FF0000?style=for-the-badge&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## Features

- **Job Types**: Immediate, Scheduled, Recurring (Cron), and Delayed jobs
- **Queue Management**: Redis-backed job queue with Bull
- **User Authentication**: JWT-based authentication with role-based access
- **Job Monitoring**: Real-time job status tracking and logs
- **Rate Limiting**: API rate limiting for security
- **System Monitoring**: Health checks and performance metrics
- **Scalable Architecture**: Microservice-ready design

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd job-scheduler-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Create logs directory:
```bash
mkdir logs
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Jobs
- `POST /api/jobs` - Create a new job
- `GET /api/jobs` - Get user's jobs (with pagination and filters)
- `GET /api/jobs/:id` - Get specific job details
- `PUT /api/jobs/:id` - Update a job
- `POST /api/jobs/:id/cancel` - Cancel a job
- `POST /api/jobs/:id/retry` - Retry a failed job
- `GET /api/jobs/:id/logs` - Get job execution logs

### Monitoring
- `GET /api/monitoring/health` - System health check
- `GET /api/monitoring/stats` - System statistics (Admin only)
- `GET /api/monitoring/metrics` - Job metrics and analytics (Admin only)

## Job Types

### 1. Immediate Jobs
Execute immediately when created.

```json
{
  "name": "Send Welcome Email",
  "type": "immediate",
  "payload": {
    "type": "email",
    "recipient": "user@example.com",
    "subject": "Welcome!",
    "template": "welcome"
  }
}
```

### 2. Scheduled Jobs
Execute at a specific future time.

```json
{
  "name": "Scheduled Report",
  "type": "scheduled",
  "scheduledAt": "2024-12-25T10:00:00Z",
  "payload": {
    "type": "data_processing",
    "reportType": "monthly"
  }
}
```

### 3. Recurring Jobs
Execute repeatedly based on cron expression.

```json
{
  "name": "Daily Cleanup",
  "type": "recurring",
  "cronExpression": "0 2 * * *",
  "payload": {
    "type": "cleanup",
    "location": "/tmp",
    "olderThan": "7d"
  }
}
```

### 4. Delayed Jobs
Execute after a specified delay.

```json
{
  "name": "Follow-up Email",
  "type": "delayed",
  "delay": 86400000,
  "payload": {
    "type": "email",
    "recipient": "user@example.com",
    "template": "followup"
  }
}
```

## Job Payload Types

The system supports various job payload types:

- **email**: Send emails
- **webhook**: Make HTTP requests
- **data_processing**: Process data
- **cleanup**: Clean up resources
- **custom**: Custom job logic

## Development

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Code Structure
```
src/
├── app.js              # Express app configuration
├── config/             # Database and service configurations
├── controllers/        # Route controllers
├── middleware/         # Express middleware
├── models/            # MongoDB models
├── routes/            # API routes
├── services/          # Business logic services
├── utils/             # Utility functions
└── validators/        # Request validation schemas
```

## Deployment

1. Set NODE_ENV to 'production'
2. Configure production MongoDB and Redis instances
3. Set strong JWT secret
4. Configure reverse proxy (nginx)
5. Set up process manager (PM2)
6. Configure logging and monitoring

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/job-scheduler |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| LOG_LEVEL | Logging level | info |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
