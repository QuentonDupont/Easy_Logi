/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared package ships TypeScript source; let Next transpile it.
  transpilePackages: ["@easy-logi/shared"],
  typescript: {
    // Types are checked by `pnpm typecheck` / CI, not during `next build`.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
