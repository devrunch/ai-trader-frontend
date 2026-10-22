import { describe, it, expect } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps a terminal link's own query string, which is the whole point", () => {
    expect(safeNextPath("/dashboard/terminal?symbol=NIFTY%2050&exchange=NSE"))
      .toBe("/dashboard/terminal?symbol=NIFTY%2050&exchange=NSE");
  });

  it("returns null when there is nothing to go back to", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  /* ?next= arrives from the URL bar, so anything that could leave this
     origin has to be dropped -- otherwise the sign-in page forwards people
     to whatever site a link author chose, carrying this app's referrer. */
  it("refuses an absolute URL", () => {
    expect(safeNextPath("https://evil.example/steal")).toBeNull();
    expect(safeNextPath("http://evil.example")).toBeNull();
  });

  it("refuses a scheme-relative URL, which a browser reads as another host", () => {
    expect(safeNextPath("//evil.example/steal")).toBeNull();
  });

  it("refuses the backslash variant some parsers treat as a slash", () => {
    expect(safeNextPath("/\\evil.example")).toBeNull();
  });

  it("refuses a path carrying control characters", () => {
    expect(safeNextPath("/dashboard\nLocation: https://evil.example")).toBeNull();
  });

  it("refuses anything not rooted at /", () => {
    expect(safeNextPath("dashboard/terminal")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });
});
