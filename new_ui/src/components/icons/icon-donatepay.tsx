import type { SVGProps } from 'react'

const DonatePayIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" {...props}>
    <rect width="100" height="100" rx="20" fill="#3B82F6" />
    <path
      d="M32 28H54C63.9411 28 72 36.0589 72 46C72 55.9411 63.9411 64 54 64H44V72H32V28ZM44 52H54C57.3137 52 60 49.3137 60 46C60 42.6863 57.3137 40 54 40H44V52Z"
      fill="white"
    />
  </svg>
)

export default DonatePayIcon
