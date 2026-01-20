import * as React from 'react'
import type { SVGProps } from 'react'

const Menu = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.03125 14.0625H37.9688M7.03125 22.5H37.9688M7.03125 30.9375H37.9688"
      stroke="white"
      strokeWidth={2}
      strokeMiterlimit={10}
      strokeLinecap="round"
    />
  </svg>
)
export default Menu
