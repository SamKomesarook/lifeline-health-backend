# LifeLine Health Plans - Backend API

## Overview
Backend API service for LifeLine Health Plans website, providing endpoints for contact forms, appointment scheduling, quote requests, and more.

## Tech Stack
- Node.js with Express
- PostgreSQL (hosted on Neon)
- CORS enabled for frontend integration
- Email notifications via Nodemailer

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running

### Contact & Forms
- `POST /api/contact` - Submit contact form
- `POST /api/appointment` - Request an appointment
- `POST /api/quote` - Request a quote (group insurance)
- `POST /api/survey` - Submit survey responses
- `POST /api/newsletter` - Subscribe to newsletter

### Configuration
- `GET /api/config` - Get external service URLs
- `GET /api/reviews` - Get customer reviews
- `GET /api/carriers` - Get list of insurance carriers

## Environment Variables
Create a `.env` file with the following:
```
DATABASE_URL=your_neon_database_url
PORT=5000
CORS_ORIGIN=*
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password
```

## Installation
```bash
npm install
npm start
```

## Development
```bash
npm run dev
```

## Production Deployment
The API is deployed using PM2:
```bash
pm2 start server.js --name lifeline-backend
```

## Database Schema
- `contact_submissions` - Contact form submissions
- `appointment_requests` - Appointment scheduling requests
- `quote_requests` - Insurance quote requests
- `survey_submissions` - Survey responses
- `newsletter_subscriptions` - Newsletter signups

## External Services Integration
- Calendly for appointment scheduling
- RetireFlo for Medicare surveys
- HealthSherpa for individual/family plans
- Ameritas for dental/vision
- GeoBlue for travel insurance

## Security Features
- CORS protection
- Input validation
- SQL injection prevention via parameterized queries
- Environment variable protection for sensitive data

## Contact
For more information about LifeLine Health Plans, visit www.llplans.com
