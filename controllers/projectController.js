// const db = require("../config/db");


// exports.getProjects = (req, res) => {

//    let query = `
//       SELECT 
//          p.id,
//          p.name,
//          COUNT(l.id) AS lead_count
//       FROM projects p
//       LEFT JOIN leads l ON l.project_id = p.id
//    `;

//    const params = [];

//    // 🔒 Staff restriction
//    if (req.user.role !== "admin") {
//       query += " WHERE l.assigned_to = ?";
//       params.push(req.user.id);
//    }

//    query += `
//       GROUP BY p.id
//       ORDER BY p.name ASC
//    `;

//    db.query(query, params, (err, result) => {

//       if (err) return res.status(500).json(err);

//       res.json(result);

//    });

// };


// exports.createProject = (req, res) => {

//    const { name, location } = req.body;

//    if (!name) {
//       return res.status(400).json({ message: "Project name required" });
//    }

//    db.query(
//       "INSERT INTO projects (name, location) VALUES (?, ?)",
//       [name.trim(), location || null],
//       (err, result) => {

//          if (err) {
//             if (err.code === "ER_DUP_ENTRY") {
//                return res.status(400).json({ message: "Project already exists" });
//             }
//             return res.status(500).json(err);
//          }

//          res.json({ message: "Project created successfully" });
//       }
//    );
// };

// exports.updateProject = (req, res) => {

//    const { id } = req.params;
//    const { name, location } = req.body;

//    db.query(
//       "UPDATE projects SET name=?, location=? WHERE id=?",
//       [name.trim(), location || null, id],
//       (err) => {

//          if (err) return res.status(500).json(err);

//          res.json({ message: "Project updated successfully" });
//       }
//    );
// };

// // ✅ Delete Project (Admin Only)
// exports.deleteProject = (req, res) => {

//    const { id } = req.params;

//    // Optional safety check
//    db.query(
//       "SELECT COUNT(*) AS total FROM leads WHERE project_id=?",
//       [id],
//       (err, result) => {

//          if (result[0].total > 0) {
//             return res.status(400).json({
//                message: "Cannot delete project. Leads exist under this project."
//             });
//          }

//          db.query(
//             "DELETE FROM projects WHERE id=?",
//             [id],
//             (err) => {

//                if (err) return res.status(500).json(err);

//                res.json({ message: "Project deleted successfully" });
//             }
//          );
//       }
//    );
// };


const db = require("../config/db");


exports.getProjects = async (req, res) => {
   try {

      let query = `
         SELECT 
            p.id,
            p.name,
            p.location,
            COUNT(l.id) AS lead_count
         FROM projects p
         LEFT JOIN leads l ON l.project_id = p.id
      `;

      const params = [];

      // 🔒 Staff restriction → only their leads count
      if (req.user.role !== "admin") {
         query += " WHERE l.assigned_to = ?";
         params.push(req.user.id);
      }

      query += `
         GROUP BY p.id
         ORDER BY p.name ASC
      `;

      const [rows] = await db.query(query, params);

      res.json(rows);

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.createProject = async (req, res) => {
   try {

      const { name, location } = req.body;

      if (!name)
         return res.status(400).json({ message: "Project name required" });

      await db.query(
         "INSERT INTO projects (name, location) VALUES (?, ?)",
         [name.trim(), location || null]
      );

      res.json({ message: "Project created successfully" });

   } catch (err) {

      if (err.code === "ER_DUP_ENTRY") {
         return res.status(400).json({ message: "Project already exists" });
      }

      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};



exports.updateProject = async (req, res) => {
   try {

      const { id } = req.params;
      const { name, location } = req.body;

      if (!name)
         return res.status(400).json({ message: "Project name required" });

      const [existing] = await db.query(
         "SELECT id FROM projects WHERE id=?",
         [id]
      );

      if (!existing.length)
         return res.status(404).json({ message: "Project not found" });

      await db.query(
         "UPDATE projects SET name=?, location=? WHERE id=?",
         [name.trim(), location || null, id]
      );

      res.json({ message: "Project updated successfully" });

   } catch (err) {

      if (err.code === "ER_DUP_ENTRY") {
         return res.status(400).json({ message: "Project name already exists" });
      }

      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};



exports.deleteProject = async (req, res) => {
   try {

      const { id } = req.params;

      // 🔥 Safety Check → prevent delete if leads exist
      const [leadCheck] = await db.query(
         "SELECT COUNT(*) AS total FROM leads WHERE project_id=?",
         [id]
      );

      if (leadCheck[0].total > 0) {
         return res.status(400).json({
            message: "Cannot delete project. Leads exist under this project."
         });
      }

      const [existing] = await db.query(
         "SELECT id FROM projects WHERE id=?",
         [id]
      );

      if (!existing.length)
         return res.status(404).json({ message: "Project not found" });

      await db.query(
         "DELETE FROM projects WHERE id=?",
         [id]
      );

      res.json({ message: "Project deleted successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};