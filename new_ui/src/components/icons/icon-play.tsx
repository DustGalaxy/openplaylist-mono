import * as React from 'react'
import type { SVGProps } from 'react'

const Play = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 33}
    height={props.height || 33}
    fill="none"
    viewBox="0 0 45 45"
    {...props}
  >
    <path
      strokeMiterlimit={10}
      strokeWidth={props.strokeWidth || 2}
      stroke={props.stroke || '#fff'}
      d="M9.844 9.756v25.488c0 1.533 1.494 2.507 2.724 1.772l21.788-13.04c1.066-.637 1.066-2.314 0-2.952L12.568 7.984c-1.23-.735-2.724.24-2.724 1.772Z"
    />
  </svg>
)
export default Play
