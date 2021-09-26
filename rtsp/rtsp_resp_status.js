/**
 * All RTSP Status Codes, although most of them are generally not used
 * @type {{INTERNAL_SERVER_ERROR: number, SESSION_NOT_FOUND: number, REQUEST_TIMEOUT: number, USE_PROXY: number, PROXY_AUTH_REQUIRED: number, HEADER_FIELD_NOT_VALID: number, UNSUPPORTED_MEDIA_TYPE: number, LOW_STORAGE: number, PAYMENT_REQUIRED: number, MOVED_TEMPORARILY: number, INVALID_RANGE: number, CREATED: number, MOVED_PERMANENTLY: number, BAD_GATEWAY: number, UNAUTHORIZED: number, NOT_ACCEPTABLE: number, REQUEST_URI_TOO_LONG: number, GATEWAY_TIMEOUT: number, OK: number, RTSP_VERSION_NOT_SUPPORTED: number, METHOD_NOT_VALID_IN_THIS_STATE: number, PARAMETER_READ_ONLY: number, METHOD_NOT_ALLOWED: number, NOT_ENOUGH_BANDWIDTH: number, BAD_REQUEST: number, ILLEGAL_CONFERENCE_ID: number, NOT_FOUND: number, INVALID_PARAMETER: number, SEE_OTHER: number, FORBIDDEN: number, CONTINUE: number, LENGTH_REQUIRED: number, NOT_IMPLEMENTED: number, UNSUPPORTED_TRANSPORT: number, DESTINATION_UNREACHABLE: number, OPTION_NOT_SUPPORT: number, AGGREGATE_OPERATION_NOT_ALLOWED: number, PRECONDITION_FAILED: number, MULTIPLE_CHOICES: number, REQUEST_ENTITY_TOO_LARGE: number, SERVICE_UNAVAILABLE: number, GONE: number, ONLY_AGGREGATE_OPERATION_ALLOWED: number}}
 */
module.exports = {
    CONTINUE: 100,
    OK: 200,
    CREATED: 201,
    LOW_STORAGE: 250,
    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    MOVED_TEMPORARILY: 302,
    SEE_OTHER: 303,
    USE_PROXY: 305,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTH_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    REQUEST_ENTITY_TOO_LARGE: 413,
    REQUEST_URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    INVALID_PARAMETER: 451,
    ILLEGAL_CONFERENCE_ID: 452,
    NOT_ENOUGH_BANDWIDTH: 453,
    SESSION_NOT_FOUND: 454,
    METHOD_NOT_VALID_IN_THIS_STATE: 455,
    HEADER_FIELD_NOT_VALID: 456,
    INVALID_RANGE: 457,
    PARAMETER_READ_ONLY: 458,
    AGGREGATE_OPERATION_NOT_ALLOWED: 459,
    ONLY_AGGREGATE_OPERATION_ALLOWED: 460,
    UNSUPPORTED_TRANSPORT: 461,
    DESTINATION_UNREACHABLE: 462,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    RTSP_VERSION_NOT_SUPPORTED: 505,
    OPTION_NOT_SUPPORT: 551
}