const db = require("../config/db");
const XLSX = require("xlsx");
const fs = require("fs");


const addActivity = (leadId, userId, action) => {
   db.query(
      `INSERT INTO lead_activities(lead_id,user_id,action) VALUES(?,?,?)`, [leadId, userId, action]
   )
}

// exports.createLead = (req, res) => {

//    const {
//       name,
//       phone,
//       email,
//       source,
//       status,
//       assigned_to
//    } = req.body;

//    let assignUserId;

//    if (req.user.role === "admin") {
//       assignUserId = assigned_to || null;
//    } else {
//       assignUserId = req.user.id;
//    }

//    db.query(
//       `INSERT INTO leads 
//        (name, phone, email, source, status, assigned_to, created_by)
//        VALUES (?,?,?,?,?,?,?)`,
//       [
//          name,
//          phone,
//          email,
//          source,
//          status || "New",
//          assignUserId,
//          req.user.id
//       ],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "Lead created successfully" });
//          addActivity(result.insertId, req.user.id, "Lead Created");
//       }
//    );
// };

exports.createLead = (req, res) => {

   const { name, phone, email, source, status, assigned_to } = req.body;

   let assignUserId =
      req.user.role === "admin"
         ? assigned_to || null
         : req.user.id;

   db.query(
      `INSERT INTO leads 
       (name, phone, email, source, status, assigned_to, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [
         name,
         phone,
         email,
         source,
         status || "New",
         assignUserId,
         req.user.id
      ],
      (err, result) => {

         if (err) return res.status(500).json(err);

         addActivity(result.insertId, req.user.id, "Lead Created");

         res.json({ message: "Lead created successfully" });
      }
   );
};



// exports.getLeads = (req, res) => {

//    const { page = 1, limit = 10, status } = req.query;
//    const offset = (page - 1) * limit;

//    let query = `
//       SELECT leads.*, 
//              users.name AS assigned_user,
//              creator.name AS created_by_name
//       FROM leads
//       LEFT JOIN users ON leads.assigned_to = users.id
//       LEFT JOIN users creator ON leads.created_by = creator.id
//    `;

//    const params = [];
//    const conditions = [];

//    if (req.user.role !== "admin") {
//       conditions.push("leads.assigned_to = ?");
//       params.push(req.user.id);
//    }

//    if (status) {
//       conditions.push("leads.status = ?");
//       params.push(status);
//    }

//    if (conditions.length > 0) {
//       query += " WHERE " + conditions.join(" AND ");
//    }

//    query += " ORDER BY leads.created_at DESC LIMIT ? OFFSET ?";
//    params.push(Number(limit), Number(offset));

//    db.query(query, params, (err, result) => {
//       if (err) return res.status(500).json(err);

//       let countQuery = "SELECT COUNT(*) AS total FROM leads";
//       let countParams = [];

//       if (conditions.length > 0) {
//          countQuery += " WHERE " + conditions.join(" AND ");
//          countParams = params.slice(0, conditions.length);
//       }

//       db.query(countQuery, countParams, (err, countResult) => {
//          if (err) return res.status(500).json(err);

//          res.json({
//             data: result,
//             total: countResult[0].total
//          });
//       });
//    });
// };

// exports.updateLead = (req, res) => {

//    const { id } = req.params;
//    const {
//       name,
//       phone,
//       email,
//       source,
//       status,
//       assigned_to,
//    } = req.body;

//    const io = req.app.get("io");

//    db.query(
//       "SELECT * FROM leads WHERE id=?",
//       [id],
//       (err, oldResult) => {

//          if (err) return res.status(500).json(err);
//          if (!oldResult.length)
//             return res.status(404).json({ message: "Lead not found" });

//          const oldLead = oldResult[0];

//          const newStatus = status || oldLead.status;
//          const newAssigned = assigned_to ?? oldLead.assigned_to;

//          db.query(
//             `UPDATE leads 
//              SET name=?, 
//                  phone=?, 
//                  email=?, 
//                  source=?, 
//                  status=?, 
//                  assigned_to=? 
//              WHERE id=?`,
//             [
//                name ?? oldLead.name,
//                phone ?? oldLead.phone,
//                email ?? oldLead.email,
//                source ?? oldLead.source,
//                newStatus,
//                newAssigned,
//                id
//             ],
//             (err) => {

//                if (err) return res.status(500).json(err);

//                // 🔔 Assignment notification
//                if (newAssigned && newAssigned !== oldLead.assigned_to) {

//                   const message = `New Lead Assigned: ${oldLead.name}`;

//                   db.query(
//                      `INSERT INTO notifications (user_id, message, type)
//                       VALUES (?, ?, 'assignment')`,
//                      [newAssigned, message]
//                   );

//                   io.to(`user_${newAssigned}`).emit("newNotification", {
//                      message,
//                      type: "assignment"
//                   });
//                }
//                addActivity(id, req.user.id, `Lead Assigned to User ID ${newAssigned}`);
//                res.json({ message: "Lead updated successfully" });
//                addActivity(id, req.user.id, `Lead Updated (Status:${newStatus})`);
//             }
//          );
//       }
//    );
// };

exports.getLeads = (req, res) => {

   const { page = 1, limit = 10, status, search } = req.query;
   const offset = (page - 1) * limit;

   let query = `
      SELECT leads.*, 
             users.name AS assigned_user,
             creator.name AS created_by_name
      FROM leads
      LEFT JOIN users ON leads.assigned_to = users.id
      LEFT JOIN users creator ON leads.created_by = creator.id
   `;

   const params = [];
   const conditions = [];

   // 🔒 Staff restriction
   if (req.user.role !== "admin") {
      conditions.push("leads.assigned_to = ?");
      params.push(req.user.id);
   }

   // 🔍 Status filter
   if (status) {
      conditions.push("leads.status = ?");
      params.push(status);
   }

   // 🔎 Global Search
   if (search) {
      conditions.push(`
         (
            leads.name LIKE ? OR
            leads.phone LIKE ? OR
            leads.email LIKE ?
         )
      `);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
   }

   if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
   }

   query += " ORDER BY leads.created_at DESC LIMIT ? OFFSET ?";
   params.push(Number(limit), Number(offset));

   db.query(query, params, (err, result) => {
      if (err) return res.status(500).json(err);

      // COUNT QUERY
      let countQuery = `
   SELECT COUNT(*) AS total
   FROM leads
`;

      const countParams = [];
      const countConditions = [];

      // Staff restriction
      if (req.user.role !== "admin") {
         countConditions.push("leads.assigned_to = ?");
         countParams.push(req.user.id);
      }

      // Status filter
      if (status) {
         countConditions.push("leads.status = ?");
         countParams.push(status);
      }

      // Search filter
      if (search) {
         countConditions.push(`
      (
         leads.name LIKE ? OR
         leads.phone LIKE ? OR
         leads.email LIKE ?
      )
   `);
         countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (countConditions.length > 0) {
         countQuery += " WHERE " + countConditions.join(" AND ");
      }

      db.query(countQuery, countParams, (err, countResult) => {
         if (err) return res.status(500).json(err);

         res.json({
            data: result,
            total: countResult[0].total
         });
      });
   });
};

exports.updateLead = (req, res) => {

   const { id } = req.params;
   const { name, phone, email, source, status, assigned_to } = req.body;

   const io = req.app.get("io");

   db.query(
      "SELECT * FROM leads WHERE id=?",
      [id],
      (err, oldResult) => {

         if (err) return res.status(500).json(err);
         if (!oldResult.length)
            return res.status(404).json({ message: "Lead not found" });

         const oldLead = oldResult[0];

         const newStatus = status || oldLead.status;
         const newAssigned = assigned_to ?? oldLead.assigned_to;

         db.query(
            `UPDATE leads 
             SET name=?, phone=?, email=?, source=?, status=?, assigned_to=? 
             WHERE id=?`,
            [
               name ?? oldLead.name,
               phone ?? oldLead.phone,
               email ?? oldLead.email,
               source ?? oldLead.source,
               newStatus,
               newAssigned,
               id
            ],
            (err) => {

               if (err) return res.status(500).json(err);

               // 🔔 Assignment change
               if (newAssigned && newAssigned !== oldLead.assigned_to) {

                  const message = `New Lead Assigned: ${oldLead.name}`;

                  db.query(
                     `INSERT INTO notifications (user_id, message, type)
                      VALUES (?, ?, 'assignment')`,
                     [newAssigned, message]
                  );

                  io.to(`user_${newAssigned}`).emit("newNotification", {
                     message,
                     type: "assignment"
                  });

                  addActivity(id, req.user.id, "Lead Assigned");
               }

               // 🔄 Status change
               if (newStatus !== oldLead.status) {
                  addActivity(id, req.user.id, `Status changed to ${newStatus}`);
               }

               res.json({ message: "Lead updated successfully" });
            }
         );
      }
   );
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

// exports.importLeadsFromExcel = (req, res) => {

//    if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//    }

//    const workbook = XLSX.readFile(req.file.path);
//    const sheetName = workbook.SheetNames[0];
//    const sheetData = XLSX.utils.sheet_to_json(
//       workbook.Sheets[sheetName]
//    );

//    if (!sheetData.length) {
//       return res.status(400).json({ message: "Excel file empty" });
//    }

//    const leads = sheetData.map(row => [
//       row.Name,
//       row.Phone,
//       row.Email,
//       row.Source || "Website",
//       "New",
//       req.user.id,
//       req.user.id
//    ]);

//    const query = `
//       INSERT INTO leads 
//       (name, phone, email, source, status, assigned_to, created_by)
//       VALUES ?
//    `;

//    db.query(query, [leads], (err, result) => {
//       fs.unlinkSync(req.file.path); // delete uploaded file

//       if (err) return res.status(500).json(err);

//       res.json({
//          message: `${result.affectedRows} leads imported successfully`
//       });
//    });
// };


exports.importLeadsFromExcel = (req, res) => {

   if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
   }

   const workbook = XLSX.readFile(req.file.path);
   const sheetName = workbook.SheetNames[0];
   const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
   );

   if (!sheetData.length) {
      return res.status(400).json({ message: "Excel file empty" });
   }

   let inserted = 0;
   let updated = 0;
   let skipped = 0;

   const processRow = (row) => {

      return new Promise((resolve) => {

         const { Name, Phone, Email, Source } = row;

         if (!Email && !Phone) {
            skipped++;
            return resolve();
         }

         // Check duplicate by email OR phone
         db.query(
            "SELECT id FROM leads WHERE email=? OR phone=?",
            [Email || "", Phone || ""],
            (err, existing) => {

               if (existing && existing.length > 0) {

                  // UPDATE existing
                  db.query(
                     `UPDATE leads 
                      SET name=?, source=? 
                      WHERE id=?`,
                     [
                        Name,
                        Source || "Website",
                        existing[0].id
                     ],
                     () => {
                        updated++;
                        resolve();
                     }
                  );

               } else {

                  // INSERT new
                  db.query(
                     `INSERT INTO leads
                      (name, phone, email, source, status, assigned_to, created_by)
                      VALUES (?,?,?,?,?,?,?)`,
                     [
                        Name,
                        Phone,
                        Email,
                        Source || "Website",
                        "New",
                        req.user.id,
                        req.user.id
                     ],
                     () => {
                        inserted++;
                        resolve();
                     }
                  );
               }

            }
         );

      });
   };

   Promise.all(sheetData.map(processRow))
      .then(() => {

         fs.unlinkSync(req.file.path);

         res.json({
            message: "Import completed",
            summary: {
               total: sheetData.length,
               inserted,
               updated,
               skipped
            }
         });

      })
      .catch(() => {
         res.status(500).json({ message: "Import failed" });
      });

};

exports.exportLeads = (req, res) => {

   db.query(`
      SELECT 
         leads.name,
         leads.phone,
         leads.email,
         leads.source,
         leads.status,
         u1.name AS assigned_to,
         u2.name AS created_by
      FROM leads
      LEFT JOIN users u1 ON leads.assigned_to = u1.id
      LEFT JOIN users u2 ON leads.created_by = u2.id
   `, (err, result) => {

      if (err) return res.status(500).json(err);

      if (result.length === 0) {
         return res.status(400).json({ message: "No leads found" });
      }

      const worksheet = XLSX.utils.json_to_sheet(result);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

      const buffer = XLSX.write(workbook, {
         type: "buffer",
         bookType: "xlsx"
      });

      res.setHeader(
         "Content-Disposition",
         "attachment; filename=Leads.xlsx"
      );

      res.setHeader(
         "Content-Type",
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);

   });
};

exports.convertLeadToSale = (req, res) => {

   const { id } = req.params;
   const { sale_amount, closing_date } = req.body;

   const io = req.app.get("io");

   db.query(
      `INSERT INTO sale_details 
       (lead_id, sale_amount, closing_date, created_by)
       VALUES (?, ?, ?, ?)`,
      [id, sale_amount, closing_date, req.user.id],
      (err) => {

         if (err) return res.status(500).json(err);

         db.query(
            `UPDATE leads 
             SET status='Closed Won', is_converted=1 
             WHERE id=?`,
            [id]
         );

         db.query(
            `
            SELECT 
               l.name AS lead_name,
               l.assigned_to,
               u.name AS converted_by
            FROM leads l
            JOIN users u ON u.id = ?
            WHERE l.id = ?
            `,
            [req.user.id, id],
            (err, result) => {

               if (!result.length) return;

               const lead = result[0];

               const message =
                  `Lead "${lead.lead_name}" converted to Sale ₹${sale_amount} by ${lead.converted_by}`;

               const notifyUsers = [];

               if (lead.assigned_to)
                  notifyUsers.push(lead.assigned_to);

               db.query(
                  `SELECT id FROM users WHERE role_id = 1`,
                  (err, admins) => {

                     admins.forEach(admin => {
                        notifyUsers.push(admin.id);
                     });

                     const uniqueUsers = [...new Set(notifyUsers)];

                     uniqueUsers.forEach(userId => {

                        db.query(
                           `INSERT INTO notifications (user_id, message, type)
                            VALUES (?, ?, 'sale')`,
                           [userId, message]
                        );

                        io.to(`user_${userId}`).emit("newNotification", {
                           message,
                           type: "sale"
                        });

                     });

                  }
               );

            }
         );
         addActivity(id, req.user.id, `Converted to Sale ₹${sale_amount}`);
         res.json({ message: "Lead converted successfully" });
      }
   );
};

exports.getAllSales = (req, res) => {

   const userId = req.user.id;
   const userRole = req.user.role;

   let query = `
      SELECT 
         s.*,
         l.name AS lead_name,
         creator.name AS created_by_name,
         assigned.name AS assigned_to_name
      FROM sale_details s
      JOIN leads l ON s.lead_id = l.id
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN users assigned ON l.assigned_to = assigned.id
   `;

   const values = [];

   // 🔒 Staff restriction
   if (userRole !== "admin") {
      query += " WHERE s.created_by = ?";
      values.push(userId);
   }

   query += " ORDER BY s.id DESC";

   db.query(query, values, (err, result) => {

      if (err) return res.status(500).json(err);

      res.json(result);
   });
};

exports.getLeadsPipeline = (req, res) => {

   let query = `
      SELECT id, name, status, assigned_to
      FROM leads
   `;

   const params = [];

   if (req.user.role !== "admin") {
      query += " WHERE assigned_to = ?";
      params.push(req.user.id);
   }

   db.query(query, params, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
   });
};

exports.getPipelineLeads = (req, res) => {

   const {
      stage,
      page = 1,
      limit = 20,
      search = "",
      assigned
   } = req.query;

   const offset = (page - 1) * limit;
   const role = req.user.role;
   const userId = req.user.id;

   let query = `
      SELECT id, name, phone, status, expected_value, probability, assigned_to
      FROM leads
      WHERE status = ?
   `;

   const params = [stage];

   // 🔒 Staff restriction
   if (role !== "admin") {
      query += " AND assigned_to = ?";
      params.push(userId);
   }

   // 🔍 Search filter
   if (search) {
      query += " AND (name LIKE ? OR phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
   }

   // 👤 Assigned filter (admin only)
   if (assigned) {
      query += " AND assigned_to = ?";
      params.push(assigned);
   }

   query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
   params.push(Number(limit), Number(offset));

   db.query(query, params, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
   });
};



exports.getLeadActivities = (req, res) => {

   const { id } = req.params;

   db.query(
      `SELECT a.*, u.name AS user_name
       FROM lead_activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = ?
       ORDER BY a.created_at DESC`,
      [id],
      (err, result) => {

         if (err) return res.status(500).json(err);

         res.json(result);
      }
   );
};


