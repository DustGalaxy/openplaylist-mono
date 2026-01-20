import * as React from 'react'
import type { SVGProps } from 'react'

const Copy = (props: SVGProps<SVGSVGElement>) => (
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
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M35.772 11.25H16.26a5.01 5.01 0 0 0-5.01 5.01v19.512a5.01 5.01 0 0 0 5.01 5.01h19.512a5.01 5.01 0 0 0 5.01-5.01V16.26a5.01 5.01 0 0 0-5.01-5.01Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="m33.706 11.25.044-2.11a4.936 4.936 0 0 0-4.922-4.921H9.844a5.642 5.642 0 0 0-5.625 5.625v18.984A4.936 4.936 0 0 0 9.14 33.75h2.109"
    />
  </svg>
)
export default Copy
