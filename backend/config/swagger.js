const swaggerJSDoc = require('swagger-jsdoc');
const PORT = process.env.PORT || 3000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Utility Management API',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

module.exports = swaggerDocs;
