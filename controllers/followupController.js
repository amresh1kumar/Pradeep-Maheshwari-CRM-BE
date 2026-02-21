const db = require("../config/db");
const dayjs = require("dayjs");

const addActivity = (leadId, userId, action) => {
   db.query(
      `INSERT INTO lead_activities(lead_id,user_id,action) VALUES(?,?,?)`, [leadId, userId, action]
   )
}
// exports.addFollowup = (req, res) => {

//    const { lead_id, note, next_followup_date } = req.body;

//    const created_by = req.user.id;

//    db.query(
//       "INSERT INTO followups (lead_id, note, next_followup_date, created_by) VALUES (?,?,?,?)",
//       [lead_id, note, next_followup_date, created_by],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          addActivity(lead_id, req.user.id, "Follow-up Added");
//          res.json({ message: "Follow-up added successfully" });
//       }
//    );
// };


exports.addFollowup = (req, res) => {

   const { lead_id, note, next_followup_date } = req.body;
   const created_by = req.user.id;

   db.query(
      `INSERT INTO followups 
       (lead_id, note, next_followup_date, created_by) 
       VALUES (?,?,?,?)`,
      [lead_id, note, next_followup_date, created_by],
      (err) => {

         if (err) return res.status(500).json(err);

         addActivity(
            lead_id,
            req.user.id,
            `Follow-up scheduled for ${next_followup_date}`
         );

         res.json({ message: "Follow-up added successfully" });
      }
   );
};

exports.getFollowupsByLead = (req, res) => {

   const { leadId } = req.params;

   db.query(
      `SELECT followups.*, users.name AS created_by_name
     FROM followups
     JOIN users ON followups.created_by = users.id
     WHERE followups.lead_id = ?
     ORDER BY followups.created_at DESC`,
      [leadId],
      (err, result) => {
         if (err) return res.status(500).json(err);

         res.json(result);
      }
   );
};


exports.getFollowupSummary = (req, res) => {

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

   db.query(query, params, (err, result) => {

      if (err) return res.status(500).json(err);

      let overdue = 0;
      let todayCount = 0;
      let upcoming = 0;

      const today = dayjs().startOf("day");

      result.forEach(item => {

         const followupDate = dayjs(item.next_followup_date);

         if (followupDate.isBefore(today, "day")) {
            overdue++;
         }
         else if (followupDate.isSame(today, "day")) {
            todayCount++;
         }
         else {
            upcoming++;
         }
      });

      res.json({
         overdue,
         today: todayCount,
         upcoming
      });

   });
};

exports.getAllFollowups = (req, res) => {

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

   db.query(query, params, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
   });
};


exports.createFollowup = (req, res) => {

   const { lead_id, note, next_followup_date, status } = req.body;

   db.query(
      `INSERT INTO followups 
       (lead_id, note, next_followup_date, status, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
         lead_id,
         note,
         next_followup_date,
         status || "Pending",
         req.user.id
      ],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Follow-up created successfully" });
      }
   );
};


exports.updateFollowup = (req, res) => {

   const { id } = req.params;
   const { note, next_followup_date, status } = req.body;

   db.query(
      `UPDATE followups 
       SET note=?, next_followup_date=?
       WHERE id=?`,
      [note, next_followup_date, id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Follow-up updated successfully" });
      }
   );
};


exports.deleteFollowup = (req, res) => {

   db.query(
      "DELETE FROM followups WHERE id=?",
      [req.params.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Follow-up deleted successfully" });
      }
   );
};
