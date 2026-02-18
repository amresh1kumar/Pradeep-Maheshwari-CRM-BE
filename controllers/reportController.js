const db = require("../config/db");

exports.getReport = (req, res) => {
   const { type } = req.query; // weekly / monthly
   let dateCondition = "";
   if (type === "weekly") {
      dateCondition = "YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
   }

   if (type === "monthly") {
      dateCondition = "MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
   }

   // Leads count
   const leadsQuery = `
      SELECT COUNT(*) AS totalLeads
      FROM leads
      WHERE ${dateCondition}
   `;

   db.query(leadsQuery, (err, leadResult) => {

      if (err) return res.status(500).json(err);

      const totalLeads = leadResult[0].totalLeads;

      // Converted Leads
      const convertedQuery = `
         SELECT COUNT(*) AS convertedLeads
         FROM leads
         WHERE status='Closed Won'
         AND ${dateCondition}
      `;

      db.query(convertedQuery, (err, convertedResult) => {

         if (err) return res.status(500).json(err);

         const convertedLeads = convertedResult[0].convertedLeads;

         // Revenue
         const revenueQuery = `
            SELECT SUM(sale_amount) AS totalRevenue
            FROM sale_details
            WHERE ${dateCondition.replace("created_at", "closing_date")}
         `;

         db.query(revenueQuery, (err, revenueResult) => {

            if (err) return res.status(500).json(err);

            const totalRevenue = revenueResult[0].totalRevenue || 0;

            const conversionRate =
               totalLeads > 0
                  ? ((convertedLeads / totalLeads) * 100).toFixed(2)
                  : 0;

            res.json({
               totalLeads,
               convertedLeads,
               totalRevenue,
               conversionRate
            });

         });
      });
   });
};
