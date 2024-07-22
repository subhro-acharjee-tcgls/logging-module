import { RequestContext } from "../types/request-context";
import { v4 } from "uuid";

export default class ContextGenerator {
  private _context?: RequestContext;
  public getContext() {
    return this._context;
  }
  public setContext(value: Partial<RequestContext>) {
    this._context = {
      ...value,
      requestId: v4(),
    };
  }
}
