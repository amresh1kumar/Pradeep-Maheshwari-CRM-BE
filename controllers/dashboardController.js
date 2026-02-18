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


// exports.getRevenueStats = (req, res) => {

//    const userId = req.user.id;
//    const role = req.user.role;

//    const { startDate, endDate } = req.query;

//    let whereConditions = [];
//    let values = [];

//    if (role !== "admin") {
//       whereConditions.push("sale_details.created_by = ?");
//       values.push(userId);
//    }

//    if (startDate && endDate) {
//       whereConditions.push("closing_date BETWEEN ? AND ?");
//       values.push(startDate, endDate);
//    }

//    let whereClause = "";
//    if (whereConditions.length > 0) {
//       whereClause = "WHERE " + whereConditions.join(" AND ");
//    }

//    const totalQuery = `
//       SELECT SUM(sale_amount) AS totalRevenue
//       FROM sale_details
//       ${whereClause}
//    `;

//    db.query(totalQuery, values, (err, totalResult) => {

//       if (err) return res.status(500).json(err);

//       const totalRevenue = totalResult[0].totalRevenue || 0;

//       const monthlyQuery = `
//          SELECT 
//             DATE_FORMAT(closing_date, '%Y-%m') AS month,
//             SUM(sale_amount) AS revenue
//          FROM sale_details
//          ${whereClause}
//          GROUP BY month
//          ORDER BY month ASC
//       `;

//       db.query(monthlyQuery, values, (err, monthlyResult) => {

//          if (err) return res.status(500).json(err);

//          res.json({
//             totalRevenue,
//             monthlyRevenue: monthlyResult
//          });
//       });
//    });
// };

exports.getRevenueStats = (req, res) => {

   const userId = req.user.id;
   const role = req.user.role;
   const { startDate, endDate } = req.query;

   let whereConditions = [];
   let values = [];

   if (role !== "admin") {
      whereConditions.push("sale_details.created_by = ?");
      values.push(userId);
   }

   if (startDate && endDate) {
      whereConditions.push("closing_date BETWEEN ? AND ?");
      values.push(startDate, endDate);
   }

   let whereClause = "";
   if (whereConditions.length > 0) {
      whereClause = "WHERE " + whereConditions.join(" AND ");
   }

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

      const totalRevenue = monthlyResult.reduce(
         (sum, item) => sum + Number(item.revenue),
         0
      );

      const monthsCount = monthlyResult.length;

      const avgMonthly = monthsCount > 0
         ? totalRevenue / monthsCount
         : 0;

      // 🔥 Revenue Growth % (Last Month vs Previous Month)
      let growthRate = 0;

      if (monthsCount >= 2) {
         const lastMonth = monthlyResult[monthsCount - 1].revenue;
         const prevMonth = monthlyResult[monthsCount - 2].revenue;

         if (prevMonth > 0) {
            growthRate = ((lastMonth - prevMonth) / prevMonth) * 100;
         }
      }

      res.json({
         totalRevenue,
         monthlyRevenue: monthlyResult,
         avgMonthly: avgMonthly.toFixed(2),
         growthRate: growthRate.toFixed(2)
      });

   });
};


exports.getConversionStats = (req, res) => {

   const userId = req.user.id;
   const role = req.user.role;

   let whereClause = "";
   let values = [];

   if (role !== "admin") {
      whereClause = "WHERE assigned_to = ?";
      values.push(userId);
   }

   const query = `
      SELECT 
         COUNT(*) AS totalLeads,
         SUM(status='Closed Won') AS closedWon
      FROM leads
      ${whereClause}
   `;

   db.query(query, values, (err, result) => {

      if (err) return res.status(500).json(err);

      const total = result[0].totalLeads || 0;
      const won = result[0].closedWon || 0;

      const ratio = total === 0 ? 0 : ((won / total) * 100).toFixed(2);

      res.json({
         totalLeads: total,
         closedWon: won,
         conversionRate: ratio
      });
   });
};


