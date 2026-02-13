import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const RoleRoute = ({ children, allowedRoles }) => {

   const { user } = useContext(AuthContext);

   if (!user) {
      return <Navigate to="/" />;
   }

   if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" />;
   }

   return children;
};

export default RoleRoute;
