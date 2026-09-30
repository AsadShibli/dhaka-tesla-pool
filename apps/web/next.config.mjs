// The fare and distance rules live in packages/domain, shared with the API.
// Next compiles that workspace package like its own code.
const nextConfig = {
  transpilePackages: ["domain"],
};

export default nextConfig;
