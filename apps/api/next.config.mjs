/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@voxori/database', '@voxori/shared'],
  async headers() {
    return [
      {
        // Allow cross-origin requests from the admin (3001) and web (3000) portals
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization,x-voxori-admin-secret,x-voxori-tool-secret,x-voxori-internal-secret,stripe-signature,x-twilio-signature,x-vapi-secret',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
