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


exports.updateSale = (req, res) => {

   const { id } = req.params;
   const { sale_amount, closing_date } = req.body;

   // Validation
   if (!sale_amount || sale_amount <= 0) {
      return res.status(400).json({ message: "Invalid sale amount" });
   }

   const today = new Date().toISOString().split("T")[0];

   if (closing_date > today) {
      return res.status(400).json({ message: "Closing date cannot be future" });
   }

   db.query(
      "UPDATE sale_details SET sale_amount=?, closing_date=? WHERE id=?",
      [sale_amount, closing_date, id],
      (err) => {

         if (err) return res.status(500).json(err);

         res.json({ message: "Sale updated successfully" });
      }
   );
};
