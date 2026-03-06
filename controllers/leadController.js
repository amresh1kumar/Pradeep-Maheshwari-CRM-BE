const db = require("../config/db");
const XLSX = require("xlsx-js-style");
const fs = require("fs");

const addActivity = async (leadId, userId, action) => {
   try {
      await db.query(
         `INSERT INTO lead_activities (lead_id, user_id, action)
          VALUES (?, ?, ?)`,
         [leadId, userId, action]
      );
   } catch (err) {
      console.error("Activity Error:", err.message);
   }
};

exports.createLead = async (req, res) => {
   try {
      const { name, phone, status, assigned_to } = req.body;

      const assignUserId =
         req.user.role === "admin"
            ? assigned_to || null
            : req.user.id;

      await db.query(
         `INSERT INTO leads
          (name, phone,status, assigned_to, created_by, project_id)
          VALUES (?,?,?,?,?,?)`,
         [
            name,
            phone,
            status || "New",
            assignUserId,
            req.user.id,
            null
         ]
      );

      res.json({ message: "Lead created successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getLeads = async (req, res) => {
   try {
      const { page = 1, limit = 10, status, search, project_id, assigned } = req.query;
      const offset = (page - 1) * limit;

      let baseQuery = `
         FROM leads
         LEFT JOIN users ON leads.assigned_to = users.id
         LEFT JOIN users creator ON leads.created_by = creator.id
         LEFT JOIN projects p ON leads.project_id = p.id
      `;

      const conditions = [];
      const params = [];

      if (req.user.role !== "admin") {
         conditions.push("leads.assigned_to = ?");
         params.push(req.user.id);
      }

      if (assigned === "unassigned" && req.user.role === "admin") {
         conditions.push("leads.assigned_to IS NULL");
      }

      if (project_id) {
         conditions.push("leads.project_id = ?");
         params.push(project_id);
      }

      if (status) {
         conditions.push("leads.status = ?");
         params.push(status);
      }

      if (search) {
         conditions.push("(leads.name LIKE ? OR leads.phone LIKE ?)");
         params.push(`%${search}%`, `%${search}%`);
      }

      let whereClause = conditions.length
         ? " WHERE " + conditions.join(" AND ")
         : "";

      const dataQuery = `
         SELECT 
            leads.*,
            users.name AS assigned_user,
            creator.name AS created_by_name,
            p.name AS project_name
         ${baseQuery}
         ${whereClause}
         ORDER BY leads.created_at DESC
         LIMIT ? OFFSET ?
      `;

      const [rows] = await db.query(dataQuery, [...params, Number(limit), Number(offset)]);

      const countQuery = `SELECT COUNT(*) as total ${baseQuery} ${whereClause}`;
      const [countResult] = await db.query(countQuery, params);

      res.json({
         data: rows,
         total: countResult[0].total
      });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};

exports.updateLead = async (req, res) => {
   const connection = await db.getConnection();

   try {

      const { id } = req.params;
      const { name, phone,status, assigned_to, project_id } = req.body;
      const io = req.app.get("io");

      await connection.beginTransaction();

      const [oldRows] = await connection.query(
         "SELECT * FROM leads WHERE id=?",
         [id]
      );

      if (!oldRows.length) {
         await connection.rollback();
         return res.status(404).json({ message: "Lead not found" });
      }

      const oldLead = oldRows[0];
      let updated = { ...oldLead };

      if (req.user.role === "staff") {
         if (!status) {
            await connection.rollback();
            return res.status(400).json({ message: "Staff can only update status" });
         }
         updated.status = status;
      } else {
         updated = {
            name: name ?? oldLead.name,
            phone: phone ?? oldLead.phone,
            status: status ?? oldLead.status,
            assigned_to: assigned_to ?? oldLead.assigned_to,
            project_id: project_id ?? oldLead.project_id
         };
      }

      await connection.query(
         `UPDATE leads 
          SET name=?, phone=?,status=?, assigned_to=?, project_id=? 
          WHERE id=?`,
         [
            updated.name,
            updated.phone,
            updated.status,
            updated.assigned_to,
            updated.project_id,
            id
         ]
      );

      // ✅ Status change activity
      if (updated.status !== oldLead.status) {
         await connection.query(
            `INSERT INTO lead_activities (lead_id, user_id, action)
             VALUES (?, ?, ?)`,
            [id, req.user.id, `Status changed to ${updated.status}`]
         );
      }

      let notificationData = null;

      // 🔔 If assignment changed
      if (
         updated.assigned_to &&
         updated.assigned_to !== oldLead.assigned_to
      ) {

         const message = `New Lead Assigned: ${updated.name}`;

         const [insertResult] = await connection.query(
            `INSERT INTO notifications (user_id, message, type)
             VALUES (?, ?, 'lead_assignment')`,
            [updated.assigned_to, message]
         );

         notificationData = {
            id: insertResult.insertId,
            userId: updated.assigned_to,
            message
         };
      }

      await connection.commit();

      // 🔥 Emit AFTER commit
      if (notificationData) {
         io.to(`user_${notificationData.userId}`).emit("newNotification", {
            id: notificationData.id,
            message: notificationData.message,
            type: "lead_assignment"
         });
      }

      res.json({ message: "Lead updated successfully" });

   } catch (err) {

      await connection.rollback();
      console.error(err);
      res.status(500).json({ message: "Server error" });

   } finally {
      connection.release();
   }
};


exports.getSingleLead = async (req, res) => {
   try {
      const [rows] = await db.query(
         `SELECT leads.*, users.name AS assigned_user
          FROM leads
          LEFT JOIN users ON leads.assigned_to = users.id
          WHERE leads.id = ?`,
         [req.params.id]
      );

      if (!rows.length)
         return res.status(404).json({ message: "Lead not found" });

      res.json(rows[0]);
   } catch (err) {
      res.status(500).json({ message: "Server error" });
   }
};

exports.deleteLead = async (req, res) => {
   try {
      await db.query("DELETE FROM leads WHERE id=?", [req.params.id]);
      res.json({ message: "Lead deleted successfully" });
   } catch (err) {
      res.status(500).json({ message: "Server error" });
   }
};

exports.getLeadStats = async (req, res) => {
   try {
      const [rows] = await db.query(`
         SELECT 
            COUNT(*) AS total,
            SUM(status='New') AS newCount,
            SUM(status='Contacted') AS contacted,
            SUM(status='Closed') AS closedCount
         FROM leads
      `);
      res.json(rows[0]);
   } catch (err) {
      res.status(500).json({ message: "Server error" });
   }
};

exports.importLeadsFromExcel = async (req, res) => {

   if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
   }

   try {

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (!sheetData.length) {
         fs.unlinkSync(req.file.path);
         return res.status(400).json({ message: "Excel file empty" });
      }

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of sheetData) {

         const Name = row.Name?.toString().trim() || null;
         const Phone = row.Phone?.toString().trim() || null;

         if (!Phone) {
            skipped++;
            continue;
         }

         let checkQuery = "SELECT id FROM leads WHERE phone=?";
         let checkParams = [Phone];

         // if (Email && Phone) {
         //    checkQuery += "(email = ? OR phone = ?)";
         //    checkParams.push(Email, Phone);
         // } else if (Email) {
         //    checkQuery += "email = ?";
         //    checkParams.push(Email);
         // } else if (Phone) {
         //    checkQuery += "phone = ?";
         //    checkParams.push(Phone);
         // }

         const [existing] = await db.query(checkQuery, checkParams);

         if (existing.length > 0) {

            await db.query(
               `UPDATE leads 
                SET name=?
                WHERE id=?`,
               [
                  Name,
                  existing[0].id
               ]
            );

            updated++;

         } else {

            await db.query(
               `INSERT INTO leads
                (name, phone,status, assigned_to, created_by, project_id)
                VALUES (?,?,?,?,?,?)`,
               [
                  Name,
                  Phone,
                  "New",
                  null,
                  req.user.id,
                  null
               ]
            );

            inserted++;
         }
      }

      fs.unlinkSync(req.file.path);

      res.json({
         message: "Import completed successfully",
         summary: {
            total: sheetData.length,
            inserted,
            updated,
            skipped
         }
      });

   } catch (error) {

      console.error(error);

      if (req.file && fs.existsSync(req.file.path)) {
         fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
         message: "Import failed",
         error: error.message
      });
   }
};

exports.exportLeads = async (req, res) => {
   try {
      let query = `
         SELECT 
            leads.name AS Name,
            leads.phone AS Phone,
            leads.status AS Status,
            IFNULL(p.name, 'Unassigned') AS Project,
            u1.name AS Assigned_To,
            u2.name AS Created_By
         FROM leads
         LEFT JOIN users u1 ON leads.assigned_to = u1.id
         LEFT JOIN users u2 ON leads.created_by = u2.id
         LEFT JOIN projects p ON leads.project_id = p.id
      `;

      const params = [];

      if (req.user.role !== "admin") {
         query += " WHERE leads.assigned_to = ?";
         params.push(req.user.id);
      }

      const [result] = await db.query(query, params);

      if (!result.length)
         return res.status(400).json({ message: "No leads found" });

      const worksheet = XLSX.utils.json_to_sheet(result);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

      const buffer = XLSX.write(workbook, {
         type: "buffer",
         bookType: "xlsx"
      });

      res.setHeader("Content-Disposition", "attachment; filename=Leads.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);

   } catch (err) {
      res.status(500).json({ message: "Export failed" });
   }
};

exports.convertLeadToSale = async (req, res) => {
   const connection = await db.getConnection();

   try {

      const { id } = req.params;
      const { sale_amount, closing_date } = req.body;
      const io = req.app.get("io");

      await connection.beginTransaction();

      await connection.query(
         `INSERT INTO sale_details 
          (lead_id, sale_amount, closing_date, created_by)
          VALUES (?, ?, ?, ?)`,
         [id, sale_amount, closing_date, req.user.id]
      );

      await connection.query(
         `UPDATE leads 
          SET status='Closed Won', is_converted=1 
          WHERE id=?`,
         [id]
      );

      const [result] = await connection.query(
         `
         SELECT 
            l.name AS lead_name,
            l.assigned_to,
            u.name AS converted_by
         FROM leads l
         JOIN users u ON u.id = ?
         WHERE l.id = ?
         `,
         [req.user.id, id]
      );

      if (!result.length) {
         await connection.rollback();
         return res.status(404).json({ message: "Lead not found" });
      }

      const lead = result[0];

      const message =
         `Lead "${lead.lead_name}" converted to Sale ₹${sale_amount} by ${lead.converted_by}`;

      const notifyUsers = [];

      if (lead.assigned_to)
         notifyUsers.push(lead.assigned_to);

      const [admins] = await connection.query(
         `SELECT id FROM users WHERE role_id = 1`
      );

      admins.forEach(admin => notifyUsers.push(admin.id));

      const uniqueUsers = [...new Set(notifyUsers)];

      // 5️⃣ Insert notifications
      for (const userId of uniqueUsers) {

         await connection.query(
            `INSERT INTO notifications (user_id, message, type)
             VALUES (?, ?, 'sale')`,
            [userId, message]
         );

         io.to(`user_${userId}`).emit("newNotification", {
            message,
            type: "sale"
         });
      }

      await connection.query(
         `INSERT INTO lead_activities (lead_id, user_id, action)
          VALUES (?, ?, ?)`,
         [id, req.user.id, `Converted to Sale ₹${sale_amount}`]
      );

      await connection.commit();

      res.json({ message: "Lead converted successfully" });

   } catch (err) {

      await connection.rollback();
      console.error(err);
      res.status(500).json({ message: "Conversion failed" });

   } finally {
      connection.release();
   }
};

exports.getAllSales = async (req, res) => {
   try {
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

      const params = [];

      if (req.user.role !== "admin") {
         query += " WHERE s.created_by = ?";
         params.push(req.user.id);
      }

      const [rows] = await db.query(query, params);
      res.json(rows);

   } catch (err) {
      res.status(500).json({ message: "Server error" });
   }
};

exports.getLeadActivities = async (req, res) => {
   try {
      const [rows] = await db.query(
         `SELECT a.*, u.name AS user_name
          FROM lead_activities a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE a.lead_id = ?
          ORDER BY a.created_at DESC`,
         [req.params.id]
      );

      res.json(rows);
   } catch (err) {
      res.status(500).json({ message: "Server error" });
   }
};

exports.bulkAssignLeads = async (req, res) => {
   const connection = await db.getConnection();
   try {

      const { leadIds, assigned_to } = req.body;
      const io = req.app.get("io");

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
         return res.status(400).json({
            message: "Please select at least one lead"
         });
      }

      if (!assigned_to) {
         return res.status(400).json({
            message: "Please select user to assign"
         });
      }

      // 🔍 Check user exists
      const [userResult] = await connection.query(
         "SELECT id, name FROM users WHERE id = ?",
         [assigned_to]
      );

      if (!userResult.length) {
         return res.status(404).json({
            message: "User not found"
         });
      }

      const placeholders = leadIds.map(() => "?").join(",");

      // 🔄 Update only unassigned leads
      const [result] = await connection.query(
         `UPDATE leads
          SET assigned_to = ?
          WHERE id IN (${placeholders})
          AND assigned_to IS NULL`,
         [assigned_to, ...leadIds]
      );

      const updated = result.affectedRows;
      const skipped = leadIds.length - updated;

      // 🔔 Notification if any updated
      if (updated > 0) {

         const notificationMessage =
            `${updated} Leads Assigned to You`;

         await connection.query(
            `INSERT INTO notifications (user_id, message, type)
             VALUES (?, ?, 'bulk_assignment')`,
            [assigned_to, notificationMessage]
         );

         io.to(`user_${assigned_to}`).emit("newNotification", {
            message: notificationMessage,
            type: "bulk_assignment"
         });
      }

      res.json({
         updated,
         skipped,
         message: `${updated} assigned, ${skipped} skipped`
      });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Bulk assign failed" });
   } finally {
      connection.release();
   }
};