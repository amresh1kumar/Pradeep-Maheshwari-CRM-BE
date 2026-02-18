const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const leadRoutes = require("./routes/leadRoutes");
const userRoutes = require("./routes/userRoutes")
const followupRoutes = require("./routes/followupRoutes");
const initTables = require("./config/initTables");
const saleRoutes = require("./routes/saleRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const generateFollowupNotifications = require("./utils/followupNotifier");




const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", leadRoutes);
app.use("/api", userRoutes)
app.use("/api", followupRoutes);
app.use("/api", saleRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);


initTables(); //this is call function for auto table create

setInterval(() => {
   generateFollowupNotifications();
}, 60000);

app.listen(process.env.PORT, () => {
   console.log(`Server running on port ${process.env.PORT}`);
});
