import * as React from 'react'
import type { SVGProps } from 'react'

const Trash = (props: SVGProps<SVGSVGElement>) => (
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
      strokeWidth={2}
      d="m9.844 9.844 1.758 28.125c.083 1.625 1.265 2.812 2.812 2.812h16.172c1.553 0 2.713-1.187 2.812-2.812l1.758-28.125"
    />
    <path fill="#fff" d="M7.031 9.844H37.97 7.03Z" />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeMiterlimit={10}
      strokeWidth={props.strokeWidth || 2}
      d="M7.031 9.844H37.97"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth || 2}
      d="M16.875 9.844V6.328a2.104 2.104 0 0 1 2.11-2.11h7.03a2.103 2.103 0 0 1 2.11 2.11v3.516M22.5 15.469v19.687M16.172 15.47l.703 19.687M28.828 15.47l-.703 19.687"
    />
  </svg>
)
export default Trash
