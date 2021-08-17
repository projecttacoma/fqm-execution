export class BadRequestError extends Error {
  name: string;
  code: number;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequest';
    this.code = 400;
  }
}

export class UnprocessableEntityError extends Error {
  name: string;
  code: number;
  constructor(message: string) {
    super(message);
    this.name = 'UnprocessableEntity';
    this.code = 422;
  }
}
