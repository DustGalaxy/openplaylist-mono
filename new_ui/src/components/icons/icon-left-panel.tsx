import * as React from 'react'
import type { SVGProps } from 'react'

const LeftPanel = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill="none"
    {...props}
  >
    <path
      fill="#fff"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M21.094 39.375H7.03c-.372-.002-.73-.3-.993-.826-.263-.527-.412-1.241-.413-1.986V8.436c.001-.745.15-1.459.413-1.986.264-.527.62-.824.993-.826h14.063c.372.002.73.3.993.826.264.527.412 1.241.413 1.987v28.124c-.001.746-.15 1.46-.413 1.987-.264.527-.62.824-.993.826Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M36.563 39.375H8.436a2.82 2.82 0 0 1-2.812-2.813V8.439a2.82 2.82 0 0 1 2.813-2.813h28.124a2.82 2.82 0 0 1 2.813 2.813v28.124a2.82 2.82 0 0 1-2.813 2.813Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="m27.896 15.806 6.18 6.18-6.18 6.18"
    />
  </svg>
)
export default LeftPanel
