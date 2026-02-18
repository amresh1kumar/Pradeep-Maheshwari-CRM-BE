const db = require("../config/db");
const XLSX = require("xlsx");
const fs = require("fs");

exports.createLead = (req, res) => {

   const { name, phone, email, source, status, assigned_to } = req.body;

   let assignUserId;

   if (req.user.role === "admin") {
      assignUserId = assigned_to || null;
   } else {
      assignUserId = req.user.id;
   }

   db.query(
      "INSERT INTO leads (name,phone,email,source,status,assigned_to,created_by) VALUES (?,?,?,?,?,?,?)",
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
      SELECT leads.*,users.name AS assigned_user,creator.name AS created_by_name
      FROM leads
      LEFT JOIN users ON leads.assigned_to = users.id
      LEFT JOIN users AS creator ON leads.created_by = creator.id
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

   const leads = sheetData.map(row => [
      row.Name,
      row.Phone,
      row.Email,
      row.Source || "Website",
      "New",
      req.user.id,
      req.user.id
   ]);

   const query = `
      INSERT INTO leads 
      (name, phone, email, source, status, assigned_to, created_by)
      VALUES ?
   `;

   db.query(query, [leads], (err, result) => {
      fs.unlinkSync(req.file.path); // delete uploaded file

      if (err) return res.status(500).json(err);

      res.json({
         message: `${result.affectedRows} leads imported successfully`
      });
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

// exports.convertToSale = (req, res) => {

//    const { id } = req.params;
//    const { sale_amount, closing_date } = req.body;

//    if (!sale_amount || !closing_date) {
//       return res.status(400).json({ message: "Amount and date required" });
//    }

//    db.query(
//       "INSERT INTO sale_details (lead_id, sale_amount, closing_date, created_by) VALUES (?, ?, ?, ?)",
//       [id, sale_amount, closing_date, req.user.id],
//       (err) => {

//          if (err) return res.status(500).json(err);

//          // Update lead status
//          db.query(
//             "UPDATE leads SET status='Closed Won' WHERE id=?",
//             [id]
//          );

//          res.json({ message: "Lead converted to sale successfully" });
//       }
//    );
// };


// exports.convertLeadToSale = (req, res) => {

//    const { id } = req.params;
//    const { sale_amount, closing_date } = req.body;

//    if (!sale_amount || !closing_date) {
//       return res.status(400).json({ message: "Amount and date required" });
//    }

//    // 1️⃣ Insert into sale_details
//    db.query(
//       "INSERT INTO sale_details (lead_id, sale_amount, closing_date, created_by) VALUES (?, ?, ?, ?)",
//       [id, sale_amount, closing_date, req.user.id],
//       (err) => {

//          if (err) return res.status(500).json(err);

//          // 2️⃣ Update lead status
//          db.query(
//             "UPDATE leads SET status='Closed Won' WHERE id=?",
//             [id]
//          );

//          // 3️⃣ 🔔 Insert notification
//          db.query(
//             "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)",
//             [
//                req.user.id,
//                `Lead #${id} converted to Sale ₹${sale_amount}`,
//                "sale"
//             ]
//          );

//          res.json({ message: "Lead converted successfully" });
//       }
//    );
// };

exports.convertLeadToSale = (req, res) => {

   const { id } = req.params;
   const { sale_amount, closing_date } = req.body;

   if (!sale_amount || !closing_date) {
      return res.status(400).json({ message: "Amount and date required" });
   }

   db.query(
      "INSERT INTO sale_details (lead_id, sale_amount, closing_date, created_by) VALUES (?, ?, ?, ?)",
      [id, sale_amount, closing_date, req.user.id],
      (err) => {

         if (err) return res.status(500).json(err);

         // 2️⃣ Update lead status + is_converted
         db.query(
            "UPDATE leads SET status = 'Closed Won', is_converted = 1 WHERE id = ?",
            [id],
            (err) => {

               if (err) return res.status(500).json(err);

               res.json({ message: "Lead converted successfully" });
            }
         );
      }
   );
};




exports.getAllSales = (req, res) => {

   const userId = req.user.id;
   const userRole = req.user.role;

   let whereClause = "";
   let values = [];

   // 🔹 Staff restriction
   if (userRole !== "admin") {
      whereClause = "WHERE sale_details.created_by = ?";
      values.push(userId);
   }

   const query = `
      SELECT 
   s.*,
   l.name AS lead_name,
   creator.name AS created_by_name,
   assigned.name AS assigned_to_name
   FROM sale_details s
   JOIN leads l ON s.lead_id = l.id
   LEFT JOIN users creator ON s.created_by = creator.id
   LEFT JOIN users assigned ON l.assigned_to = assigned.id
   ORDER BY s.id DESC

   `;

   db.query(query, values, (err, result) => {

      if (err) return res.status(500).json(err);

      res.json(result);
   });
};
