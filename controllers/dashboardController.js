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

exports.getReportSummary = (req, res) => {

   const { type } = req.query;
   const userId = req.user.id;
   const role = req.user.role;

   let dateCondition = "";
   let roleCondition = "";
   const params = [];

   if (type === "weekly") {
      dateCondition = "AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
   }

   if (type === "monthly") {
      dateCondition = "AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
   }

   // 🔒 Staff restriction
   if (role !== "admin") {
      roleCondition = "AND assigned_to = ?";
      params.push(userId);
   }

   const query = `
      SELECT 
         COUNT(*) AS totalLeads,
         SUM(status='Closed Won') AS converted
      FROM leads
      WHERE 1=1
      ${roleCondition}
      ${dateCondition}
   `;

   db.query(query, params, (err, result) => {

      if (err) return res.status(500).json(err);

      const total = result[0].totalLeads || 0;
      const converted = result[0].converted || 0;

      res.json({
         totalLeads: total,
         converted,
         notConverted: total - converted
      });
   });
};

exports.getReportStats = (req, res) => {

   const { type } = req.query;
   const userId = req.user.id;
   const role = req.user.role;

   let dateCondition = "";
   let roleCondition = "";
   const params = [];

   if (type === "weekly") {
      dateCondition = "YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
   } else {
      dateCondition = "MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
   }

   if (role !== "admin") {
      roleCondition = "AND assigned_to = ?";
      params.push(userId);
   }

   const query = `
      SELECT 
         COUNT(*) AS totalLeads,
         SUM(status='Closed Won') AS convertedLeads
      FROM leads
      WHERE ${dateCondition}
      ${roleCondition}
   `;

   db.query(query, params, (err, result) => {

      if (err) return res.status(500).json(err);

      const total = result[0].totalLeads || 0;
      const converted = result[0].convertedLeads || 0;

      const rate = total > 0
         ? ((converted / total) * 100).toFixed(1)
         : 0;

      res.json({
         total,
         converted,
         rate
      });

   });
};

exports.getProjectStats = (req, res) => {

   const userId = req.user.id;
   const role = req.user.role;

   let query = `
      SELECT 
         p.id,
         p.name AS project_name,
         COUNT(l.id) AS total_leads,
         SUM(l.status = 'Closed Won') AS closed_won,
         SUM(
            CASE 
               WHEN l.status = 'Closed Won' 
               THEN s.sale_amount 
               ELSE 0 
            END
         ) AS revenue
      FROM projects p
      LEFT JOIN leads l ON l.project_id = p.id
      LEFT JOIN sale_details s ON s.lead_id = l.id
   `;

   const params = [];

   // 🔒 Staff restriction
   if (role !== "admin") {
      query += " WHERE l.assigned_to = ?";
      params.push(userId);
   }

   query += `
      GROUP BY p.id
      ORDER BY p.created_at DESC
   `;

   db.query(query, params, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
   });
};

exports.getUnassignedCount = (req, res) => {

   let query = `
      SELECT COUNT(*) AS total
      FROM leads
      WHERE assigned_to IS NULL
   `;

   if (req.user.role !== "admin") {
      query += " AND assigned_to = ?";
      db.query(query, [req.user.id], (err, result) => {
         if (err) return res.status(500).json(err);
         res.json(result[0]);
      });
   } else {
      db.query(query, (err, result) => {
         if (err) return res.status(500).json(err);
         res.json(result[0]);
      });
   }
};


exports.getLicenseStats = (req, res) => {

   db.query("SELECT * FROM app_config LIMIT 1", (err, configResult) => {

      if (err) return res.status(500).json(err);
      if (!configResult.length)
         return res.status(500).json({ message: "Config not found" });

      const maxUsers = configResult[0].max_users;
      const maxAdmin = configResult[0].max_admin;

      db.query(`
         SELECT 
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN roles.role_name = 'admin' THEN 1 ELSE 0 END) AS adminCount
         FROM users
         JOIN roles ON users.role_id = roles.id
      `, (err, countResult) => {

         if (err) return res.status(500).json(err);

         const totalUsers = countResult[0].totalUsers;
         const adminCount = countResult[0].adminCount || 0;

         res.json({
            totalUsers,
            adminCount,
            maxUsers,
            maxAdmin,
            staffCount: totalUsers - adminCount
         });

      });

   });
};