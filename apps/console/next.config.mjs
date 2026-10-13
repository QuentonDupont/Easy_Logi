/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ["@easy-logi/shared", "@easy-logi/ui", "@easy-logi/agent-runtime", "@easy-logi/agents"],
  typescript: {
    // Types are checked by `pnpm typecheck` / CI, not during `next build`.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
