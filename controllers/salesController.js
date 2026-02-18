const db = require("../config/db");

exports.getSalesStats = (req, res) => {

   const userId = req.user.id;
   const role = req.user.role;

   let whereClause = "";
   let values = [];

   if (role !== "admin") {
      whereClause = "WHERE created_by = ?";
      values.push(userId);
   }

   const query = `
      SELECT 
         COUNT(*) AS totalSales,
         SUM(sale_amount) AS totalRevenue,
         AVG(sale_amount) AS avgSaleValue
      FROM sale_details
      ${whereClause}
   `;

   db.query(query, values, (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result[0]);
   });
};
