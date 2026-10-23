import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/app/lib/auth-cookie";
import { NAV_ITEMS } from "@/app/lib/nav-items";
import { config, proxy } from "../proxy";

function requestWithCookie(token?: string) {
  return new NextRequest("http://localhost/", {
    headers: token ? { cookie: `${AUTH_COOKIE_NAME}=${token}` } : {},
  });
}

describe("proxy", () => {
  it("redirects to /login when the auth cookie is missing", () => {
    const res = proxy(requestWithCookie());

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets the request through when the auth cookie is present", () => {
    const res = proxy(requestWithCookie("tok123"));

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not list the legacy load routes (redirected before the proxy)", () => {
    expect(config.matcher.some((path) => path.startsWith("/cargar-clientes"))).toBe(false);
  });

  it("guards the home route and every menu route", () => {
    expect(NAV_ITEMS).toHaveLength(3);
    expect([...config.matcher].sort()).toEqual(
      ["/", ...NAV_ITEMS.map((item) => item.href)].sort(),
    );
  });
});
