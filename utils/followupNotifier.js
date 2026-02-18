const db = require("../config/db");

const generateFollowupNotifications = () => {

   const query = `
      SELECT 
         f.id AS followup_id,
         DATE(f.next_followup_date) AS next_date,
         l.name AS lead_name,
         l.assigned_to AS user_id,
         CASE 
            WHEN DATE(f.next_followup_date) < CURDATE() THEN 'overdue'
            ELSE 'today'
         END AS followup_type
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

         const message =
            followup.followup_type === "overdue"
               ? `Follow-up overdue for Lead: ${followup.lead_name}`
               : `Follow-up today for Lead: ${followup.lead_name}`;

         // Duplicate prevent using reference_id + reference_type
         db.query(
            `
            SELECT id FROM notifications
            WHERE user_id = ?
            AND reference_id = ?
            AND reference_type = 'followup'
            `,
            [followup.user_id, followup.followup_id],
            (err, result) => {

               if (!result || result.length === 0) {

                  db.query(
                     `
                     INSERT INTO notifications 
                     (user_id, message, type, reference_id, reference_type)
                     VALUES (?, ?, 'followup', ?, 'followup')
                     `,
                     [
                        followup.user_id,
                        message,
                        followup.followup_id
                     ],
                     (err) => {
                        if (err) console.log("Insert error:", err);
                     }
                  );
               }
            }
         );
      });
   });
};

module.exports = generateFollowupNotifications;
