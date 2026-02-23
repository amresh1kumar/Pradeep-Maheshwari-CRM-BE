const db = require("../config/db");

exports.getProjects = (req, res) => {

   db.query(`
      SELECT 
         p.id,
         p.name,
         COUNT(l.id) AS lead_count
      FROM projects p
      LEFT JOIN leads l ON l.project_id = p.id
      GROUP BY p.id
      ORDER BY p.name ASC
   `, (err, result) => {

      if (err) return res.status(500).json(err);
      res.json(result);

   });

};



// exports.getProjects = (req, res) => {

//    db.query(
//       "SELECT * FROM projects ORDER BY created_at DESC",
//       (err, result) => {
//          if (err) return res.status(500).json(err);
//          res.json(result);
//       }
//    );
// };

// ✅ Create Project (Admin Only)
exports.createProject = (req, res) => {

   const { name, location } = req.body;

   if (!name) {
      return res.status(400).json({ message: "Project name required" });
   }

   db.query(
      "INSERT INTO projects (name, location) VALUES (?, ?)",
      [name.trim(), location || null],
      (err, result) => {

         if (err) {
            if (err.code === "ER_DUP_ENTRY") {
               return res.status(400).json({ message: "Project already exists" });
            }
            return res.status(500).json(err);
         }

         res.json({ message: "Project created successfully" });
      }
   );
};

// ✅ Update Project (Admin Only)
exports.updateProject = (req, res) => {

   const { id } = req.params;
   const { name, location } = req.body;

   db.query(
      "UPDATE projects SET name=?, location=? WHERE id=?",
      [name.trim(), location || null, id],
      (err) => {

         if (err) return res.status(500).json(err);

         res.json({ message: "Project updated successfully" });
      }
   );
};

// ✅ Delete Project (Admin Only)
exports.deleteProject = (req, res) => {

   const { id } = req.params;

   // Optional safety check
   db.query(
      "SELECT COUNT(*) AS total FROM leads WHERE project_id=?",
      [id],
      (err, result) => {

         if (result[0].total > 0) {
            return res.status(400).json({
               message: "Cannot delete project. Leads exist under this project."
            });
         }

         db.query(
            "DELETE FROM projects WHERE id=?",
            [id],
            (err) => {

               if (err) return res.status(500).json(err);

               res.json({ message: "Project deleted successfully" });
            }
         );
      }
   );
};