const authorization = (req, res, next) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({
            status: "error",
            message: "Access denied. Admin privileges are required."
        });
    }

    next();
};

module.exports = authorization;