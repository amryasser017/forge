import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TRIO FIT',
    short_name: 'TRIO FIT',
    description: 'Three friends. One mission. Stronger every day.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#F28C28',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
