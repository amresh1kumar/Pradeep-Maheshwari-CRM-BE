const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const leadRoutes = require("./routes/leadRoutes");
const userRoutes= require("./routes/userRoutes")

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", leadRoutes);
app.use("/api",userRoutes)

app.listen(process.env.PORT, () => {
   console.log(`Server running on port ${process.env.PORT}`);
});
