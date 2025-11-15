const ResponseCodes = {
  SUCCESS: "0000",
  CREATED: "01",
  BAD_REQUEST: "02",
  UNAUTHORIZED: "03",
  FORBIDDEN: "04",
  NOT_FOUND: "05",
  CONFLICT: "06",
  SERVER_ERROR: "07",
  VALIDATION_ERROR: "08",
  TIMEOUT: "09",
  DUPLICATE_REQUEST: "10",
};

const ResponseMessages = {
  "00": "Request successful",
  "01": "Resource created successfully",
  "02": "Bad request – invalid input or missing parameters",
  "03": "Unauthorized – invalid or missing credentials",
  "04": "Forbidden – access denied",
  "05": "Resource not found",
  "06": "Conflict – resource already exists",
  "07": "Internal server error",
  "08": "Validation failed",
  "09": "Request timeout",
  "10": "Duplicate request",
};

// ✅ Map response codes to HTTP status codes
const HttpStatusMap = {
  "00": 200, // success
  "01": 201, // created
  "02": 400, // bad request
  "03": 401, // unauthorized
  "04": 403, // forbidden
  "05": 404, // not found
  "06": 409, // conflict
  "07": 500, // internal server error
  "08": 422, // validation failed
  "09": 408, // timeout
  "10": 409, // duplicate request
};

const buildResponse = (code, data = null, message = null) => {
  return {
    code,
    message: message || ResponseMessages[code] || "Unknown status",
    data,
    timestamp: new Date().toISOString(),
  };
};

const sendSuccess = (res, data = null, message = null, code = ResponseCodes.SUCCESS) => {
  const status = HttpStatusMap[code] || 200;
  return res.status(status).json(buildResponse(code, data, message));
};

const sendError = (res, code = ResponseCodes.SERVER_ERROR, message = null, data = null, err = null) => {
  
 

  const status = HttpStatusMap[code] || 500;
  return res.status(status).json(buildResponse(code, data, message));
};


module.exports = {
  ResponseCodes,
  ResponseMessages,
  HttpStatusMap,
  buildResponse,
  sendSuccess,
  sendError,
};
