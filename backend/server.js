const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, `.env.${process.env.NODE_ENV || 'development'}`),
});

const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5000;

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