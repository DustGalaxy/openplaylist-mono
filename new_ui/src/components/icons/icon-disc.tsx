import * as React from 'react'
import type { SVGProps } from 'react'

const Disc = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={props.width || 33}
    height={props.width || 33}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M22.5 40.7812C32.5965 40.7812 40.7812 32.5965 40.7812 22.5C40.7812 12.4035 32.5965 4.21875 22.5 4.21875C12.4035 4.21875 4.21875 12.4035 4.21875 22.5C4.21875 32.5965 12.4035 40.7812 22.5 40.7812Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeMiterlimit={10}
    />
    <path
      d="M22.5 30.9375C27.1599 30.9375 30.9375 27.1599 30.9375 22.5C30.9375 17.8401 27.1599 14.0625 22.5 14.0625C17.8401 14.0625 14.0625 17.8401 14.0625 22.5C14.0625 27.1599 17.8401 30.9375 22.5 30.9375Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeMiterlimit={10}
    />
    <path
      d="M22.5 25.3125C24.0533 25.3125 25.3125 24.0533 25.3125 22.5C25.3125 20.9467 24.0533 19.6875 22.5 19.6875C20.9467 19.6875 19.6875 20.9467 19.6875 22.5C19.6875 24.0533 20.9467 25.3125 22.5 25.3125Z"
      fill="white"
    />
  </svg>
)
export default Disc
