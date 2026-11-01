const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      message:
        "The information you entered is not valid. Please check it and try again.",
    });
  }

  return res.status(statusCode).json({
    status: "error",
    message: "Something went wrong. Please try again later.",
  });
};

module.exports = errorHandler;
