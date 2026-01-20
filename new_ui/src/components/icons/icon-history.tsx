import * as React from 'react'
import type { SVGProps } from 'react'

const History = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M5.45459 6.30688V13.125H12.2728"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.75 22.5C3.75 32.8553 12.1447 41.25 22.5 41.25C32.8553 41.25 41.25 32.8553 41.25 22.5C41.25 12.1447 32.8553 3.75 22.5 3.75C15.5606 3.75 9.50166 7.51979 6.25947 13.1232"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22.5047 11.25L22.5036 22.5082L30.453 30.4577"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
export default History
