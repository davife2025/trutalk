/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@platform/ui", "@platform/types", "@platform/supabase-client"],
};
module.exports = nextConfig;
