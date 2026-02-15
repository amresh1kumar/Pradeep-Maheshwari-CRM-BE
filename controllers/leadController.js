const db = require("../config/db");

// exports.createLead = (req, res) => {

//    const { name, phone, email, source, status, assigned_to } = req.body;

//    // 🔥 Admin assign manually
//    // 🔥 Staff auto assign to himself
//    const assignedUser =
//       req.user.role === "admin"
//          ? assigned_to || null
//          : req.user.id;

//    db.query(
//       "INSERT INTO leads (name,phone,email,source,status,assigned_to) VALUES (?,?,?,?,?,?)",
//       [name, phone, email, source, status, assignedUser],
//       (err) => {
//          if (err) return res.status(500).json(err);

//          res.json({ message: "Lead created successfully" });
//       }
//    );
// };


exports.createLead = (req, res) => {
   const { name, phone, email, source, status, assigned_to } = req.body;

   let assignUserId;

   if (req.user.role === "admin") {
      // Admin can assign manually
      assignUserId = assigned_to || null;
   } else {
      // Staff auto assign to self
      assignUserId = req.user.id;
   }

   db.query(
      "INSERT INTO leads (name,phone,email,source,status,assigned_to) VALUES (?,?,?,?,?,?)",
      [name, phone, email, source, status || "New", assignUserId],
      (err, result) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Lead created successfully" });
      }
   );
};


exports.getLeads = (req, res) => {

   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 5;
   const status = req.query.status;

   const offset = (page - 1) * limit;

   const userId = req.user.id;
   const userRole = req.user.role;

   let whereConditions = [];
   let values = [];

   // 🔹 Role-based restriction
   if (userRole !== "admin") {
      whereConditions.push("leads.assigned_to = ?");
      values.push(userId);
   }

   // 🔹 Status filter
   if (status) {
      whereConditions.push("leads.status = ?");
      values.push(status);
   }

   let whereClause = "";
   if (whereConditions.length > 0) {
      whereClause = "WHERE " + whereConditions.join(" AND ");
   }

   // 🔹 Count Query
   const countQuery = `
    SELECT COUNT(*) as total
    FROM leads
    ${whereClause}
  `;

   db.query(countQuery, values, (err, countResult) => {
      if (err) return res.status(500).json(err);

      const total = countResult[0].total;

      const dataQuery = `
      SELECT leads.*, users.name AS assigned_user
      FROM leads
      LEFT JOIN users ON leads.assigned_to = users.id
      ${whereClause}
      LIMIT ? OFFSET ?
    `;

      db.query(dataQuery, [...values, limit, offset], (err, dataResult) => {
         if (err) return res.status(500).json(err);

         res.json({
            data: dataResult,
            total: total
         });
      });
   });
};


// exports.updateLead = (req, res) => {

//    const { id } = req.params;
//    const { name, phone, email, source, status, assigned_to } = req.body;

//    // 🔥 If not admin, check ownership
//    if (req.user.role !== "admin") {

//       db.query(
//          "SELECT * FROM leads WHERE id = ? AND assigned_to = ?",
//          [id, req.user.id],
//          (err, result) => {

//             if (err) return res.status(500).json(err);

//             if (result.length === 0) {
//                return res.status(403).json({
//                   message: "You can only edit your assigned leads"
//                });
//             }

//             // 🔥 Safe to update
//             db.query(
//                "UPDATE leads SET name=?, phone=?, email=?, source=?, status=? WHERE id=?",
//                [name, phone, email, source, status, id],
//                (err) => {
//                   if (err) return res.status(500).json(err);
//                   res.json({ message: "Lead updated successfully" });
//                }
//             );
//          }
//       );

//    } else {

//       // 🔥 Admin can edit everything
//       db.query(
//          "UPDATE leads SET name=?, phone=?, email=?, source=?, status=?, assigned_to=? WHERE id=?",
//          [name, phone, email, source, status, assigned_to, id],
//          (err) => {
//             if (err) return res.status(500).json(err);
//             res.json({ message: "Lead updated successfully" });
//          }
//       );
//    }
// };


exports.updateLead = (req, res) => {
   const { id } = req.params;
   const { name, phone, email, source, status, assigned_to } = req.body;

   // If staff → only update own leads
   let checkQuery = "SELECT assigned_to FROM leads WHERE id = ?";

   db.query(checkQuery, [id], (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0)
         return res.status(404).json({ message: "Lead not found" });

      const lead = result[0];

      if (req.user.role !== "admin" && lead.assigned_to !== req.user.id) {
         return res.status(403).json({ message: "Not allowed to edit this lead" });
      }

      // Update allowed
      db.query(
         "UPDATE leads SET name=?, phone=?, email=?, source=?, status=?, assigned_to=? WHERE id=?",
         [name, phone, email, source, status, assigned_to || lead.assigned_to, id],
         (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Lead updated successfully" });
         }
      );
   });
};

exports.getSingleLead = (req, res) => {

   const { id } = req.params;

   db.query(
      `SELECT leads.*, users.name AS assigned_user
     FROM leads
     LEFT JOIN users ON leads.assigned_to = users.id
     WHERE leads.id = ?`,
      [id],
      (err, result) => {

         if (err) return res.status(500).json(err);

         if (result.length === 0) {
            return res.status(404).json({ message: "Lead not found" });
         }

         res.json(result[0]);
      }
   );
};



exports.deleteLead = (req, res) => {
   const { id } = req.params;

   db.query("DELETE FROM leads WHERE id=?", [id], (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Lead deleted successfully" });
   });
};


exports.getLeadStats = (req, res) => {

   db.query(`
    SELECT 
      COUNT(*) AS total,
      SUM(status='New') AS newCount,
      SUM(status='Contacted') AS contacted,
      SUM(status='Closed') AS closedCount
    FROM leads
  `, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
   });
};
