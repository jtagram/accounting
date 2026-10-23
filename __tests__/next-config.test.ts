import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config redirects", () => {
  it("sends the legacy load pages to the matching process page (temporary)", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual([
      { source: "/cargar-clientes-arca", destination: "/procesar-clientes-arca", permanent: false },
      {
        source: "/cargar-clientes-arca-agip",
        destination: "/procesar-clientes-arca-agip",
        permanent: false,
      },
      {
        source: "/cargar-clientes-arca-arba",
        destination: "/procesar-clientes-arca-arba",
        permanent: false,
      },
    ]);
  });
});
