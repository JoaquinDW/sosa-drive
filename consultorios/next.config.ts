import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La app vive dentro del repo de Sosa Drive, que tiene su propio lockfile:
  // fijamos la raíz para que Turbopack no tome la carpeta de arriba.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
