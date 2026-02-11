const db = require("../config/db")
const bcrypt = require("bcryptjs")


exports.login = (req, res) => {
   const { email, password } = req.body;

   db.query("SELECT * from  users WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length==0){
         return res.status(400).json({message:"User not found"});
      }

   })


}