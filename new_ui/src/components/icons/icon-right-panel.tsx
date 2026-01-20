import * as React from 'react'
import type { SVGProps } from 'react'

const RightPanel = (props: SVGProps<SVGSVGElement>) => (
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
      d="M8.438 39.375h28.124a2.82 2.82 0 0 0 2.813-2.813V8.439a2.82 2.82 0 0 0-2.813-2.813H8.439a2.82 2.82 0 0 0-2.813 2.813v28.124a2.82 2.82 0 0 0 2.813 2.813Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="m17.104 15.806-6.18 6.18 6.18 6.18"
    />
  </svg>
)
export default RightPanel
