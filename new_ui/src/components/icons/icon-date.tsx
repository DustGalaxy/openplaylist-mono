import * as React from 'react'
import type { SVGProps } from 'react'

const DateOutline = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={33}
    height={33}
    fill="none"
    viewBox="0 0 45 45"
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M36.563 7.031H8.436A4.219 4.219 0 0 0 4.22 11.25v25.313a4.219 4.219 0 0 0 4.218 4.218h28.126a4.219 4.219 0 0 0 4.218-4.218V11.25a4.219 4.219 0 0 0-4.218-4.219Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M11.25 4.219V7.03m22.5-2.812V7.03M17.139 19.688h-6.153c-.63 0-1.142.511-1.142 1.142v6.152c0 .631.511 1.143 1.142 1.143h6.153c.63 0 1.142-.512 1.142-1.143V20.83c0-.631-.511-1.142-1.142-1.142ZM40.781 14.063H4.22"
    />
  </svg>
)

export default DateOutline
