const db = require("../config/db");

exports.getDashboardStats = async (req, res) => {
   try {

      const userId = req.user.id;
      const role = req.user.role;

      let leadCondition = "";
      let followCondition = "";
      let params = [];

      if (role !== "admin") {
         leadCondition = "WHERE assigned_to = ?";
         followCondition = "WHERE leads.assigned_to = ?";
         params.push(userId);
      }

      const [leadStats] = await db.query(`
         SELECT 
            COUNT(*) as totalLeads,
            SUM(status = 'New') as newLeads,
            SUM(status = 'Contacted') as contacted,
            SUM(status = 'Qualified') as qualified,
            SUM(status = 'Closed Won') as won,
            SUM(status = 'Closed Lost') as lost
         FROM leads
         ${leadCondition}
      `, params);

      const [followStats] = await db.query(`
         SELECT 
            SUM(next_followup_date < CURDATE()) as overdue,
            SUM(next_followup_date = CURDATE()) as today,
            SUM(next_followup_date > CURDATE()) as upcoming
         FROM followups
         JOIN leads ON followups.lead_id = leads.id
         ${followCondition}
      `, params);

      res.json({
         ...leadStats[0],
         ...followStats[0]
      });

   } catch (error) {
      console.error("Dashboard Stats Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getRevenueStats = async (req, res) => {
   try {

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

      let whereClause = whereConditions.length
         ? "WHERE " + whereConditions.join(" AND ")
         : "";

      const [monthlyResult] = await db.query(`
         SELECT 
            DATE_FORMAT(closing_date, '%Y-%m') AS month,
            SUM(sale_amount) AS revenue
         FROM sale_details
         ${whereClause}
         GROUP BY month
         ORDER BY month ASC
      `, values);

      const totalRevenue = monthlyResult.reduce(
         (sum, item) => sum + Number(item.revenue || 0),
         0
      );

      const monthsCount = monthlyResult.length;

      const avgMonthly = monthsCount > 0
         ? totalRevenue / monthsCount
         : 0;

      let growthRate = 0;

      if (monthsCount >= 2) {
         const lastMonth = Number(monthlyResult[monthsCount - 1].revenue || 0);
         const prevMonth = Number(monthlyResult[monthsCount - 2].revenue || 0);

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

   } catch (error) {
      console.error("Revenue Stats Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getConversionStats = async (req, res) => {
   try {

      const userId = req.user.id;
      const role = req.user.role;

      let whereClause = "";
      let values = [];

      if (role !== "admin") {
         whereClause = "WHERE assigned_to = ?";
         values.push(userId);
      }

      const [result] = await db.query(`
         SELECT 
            COUNT(*) AS totalLeads,
            SUM(status='Closed Won') AS closedWon
         FROM leads
         ${whereClause}
      `, values);

      const total = result[0].totalLeads || 0;
      const won = result[0].closedWon || 0;

      const ratio = total === 0
         ? 0
         : ((won / total) * 100).toFixed(2);

      res.json({
         totalLeads: total,
         closedWon: won,
         conversionRate: ratio
      });

   } catch (error) {
      console.error("Conversion Stats Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getReportSummary = async (req, res) => {
   try {

      const { type } = req.query;
      const userId = req.user.id;
      const role = req.user.role;

      let dateCondition = "";
      let roleCondition = "";
      let params = [];

      if (type === "weekly") {
         dateCondition = "AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
      }

      if (type === "monthly") {
         dateCondition = `
            AND MONTH(created_at) = MONTH(CURDATE())
            AND YEAR(created_at) = YEAR(CURDATE())
         `;
      }

      if (role !== "admin") {
         roleCondition = "AND assigned_to = ?";
         params.push(userId);
      }

      const [result] = await db.query(`
         SELECT 
            COUNT(*) AS totalLeads,
            SUM(status='Closed Won') AS converted
         FROM leads
         WHERE 1=1
         ${roleCondition}
         ${dateCondition}
      `, params);

      const total = result[0].totalLeads || 0;
      const converted = result[0].converted || 0;

      res.json({
         totalLeads: total,
         converted,
         notConverted: total - converted
      });

   } catch (error) {
      console.error("Report Summary Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getReportStats = async (req, res) => {
   try {

      const { type } = req.query;
      const userId = req.user.id;
      const role = req.user.role;

      let dateCondition = "";
      let roleCondition = "";
      let params = [];

      if (type === "weekly") {
         dateCondition = "YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
      } else {
         dateCondition = `
            MONTH(created_at) = MONTH(CURDATE())
            AND YEAR(created_at) = YEAR(CURDATE())
         `;
      }

      if (role !== "admin") {
         roleCondition = "AND assigned_to = ?";
         params.push(userId);
      }

      const [result] = await db.query(`
         SELECT 
            COUNT(*) AS totalLeads,
            SUM(status='Closed Won') AS convertedLeads
         FROM leads
         WHERE ${dateCondition}
         ${roleCondition}
      `, params);

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

   } catch (error) {
      console.error("Report Stats Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getProjectStats = async (req, res) => {
   try {

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

      let params = [];

      if (role !== "admin") {
         query += " WHERE l.assigned_to = ?";
         params.push(userId);
      }

      query += `
         GROUP BY p.id
         ORDER BY p.created_at DESC
      `;

      const [result] = await db.query(query, params);

      res.json(result);

   } catch (error) {
      console.error("Project Stats Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getUnassignedCount = async (req, res) => {
   try {

      // 🔒 Only admin should see unassigned leads
      if (req.user.role !== "admin") {
         return res.json({ total: 0 });
      }

      const [result] = await db.query(`
         SELECT COUNT(*) AS total
         FROM leads
         WHERE assigned_to IS NULL
      `);

      res.json(result[0]);

   } catch (error) {

      console.error("Unassigned Count Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });
   }
};

exports.getLicenseStats = async (req, res) => {
   try {

      const [configResult] = await db.query(
         "SELECT * FROM app_config LIMIT 1"
      );

      if (!configResult.length) {
         return res.status(500).json({
            message: "Config not found"
         });
      }

      const maxUsers = configResult[0].max_users;
      const maxAdmin = configResult[0].max_admin;

      const [countResult] = await db.query(`
         SELECT 
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN roles.role_name = 'admin' THEN 1 ELSE 0 END) AS adminCount
         FROM users
         JOIN roles ON users.role_id = roles.id
      `);

      const totalUsers = countResult[0].totalUsers;
      const adminCount = countResult[0].adminCount || 0;

      res.json({
         totalUsers,
         adminCount,
         maxUsers,
         maxAdmin,
         staffCount: totalUsers - adminCount
      });

   } catch (error) {
      console.error("License Stats Error:", error.message);
      res.status(500).json({ message: "Server error" });
   }
};