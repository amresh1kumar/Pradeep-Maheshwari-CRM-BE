// const jwt = require("jsonwebtoken");

// exports.verifyToken = (req, res, next) => {
//    const token = req.headers.authorization?.split(" ")[1];

//    if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//    }

//    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//          return res.status(403).json({ message: "Invalid token" });
//       }

//       req.user = decoded;
//       next();
//    });
// };


const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
   try {

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;

      next();

   } catch (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
   }
};