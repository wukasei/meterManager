const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, `.env.${process.env.NODE_ENV || 'development'}`)
});

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const routes = require('./src/routes/index');
const db = require('./models');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(express.json());


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/api', routes);

async function testDbConnection() {
  try {
    await db.sequelize.authenticate();
    console.log('Connection to the database has been established successfully');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  await testDbConnection();
});

module.exports = app;
