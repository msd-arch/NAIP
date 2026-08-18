// Set by the GitHub Pages workflow to '/<repo-name>' (project sites are
// served under a subpath); empty locally so `npm run dev`/`build` are unaffected.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
