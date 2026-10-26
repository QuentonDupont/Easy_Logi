/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server actions default to a 1 MB body. Document uploads (ID photos, payment proofs) are
    // validated at 10 MB in the action itself, and the fitment photo reader at 5 MB.
    serverActions: { bodySizeLimit: "11mb" },
  },
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ["@easy-logi/shared", "@easy-logi/ui", "@easy-logi/import-planner", "@easy-logi/agent-runtime", "@easy-logi/agents"],
  typescript: {
    // Types are checked by `pnpm typecheck` / CI, not during `next build`.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
