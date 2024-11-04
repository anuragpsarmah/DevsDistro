import * as express from "express";

type UserType = {
  _id: string;
  username: string;
  name: string;
  profileImageUrl: string;
};

declare global {
  namespace Express {
    export interface Request {
      user?: UserType;
    }
  }
}
