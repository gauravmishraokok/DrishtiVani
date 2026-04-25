const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { port } = require('./config/env');

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const sessionRoutes = require('./routes/session.routes');
const quizRoutes = require('./routes/quiz.routes');
const progressRoutes = require('./routes/progress.routes');

const app = express();

// Connect to Database
connectDB();

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (no origin) and local frontend origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use('/page-images', express.static(require('path').join(__dirname, 'uploads/page-images')));
app.use('/api/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/progress', progressRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Drishti Vani API is running...');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
