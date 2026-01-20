import * as React from 'react'
import type { SVGProps } from 'react'

const ShuffleLined = (props: SVGProps<SVGSVGElement>) => (
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
      d="m35.156 26.719 4.219 4.218-4.219 4.22m0-25.313 4.219 4.219-4.219 4.218M5.625 30.938h7.487a7.031 7.031 0 0 0 5.85-3.131L22.5 22.5"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M5.625 14.063h7.487a7.031 7.031 0 0 1 5.85 3.13l7.076 10.614a7.03 7.03 0 0 0 5.85 3.13h4.674m0-16.875h-4.674a7.031 7.031 0 0 0-5.85 3.131l-.726 1.088"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeWidth={props.strokeWidth || 2}
      d="m12.968 6.429 18.334 31.667"
    />
  </svg>
)
export default ShuffleLined
