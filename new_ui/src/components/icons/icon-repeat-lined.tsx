import * as React from 'react'
import type { SVGProps } from 'react'

const RepeatLined = (props: SVGProps<SVGSVGElement>) => (
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
      d="m28.125 10.547 4.219 4.219-4.219 4.218"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M30.938 14.766H12.655a7.053 7.053 0 0 0-7.031 7.03v1.407m11.25 11.25-4.219-4.219 4.219-4.218"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M14.063 30.234h18.28a7.053 7.053 0 0 0 7.032-7.03v-1.407"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeWidth={props.strokeWidth || 2}
      d="m12.968 6.429 18.334 31.667"
    />
  </svg>
)
export default RepeatLined
