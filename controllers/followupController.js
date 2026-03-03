// const db = require("../config/db");
// const dayjs = require("dayjs");

// const addActivity = (leadId, userId, action) => {
//    db.query(
//       `INSERT INTO lead_activities(lead_id,user_id,action) VALUES(?,?,?)`, [leadId, userId, action]
//    )
// }

// exports.addFollowup = (req, res) => {

//    const { lead_id, note, next_followup_date } = req.body;
//    const created_by = req.user.id;

//    db.query(
//       `INSERT INTO followups 
//        (lead_id, note, next_followup_date, created_by) 
//        VALUES (?,?,?,?)`,
//       [lead_id, note, next_followup_date, created_by],
//       (err) => {

//          if (err) return res.status(500).json(err);

//          addActivity(
//             lead_id,
//             req.user.id,
//             `Follow-up scheduled for ${next_followup_date}`
//          );

//          res.json({ message: "Follow-up added successfully" });
//       }
//    );
// };

// exports.getFollowupsByLead = (req, res) => {

//    const { leadId } = req.params;

//    db.query(
//       `SELECT followups.*, users.name AS created_by_name
//      FROM followups
//      JOIN users ON followups.created_by = users.id
//      WHERE followups.lead_id = ?
//      ORDER BY followups.created_at DESC`,
//       [leadId],
//       (err, result) => {
//          if (err) return res.status(500).json(err);

//          res.json(result);
//       }
//    );
// };


// exports.getFollowupSummary = (req, res) => {

//    let query = `
//     SELECT followups.next_followup_date
//     FROM followups
//     JOIN leads ON followups.lead_id = leads.id
//   `;

//    const params = [];

//    if (req.user.role !== "admin") {
//       query += " WHERE leads.assigned_to = ?";
//       params.push(req.user.id);
//    }

//    db.query(query, params, (err, result) => {

//       if (err) return res.status(500).json(err);

//       let overdue = 0;
//       let todayCount = 0;
//       let upcoming = 0;

//       const today = dayjs().startOf("day");

//       result.forEach(item => {

//          const followupDate = dayjs(item.next_followup_date);

//          if (followupDate.isBefore(today, "day")) {
//             overdue++;
//          }
//          else if (followupDate.isSame(today, "day")) {
//             todayCount++;
//          }
//          else {
//             upcoming++;
//          }
//       });

//       res.json({
//          overdue,
//          today: todayCount,
//          upcoming
//       });

//    });
// };

// exports.getAllFollowups = (req, res) => {

//    let query = `
//     SELECT 
//       followups.*,
//       users.name AS created_by_name,
//       leads.name AS lead_name,
//       leads.phone,
//       leads.status,
//       leads.assigned_to
//     FROM followups
//     JOIN leads ON followups.lead_id = leads.id
//     JOIN users ON followups.created_by = users.id
//   `;

//    const params = [];

//    if (req.user.role !== "admin") {
//       query += " WHERE leads.assigned_to = ?";
//       params.push(req.user.id);
//    }

//    query += " ORDER BY followups.next_followup_date ASC";

//    db.query(query, params, (err, result) => {
//       if (err) return res.status(500).json(err);
//       res.json(result);
//    });
// };


// exports.createFollowup = (req, res) => {

//    const { lead_id, note, next_followup_date, status } = req.body;

//    db.query(
//       `INSERT INTO followups 
//        (lead_id, note, next_followup_date, status, created_by)
//        VALUES (?, ?, ?, ?, ?)`,
//       [
//          lead_id,
//          note,
//          next_followup_date,
//          status || "Pending",
//          req.user.id
//       ],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "Follow-up created successfully" });
//       }
//    );
// };


// exports.updateFollowup = (req, res) => {

//    const { id } = req.params;
//    const { note, next_followup_date, status } = req.body;

//    db.query(
//       `UPDATE followups 
//        SET note=?, next_followup_date=?
//        WHERE id=?`,
//       [note, next_followup_date, id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "Follow-up updated successfully" });
//       }
//    );
// };


