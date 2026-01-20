import * as React from 'react'
import type { SVGProps } from 'react'

const Time = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 45}
    height={props.height || 45}
    viewBox="0 0 45 45"
    fill="none"
    {...props}
  >
    <path
      stroke="#fff"
      strokeMiterlimit={10}
      strokeWidth={props.strokeWidth || 2}
      d="M22.5 5.625c-9.316 0-16.875 7.559-16.875 16.875 0 9.316 7.559 16.875 16.875 16.875 9.316 0 16.875-7.559 16.875-16.875 0-9.316-7.559-16.875-16.875-16.875Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M22.5 11.25v12.656h8.438"
    />
  </svg>
)
export default Time
