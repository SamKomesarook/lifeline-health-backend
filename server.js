const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Email transporter setup (configure with your SMTP service)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'LifeLine Health Plans API is running',
    timestamp: new Date().toISOString()
  });
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message, submissionType = 'general' } = req.body;
    
    // Validate required fields (email OR phone required, not both)
    if (!name || (!email && !phone)) {
      return res.status(400).json({ 
        error: 'Name and either email or phone number are required' 
      });
    }
    
    // Save to database
    const query = `
      INSERT INTO contact_submissions (name, email, phone, message, submission_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [name, email, phone, message, submissionType]);
    
    // Send email notification (if configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_USER,
        subject: `New Contact Form Submission - ${submissionType}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Type:</strong> ${submissionType}</p>
          <p><strong>Submitted at:</strong> ${result.rows[0].created_at}</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
    }
    
    res.json({ 
      success: true, 
      message: 'Thank you for contacting us. We will reach out to you soon!',
      submissionId: result.rows[0].id 
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// Appointment request endpoint
app.post('/api/appointment', async (req, res) => {
  try {
    const { name, email, phone, preferredDate, preferredTime, message } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Name and email are required for appointment requests' 
      });
    }
    
    const query = `
      INSERT INTO appointment_requests (name, email, phone, preferred_date, preferred_time, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [
      name, email, phone, preferredDate, preferredTime, message
    ]);
    
    res.json({ 
      success: true, 
      message: 'Appointment request received. We will contact you to confirm.',
      appointmentId: result.rows[0].id,
      calendlyUrl: process.env.CALENDLY_URL
    });
  } catch (error) {
    console.error('Appointment request error:', error);
    res.status(500).json({ error: 'Failed to submit appointment request' });
  }
});

// Quote request endpoint (for group insurance)
app.post('/api/quote', async (req, res) => {
  try {
    const { 
      companyName, 
      contactName, 
      email, 
      phone, 
      numEmployees, 
      currentProvider, 
      interestedIn 
    } = req.body;
    
    if (!contactName || !email) {
      return res.status(400).json({ 
        error: 'Contact name and email are required for quote requests' 
      });
    }
    
    const query = `
      INSERT INTO quote_requests (
        company_name, contact_name, email, phone, 
        num_employees, current_provider, interested_in
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [
      companyName, contactName, email, phone, 
      numEmployees, currentProvider, interestedIn
    ]);
    
    // Send email notification
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_USER,
        subject: `New Group Insurance Quote Request - ${companyName || 'Individual'}`,
        html: `
          <h2>New Quote Request</h2>
          <p><strong>Company:</strong> ${companyName || 'N/A'}</p>
          <p><strong>Contact Name:</strong> ${contactName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Number of Employees:</strong> ${numEmployees || 'Not specified'}</p>
          <p><strong>Current Provider:</strong> ${currentProvider || 'None'}</p>
          <p><strong>Interested In:</strong> ${interestedIn || 'General Information'}</p>
          <p><strong>Submitted at:</strong> ${result.rows[0].created_at}</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
    }
    
    res.json({ 
      success: true, 
      message: 'Quote request received. We will prepare your personalized quote and contact you soon.',
      quoteId: result.rows[0].id 
    });
  } catch (error) {
    console.error('Quote request error:', error);
    res.status(500).json({ error: 'Failed to submit quote request' });
  }
});

// Survey submission endpoint
app.post('/api/survey', async (req, res) => {
  try {
    const { surveyType, surveyData, email } = req.body;
    
    const query = `
      INSERT INTO survey_submissions (survey_type, survey_data, email)
      VALUES ($1, $2, $3)
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [
      surveyType, 
      JSON.stringify(surveyData), 
      email
    ]);
    
    res.json({ 
      success: true, 
      message: 'Survey submitted successfully. We will review and reach out to guide your journey!',
      surveyId: result.rows[0].id 
    });
  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Newsletter subscription endpoint
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required for newsletter subscription' });
    }
    
    const query = `
      INSERT INTO newsletter_subscriptions (email, name)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, created_at = CURRENT_TIMESTAMP
      RETURNING id, created_at
    `;
    
    await pool.query(query, [email, name]);
    
    res.json({ 
      success: true, 
      message: 'Successfully subscribed to our newsletter!' 
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

// Get external service URLs
app.get('/api/config', (req, res) => {
  res.json({
    calendlyUrl: process.env.CALENDLY_URL,
    medicareSurveyUrl: process.env.MEDICARE_SURVEY_URL,
    healthSherpaAgentId: process.env.HEALTHSHERPA_AGENT_ID,
    ameritasLink: process.env.AMERITAS_LINK,
    geoBlueLink: process.env.GEOBLUE_LINK
  });
});

// Testimonials/Reviews endpoint (static for now, can be dynamic later)
app.get('/api/reviews', (req, res) => {
  res.json({
    source: 'Trustpilot',
    rating: 4.9,
    totalReviews: 234,
    reviews: [
      {
        id: 1,
        name: 'John D.',
        rating: 5,
        comment: 'LifeLine Health Plans made my Medicare enrollment so easy! Their team walked me through every step.',
        date: '2024-11-15'
      },
      {
        id: 2,
        name: 'Sarah M.',
        rating: 5,
        comment: 'Excellent service! They found me a better plan and saved me money. Highly recommend!',
        date: '2024-11-10'
      },
      {
        id: 3,
        name: 'Robert K.',
        rating: 5,
        comment: 'As a small business owner, finding group insurance was overwhelming. LifeLine made it simple.',
        date: '2024-11-05'
      }
    ]
  });
});

// Insurance carriers list
app.get('/api/carriers', (req, res) => {
  res.json({
    carriers: [
      { name: 'Blue Cross Blue Shield', logo: '/logos/bcbs.png' },
      { name: 'Aetna', logo: '/logos/aetna.png' },
      { name: 'Humana', logo: '/logos/humana.png' },
      { name: 'Priority Health', logo: '/logos/priority.png' },
      { name: 'HAP', logo: '/logos/hap.png' },
      { name: 'United Healthcare', logo: '/logos/united.png' },
      { name: 'Cigna', logo: '/logos/cigna.png' },
      { name: 'Molina', logo: '/logos/molina.png' }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LifeLine Health Plans Backend API running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
    pool.end();
  });
});
