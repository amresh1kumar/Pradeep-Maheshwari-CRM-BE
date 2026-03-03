// const express = require("express");
// const cors = require("cors");
// const http = require("http");
// const { Server } = require("socket.io");
// require("dotenv").config();
// const rateLimit = require("express-rate-limit");
// const helmet = require("helmet");
// const authRoutes = require("./routes/authRoutes");
// const dashboardRoutes = require("./routes/dashboardRoutes");
// const leadRoutes = require("./routes/leadRoutes");
// const userRoutes = require("./routes/userRoutes");
// const followupRoutes = require("./routes/followupRoutes");
// const saleRoutes = require("./routes/saleRoutes");
// const notificationRoutes = require("./routes/notificationRoutes");
// const reportRoutes = require("./routes/reportRoutes");
// const projectRoutes = require("./routes/projectRoutes")

// /* UTILS */
// const initTables = require("./config/initTables");
// const generateFollowupNotifications = require("./utils/followupNotifier");

// const app = express();
// const server = http.createServer(app);

// /* SOCKET.IO */
// // const io = new Server(server, {
// //    cors: {
// //       origin: "http://localhost:25975",
// //       methods: ["GET", "POST", "PUT", "DELETE"]
// //    }
// // });


// const io = new Server(server, {
//    cors: {
//       // origin: "http://localhost:3000",
//       origin: "*",
//       methods: ["GET", "POST", "PUT", "DELETE"]
//    }
// });

// app.set("io", io);

// /* Socket Connection */
// io.on("connection", (socket) => {
//    console.log("User connected:", socket.id);

//    socket.on("joinRoom", (userId) => {
//       socket.join(`user_${userId}`);
//       console.log(`User joined room: user_${userId}`);
//    });

//    socket.on("disconnect", () => {
//       console.log("User disconnected:", socket.id);
//    });
// });

// /* MIDDLEWARE */
// app.use(
//    cors({
//       // origin: "http://localhost:3000",
//       origin: "*",
//       credentials: true
//    })
// );
// app.use(express.json());


// app.use(helmet());
// /* ROUTES */
// const loginLimiter = rateLimit({
//    windowMs: 15 * 60 * 1000,
//    max: 10,
//    message: {
//       message: "Too many login attempts. Try again after 15 minutes."
//    }
// });

// /* ROUTES */
// app.use("/api/login", loginLimiter);
// app.use("/api", authRoutes);
// app.use("/api", dashboardRoutes);
// app.use("/api", leadRoutes);
// app.use("/api", userRoutes);
// app.use("/api", followupRoutes);
// app.use("/api", saleRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api", reportRoutes);
// app.use("/api/projects", projectRoutes)

// /* INIT DATABASE TABLES */
// (async ()=>{
//    await initTables();
// })();

// /* FOLLOWUP CHECK (still allowed if needed) */
// setInterval(() => {
//    generateFollowupNotifications(app);  // 👈 pass app
// }, 60000);

// /* START SERVER */
// server.listen(process.env.PORT, () => {
//    console.log(`Server running on port ${process.env.PORT}`);
// });

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const leadRoutes = require("./routes/leadRoutes");
const userRoutes = require("./routes/userRoutes");
const followupRoutes = require("./routes/followupRoutes");
const saleRoutes = require("./routes/saleRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const projectRoutes = require("./routes/projectRoutes");

const initTables = require("./config/initTables");
const generateFollowupNotifications = require("./utils/followupNotifier");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
   cors: {
      origin: "*", // change to frontend URL in production
      methods: ["GET", "POST", "PUT", "DELETE"]
   }
});

app.set("io", io);

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

app.use(helmet());

app.use(
   cors({
      origin: "*", // change in production
      credentials: true
   })
);

app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", leadRoutes);
app.use("/api", userRoutes);
app.use("/api", followupRoutes);
app.use("/api", saleRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", reportRoutes);
app.use("/api/projects", projectRoutes);


setInterval(() => {
   generateFollowupNotifications(app);
}, 60000);

(async () => {
   try {
      await initTables();
      console.log("Database initialized");

      server.listen(process.env.PORT, () => {
         console.log(`Server running on port ${process.env.PORT}`);
      });

   } catch (err) {
      console.error("Failed to initialize database:", err.message);
      process.exit(1);
   }
})();