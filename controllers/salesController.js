const db = require("../config/db");


exports.getSalesStats = async (req, res) => {
   try {

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
            COALESCE(SUM(sale_amount), 0) AS totalRevenue,
            COALESCE(AVG(sale_amount), 0) AS avgSaleValue
         FROM sale_details
         ${whereClause}
      `;

      const [rows] = await db.query(query, values);

      res.json(rows[0]);

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};



exports.updateSale = async (req, res) => {
   try {

      const { id } = req.params;
      const { sale_amount, closing_date } = req.body;

      if (!sale_amount || sale_amount <= 0) {
         return res.status(400).json({ message: "Invalid sale amount" });
      }

      if (!closing_date) {
         return res.status(400).json({ message: "Closing date required" });
      }

      const today = new Date();
      const inputDate = new Date(closing_date);

      if (inputDate > today) {
         return res.status(400).json({
            message: "Closing date cannot be in the future"
         });
      }

      // 🔒 Check Sale Exists + Ownership
      let checkQuery = `
         SELECT * FROM sale_details
         WHERE id = ?
      `;

      let params = [id];

      if (req.user.role !== "admin") {
         checkQuery += " AND created_by = ?";
         params.push(req.user.id);
      }

      const [existing] = await db.query(checkQuery, params);

      if (!existing.length) {
         return res.status(404).json({
            message: "Sale not found or unauthorized"
         });
      }

      await db.query(
         "UPDATE sale_details SET sale_amount=?, closing_date=? WHERE id=?",
         [sale_amount, closing_date, id]
      );

      res.json({ message: "Sale updated successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};