const jwt = require('jsonwebtoken');

 module.exports = async function isAuthenticated(req, res, next) {
   const authHeader = req.headers['authorization'] || req.headers['Authorization'];
   const token = authHeader?.split(' ')[1];
   if (!token) {
     return res.status(401).json({ message: 'Token is missing' });
   }
   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
     if (err) {
       console.error('Authentication error:', err);
       return res.status(401).json({ message: 'Invalid token' });
     } else {
       req.user = user;
       next();
     }
   });
 };
