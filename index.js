require("dotenv").config();
const express = require("express");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const cookieParser = require("cookie-parser");
const utilityRoutes = require("./routes/utilityRoutes");
const utilityRoute = require("./routes/utilityRoute");
const prisma = require('./config/db');





const app = express();
app.use(express.json());
app.use(cookieParser());




//app.use("/api/utilities", utilityRoutes);
app.use("/api/utilities", utilityRoute);
app.get("/health", (req, res) => {
    res.status(200).json("Utility Service is healthy ✅")
})
app.get("/", (req, res) => {
    res.json("Welcome to the Utility Service");
});
// app.use(errorHandler);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const PORT = process.env.PORT || 6500;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on('beforeExit', async () => {
    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected');
});
