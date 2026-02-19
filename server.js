// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();
// const authRoutes = require("./routes/authRoutes");
// const dashboardRoutes = require("./routes/dashboardRoutes");
// const leadRoutes = require("./routes/leadRoutes");
// const userRoutes = require("./routes/userRoutes")
// const followupRoutes = require("./routes/followupRoutes");
// const initTables = require("./config/initTables");
// const saleRoutes = require("./routes/saleRoutes");
// const notificationRoutes = require("./routes/notificationRoutes");
// const generateFollowupNotifications = require("./utils/followupNotifier");
// const reportRoutes = require("./routes/reportRoutes");

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api", authRoutes);
// app.use("/api", dashboardRoutes);
// app.use("/api", leadRoutes);
// app.use("/api", userRoutes)
// app.use("/api", followupRoutes);
// app.use("/api", saleRoutes);
// app.use("/api", dashboardRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api", reportRoutes);

// initTables(); //this is call function for auto table create

// setInterval(() => {
//    generateFollowupNotifications();
// }, 60000);

// app.listen(process.env.PORT, () => {
//    console.log(`Server running on port ${process.env.PORT}`);
// });


const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

/* ROUTES */
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const leadRoutes = require("./routes/leadRoutes");
const userRoutes = require("./routes/userRoutes");
const followupRoutes = require("./routes/followupRoutes");
const saleRoutes = require("./routes/saleRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");

/* UTILS */
const initTables = require("./config/initTables");
const generateFollowupNotifications = require("./utils/followupNotifier");

/* APP */
const app = express();
const server = http.createServer(app);

/* SOCKET.IO */
const io = new Server(server, {
   cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE"]
   }
});

/* Make io available globally */
app.set("io", io);

/* Socket Connection */
io.on("connection", (socket) => {
   console.log("User connected:", socket.id);

   socket.on("joinRoom", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User joined room: user_${userId}`);
   });

   socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
   });
});

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* ROUTES */
app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", leadRoutes);
app.use("/api", userRoutes);
app.use("/api", followupRoutes);
app.use("/api", saleRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", reportRoutes);

/* INIT DATABASE TABLES */
initTables();

console.log("Database initialized");

/* FOLLOWUP CHECK (still allowed if needed) */
setInterval(() => {
   generateFollowupNotifications(app);  // 👈 pass app
}, 60000);

/* START SERVER */
server.listen(process.env.PORT, () => {
   console.log(`Server running on port ${process.env.PORT}`);
});
