const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'API for Utitlity Service',
    description: 'API documentation for the Utility Service',
  },
  servers: [
    {
      url: 'http://18.116.165.182:5600/auth-service',
      description: 'Production server',
    },
    {
      url: 'http://localhost:6500',
      description: 'Local development server',
    },
  ],
};

const outputFile = './swagger-output.json';
const routes = ['./index.js'];


swaggerAutogen(outputFile, routes, doc);
