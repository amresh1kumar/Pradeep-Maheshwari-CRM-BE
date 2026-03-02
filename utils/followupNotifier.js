
const db = require("../config/db");

const generateFollowupNotifications = (app) => {

   const io = app.get("io");

   const query = `
      SELECT 
         f.id,
         DATE(f.next_followup_date) AS next_date,
         l.name AS lead_name,
         l.assigned_to AS user_id
      FROM followups f
      JOIN leads l ON f.lead_id = l.id
      WHERE DATE(f.next_followup_date) <= CURDATE()
   `;

   db.query(query, (err, followups) => {

      if (err) {
         console.log("Followup check error:", err);
         return;
      }

      followups.forEach(followup => {

         const message = `Follow-up reminder for Lead: ${followup.lead_name}`;

         // Insert into DB
         db.query(
            `INSERT INTO notifications (user_id, message, type)
             VALUES (?, ?, 'followup')`,
            [followup.user_id, message]
         );

         // 🔥 Real-time emit
         io.to(`user_${followup.user_id}`).emit("newNotification", {
            message,
            type: "followup"
         });

      });

   });
};

module.exports = generateFollowupNotifications;
