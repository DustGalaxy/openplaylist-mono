import * as React from 'react'
import type { SVGProps } from 'react'

const Save = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill={props.fill || 'none'}
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M30.094 5H13.219A4.219 4.219 0 0 0 9 9.219v32.343l12.656-11.25 12.657 11.25V9.22A4.219 4.219 0 0 0 30.093 5Z"
    />
  </svg>
)
export default Save
