// eslint.config.mjs
import nextConfig from 'eslint-config-next/core-web-vitals'

export default [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // website/ нь өөрийн tsconfig, өөрийн alias-тай тусдаа Next.js апп.
      // Энд шалгавал root-ын дүрмээр дүгнэгдэж, хамаагүй алдаа гаргана.
      'website/**'
    ]
  }
]
