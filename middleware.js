const jwt = require('jsonwebtoken');
function middleware(req, res, next) {
    const token = req.headers.token;
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, 'nix123');
        req.userId = parseInt(decoded.userId);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

module.exports = middleware;