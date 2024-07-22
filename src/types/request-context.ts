import { Request, Response } from "express";

export type RequestContext = {
  requestId: string;
} & Record<string, string>;

export type RequestContextCreatorFunction = (
  req: Request,
  res: Response
) => Record<string, string>;
