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