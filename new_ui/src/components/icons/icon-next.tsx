import * as React from 'react'
import type { SVGProps } from 'react'

const Next = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 70}
    height={props.height || 75}
    viewBox="0 0 70 75"
    fill="none"
    {...props}
  >
    <path
      stroke="#fff"
      strokeMiterlimit={10}
      strokeWidth={props.strokeWidth || 3}
      d="M4.375 21.316V53.69c0 1.946 1.777 3.182 3.23 2.249l25.823-16.553c1.263-.81 1.263-2.94 0-3.75L7.606 19.083c-1.454-.948-3.231.288-3.231 2.233Zm31.25 0V53.69c0 1.946 1.777 3.182 3.23 2.249l25.822-16.553c1.264-.81 1.264-2.94 0-3.75L38.855 19.083c-1.454-.948-3.23.288-3.23 2.233Z"
    />
  </svg>
)
export default Next
