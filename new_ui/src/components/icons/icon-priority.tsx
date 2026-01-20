import * as React from 'react'
import type { SVGProps } from 'react'

const Priority = (props: SVGProps<SVGSVGElement>) => (
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
      d="M22.5 2.813a2.795 2.795 0 0 1 2.309 1.22l16.889 24.773a2.794 2.794 0 0 1-.994 4.043L23.81 41.86a2.792 2.792 0 0 1-2.63 0L4.294 32.853a2.793 2.793 0 0 1-.994-4.043L20.19 4.032a2.795 2.795 0 0 1 2.309-1.22Zm0 0v39.374"
    />
  </svg>
)
export default Priority
