import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ allowedRoles, children }) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  console.log('PrivateRoute Debug:', {
    currentPath: location.pathname,
    allowedRoles,
    userRole: user?.role,
    token: token ? 'exists' : 'missing',
    isAuthenticated: !!user && !!token,
    hasRole: user ? allowedRoles.includes(user.role) : false,
    timestamp: new Date().toISOString(),
    user: user ? { ...user, token: undefined } : null // Log user data without sensitive info
  });

  if (!user || !token) {
    console.log('PrivateRoute: No user or token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    console.log('PrivateRoute: User role not authorized', {
      userRole: user.role,
      allowedRoles,
      redirectTo: `/${user.role}/dashboard`
    });
    
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  console.log('PrivateRoute: Rendering protected content for path:', location.pathname);
  return children;
};

export default PrivateRoute; 