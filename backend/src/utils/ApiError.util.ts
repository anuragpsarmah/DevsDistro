class ApiError extends Error {
  status: number;
  data: any;
  error: any;

  constructor(
    message: string,
    statusCode: number,
    data: any = {},
    error: any = {}
  ) {
    super(message);
    this.status = statusCode;
    this.data = data;
    this.error = error;
  }
}

export default ApiError;
