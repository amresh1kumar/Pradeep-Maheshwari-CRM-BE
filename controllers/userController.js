const db = require("../config/db");

exports.getUsers = (req, res) => {
   db.query("SELECT id, name,email FROM users", (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
   });
};
