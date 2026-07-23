const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.headers.token;
    const secretKey = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secretKey);

    if(!decoded){
        return res.status(401).json({ message: 'invalid user'});
    }
    
    const userId = decoded.userId;
    req.userId = userId;
    next();
}

module.exports = authMiddleware;