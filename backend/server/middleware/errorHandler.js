function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Not found",
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  console.error({
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  });

  res.status(statusCode).json({
    error: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack }),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
