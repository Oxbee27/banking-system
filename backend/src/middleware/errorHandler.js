const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      message: "The information you entered is not valid. Please check it and try again.",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      status: "error",
      message: "Request body is too large.",
    });
  }

  const statusCode = Number.isInteger(err.statusCode)
    ? err.statusCode
    : 500;

  // Only expose messages for expected client errors and pending responses.
  if ((statusCode >= 400 && statusCode < 500) || statusCode === 202) {
    return res.status(statusCode).json({
      status: "error",
      message: err.message || "The request could not be completed.",
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Something went wrong. Please try again later.",
  });
};

module.exports = errorHandler;
