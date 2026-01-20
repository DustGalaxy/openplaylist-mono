import * as React from 'react'
import type { SVGProps } from 'react'

const Warning = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill="none"
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M7.52 39.221h29.96a2.813 2.813 0 0 0 2.475-4.146L24.977 7.258c-1.063-1.972-3.891-1.972-4.954 0L5.045 35.075a2.812 2.812 0 0 0 2.476 4.146Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="m21.995 17.173.505 10.723.504-10.719a.503.503 0 1 0-1.009-.004Z"
    />
    <path
      fill="#fff"
      d="M22.5 34.915a1.757 1.757 0 1 1 0-3.515 1.757 1.757 0 0 1 0 3.515Z"
    />
  </svg>
)
export default Warning
