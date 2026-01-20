import * as React from 'react'
import type { SVGProps } from 'react'

const Arrow = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="ionicon"
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 512 512"
    {...props}
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 32}
      d="m112 268 144 144 144-144M256 392V100"
    />
  </svg>
)
export default Arrow
