const db = require("../config/db");

// exports.getUsers = (req, res) => {
//    db.query("SELECT id, name,email FROM users", (err, result) => {
//       if (err) return res.status(500).json(err);
//       res.json(result);
//    });
// };


exports.getUsers = (req, res) => {

   const query = `
      SELECT 
         users.id,
         users.name,
         users.email,
         roles.role_name
      FROM users
      JOIN roles ON users.role_id = roles.id
      ORDER BY users.id DESC
   `;

   db.query(query, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
   });
};



exports.updateUser = (req, res) => {

   const { id } = req.params;
   const { name, email, role_id } = req.body;

   db.query(
      "UPDATE users SET name=?, email=?, role_id=? WHERE id=?",
      [name, email, role_id, id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "User updated successfully" });
      }
   );
};

exports.deleteUser = (req, res) => {

   db.query(
      "DELETE FROM users WHERE id=?",
      [req.params.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "User deleted successfully" });
      }
   );
};
