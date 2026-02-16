const db = require("../config/db");

exports.getDashboardStats = (req, res) => {

   const userId = req.user.id;
   const role = req.user.role;

   let leadCondition = "";
   let followCondition = "";

   if (role !== "admin") {
      leadCondition = `WHERE assigned_to = ${userId}`;
      followCondition = `WHERE leads.assigned_to = ${userId}`;
   }

   const statsQuery = `
      SELECT 
         COUNT(*) as totalLeads,
         SUM(status = 'New') as newLeads,
         SUM(status = 'Contacted') as contacted,
         SUM(status = 'Qualified') as qualified,
         SUM(status = 'Closed Won') as won,
         SUM(status = 'Closed Lost') as lost
      FROM leads
      ${leadCondition}
   `;

   const followQuery = `
      SELECT 
         SUM(next_followup_date < CURDATE()) as overdue,
         SUM(next_followup_date = CURDATE()) as today,
         SUM(next_followup_date > CURDATE()) as upcoming
      FROM followups
      JOIN leads ON followups.lead_id = leads.id
      ${followCondition}
   `;

   db.query(statsQuery, (err, leadStats) => {
      if (err) return res.status(500).json(err);

      db.query(followQuery, (err, followStats) => {
         if (err) return res.status(500).json(err);

         res.json({
            ...leadStats[0],
            ...followStats[0]
         });
      });
   });
};

exports.getRevenueStats = (req, res) => {

   const userId = req.user.id;
   const role = req.user.role;

   let whereClause = "";
   let values = [];

   if (role !== "admin") {
      whereClause = "WHERE sale_details.created_by = ?";
      values.push(userId);
   }

   // 🔹 Total Revenue
   const totalQuery = `
      SELECT SUM(sale_amount) AS totalRevenue
      FROM sale_details
      ${whereClause}
   `;

   db.query(totalQuery, values, (err, totalResult) => {

      if (err) return res.status(500).json(err);

      const totalRevenue = totalResult[0].totalRevenue || 0;

      // 🔹 Monthly Revenue
      const monthlyQuery = `
         SELECT 
            DATE_FORMAT(closing_date, '%Y-%m') AS month,
            SUM(sale_amount) AS revenue
         FROM sale_details
         ${whereClause}
         GROUP BY month
         ORDER BY month ASC
      `;

      db.query(monthlyQuery, values, (err, monthlyResult) => {

         if (err) return res.status(500).json(err);

         res.json({
            totalRevenue,
            monthlyRevenue: monthlyResult
         });
      });
   });
};
