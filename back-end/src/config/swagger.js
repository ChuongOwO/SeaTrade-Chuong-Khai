const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Seafood Trading API Documentation',
      version: '1.0.0',
      description: 'Hệ thống API Backend Node.js cho nền tảng giao thương hải sản ven biển',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