// exports.deleteFollowup = (req, res) => {

//    db.query(
//       "DELETE FROM followups WHERE id=?",
//       [req.params.id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "Follow-up deleted successfully" });
//       }
//    );
// };


const db = require("../config/db");
const dayjs = require("dayjs");


const addActivity = async (leadId, userId, action) => {
   try {
      await db.query(
         `INSERT INTO lead_activities (lead_id, user_id, action)
          VALUES (?, ?, ?)`,
         [leadId, userId, action]
      );
   } catch (err) {
      console.error("Activity Log Error:", err.message);
   }
};


exports.addFollowup = async (req, res) => {
   try {
      const { lead_id, note, next_followup_date } = req.body;

      await db.query(
         `INSERT INTO followups
          (lead_id, note, next_followup_date, created_by)
          VALUES (?, ?, ?, ?)`,
         [lead_id, note, next_followup_date, req.user.id]
      );

      await addActivity(
         lead_id,
         req.user.id,
         `Follow-up scheduled for ${next_followup_date}`
      );

      res.json({ message: "Follow-up added successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getFollowupsByLead = async (req, res) => {
   try {
      const { leadId } = req.params;

      const [rows] = await db.query(
         `SELECT followups.*, users.name AS created_by_name
          FROM followups
          JOIN users ON followups.created_by = users.id
          WHERE followups.lead_id = ?
          ORDER BY followups.created_at DESC`,
         [leadId]
      );

      res.json(rows);

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.getFollowupSummary = async (req, res) => {
   try {

      let query = `
         SELECT followups.next_followup_date
         FROM followups
         JOIN leads ON followups.lead_id = leads.id
      `;

      const params = [];

      if (req.user.role !== "admin") {
         query += " WHERE leads.assigned_to = ?";
         params.push(req.user.id);
      }

      const [rows] = await db.query(query, params);

      let overdue = 0;
      let todayCount = 0;
      let upcoming = 0;

      const today = dayjs().startOf("day");

      rows.forEach(item => {
         const followupDate = dayjs(item.next_followup_date);

         if (followupDate.isBefore(today, "day")) overdue++;
         else if (followupDate.isSame(today, "day")) todayCount++;
         else upcoming++;
      });

      res.json({ overdue, today: todayCount, upcoming });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.getAllFollowups = async (req, res) => {
   try {

      let query = `
         SELECT 
            followups.*,
            users.name AS created_by_name,
            leads.name AS lead_name,
            leads.phone,
            leads.status,
            leads.assigned_to
         FROM followups
         JOIN leads ON followups.lead_id = leads.id
         JOIN users ON followups.created_by = users.id
      `;

      const params = [];

      if (req.user.role !== "admin") {
         query += " WHERE leads.assigned_to = ?";
         params.push(req.user.id);
      }

      query += " ORDER BY followups.next_followup_date ASC";

      const [rows] = await db.query(query, params);

      res.json(rows);

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.createFollowup = async (req, res) => {
   try {

      const { lead_id, note, next_followup_date, status } = req.body;

      await db.query(
         `INSERT INTO followups
          (lead_id, note, next_followup_date, status, created_by)
          VALUES (?, ?, ?, ?, ?)`,
         [
            lead_id,
            note,
            next_followup_date,
            status || "Pending",
            req.user.id
         ]
      );

      res.json({ message: "Follow-up created successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.updateFollowup = async (req, res) => {
   try {

      const { id } = req.params;
      const { note, next_followup_date } = req.body;

      await db.query(
         `UPDATE followups
          SET note=?, next_followup_date=?
          WHERE id=?`,
         [note, next_followup_date, id]
      );

      res.json({ message: "Follow-up updated successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.deleteFollowup = async (req, res) => {
   try {

      await db.query(
         "DELETE FROM followups WHERE id=?",
         [req.params.id]
      );

      res.json({ message: "Follow-up deleted successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};