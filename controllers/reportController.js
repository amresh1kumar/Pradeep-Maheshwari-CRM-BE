const db = require("../config/db");
const XLSX = require("xlsx");

exports.getReport = (req, res) => {

   const { type } = req.query;

   let dateCondition = "";

   if (type === "weekly") {
      dateCondition = "AND closing_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
   }

   if (type === "monthly") {
      dateCondition = "AND MONTH(closing_date) = MONTH(CURDATE())";
   }

   const query = `
      SELECT 
         leads.id,
         leads.name AS lead_name,
         leads.status,
         sale_details.sale_amount,
         sale_details.closing_date
      FROM leads
      LEFT JOIN sale_details 
         ON leads.id = sale_details.lead_id
      WHERE 1=1
      ${dateCondition}
   `;

   db.query(query, (err, rows) => {

      if (err) return res.status(500).json(err);

      const totalLeads = rows.length;
      const convertedLeads = rows.filter(r => r.sale_amount).length;

      const totalRevenue = rows.reduce(
         (sum, r) => sum + (Number(r.sale_amount) || 0),
         0
      );

      const conversionRate =
         totalLeads > 0
            ? ((convertedLeads / totalLeads) * 100).toFixed(2)
            : 0;

      res.json({
         summary: {
            totalLeads,
            convertedLeads,
            totalRevenue,
            conversionRate
         },
         rows
      });

   });
};




exports.exportReport = (req, res) => {

   const { type } = req.query;

   let dateCondition = "";

   if (type === "weekly") {
      dateCondition = "AND closing_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
   }

   if (type === "monthly") {
      dateCondition = "AND MONTH(closing_date) = MONTH(CURDATE())";
   }

   const query = `
      SELECT 
         leads.name AS lead_name,
         leads.status,
         sale_details.sale_amount,
         sale_details.closing_date
      FROM leads
      LEFT JOIN sale_details 
         ON leads.id = sale_details.lead_id
      WHERE 1=1
      ${dateCondition}
   `;

   db.query(query, (err, result) => {

      if (err) return res.status(500).json(err);

      if (!result.length)
         return res.status(400).json({ message: "No data found" });

      const worksheet = XLSX.utils.json_to_sheet(result);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      const buffer = XLSX.write(workbook, {
         type: "buffer",
         bookType: "xlsx"
      });

      res.setHeader(
         "Content-Disposition",
         `attachment; filename=${type}-report.xlsx`
      );

      res.setHeader(
         "Content-Type",
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);

   });
};
