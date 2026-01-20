import * as React from 'react'
import type { SVGProps } from 'react'

const Search = (props: SVGProps<SVGSVGElement>) => (
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
      strokeMiterlimit={10}
      strokeWidth={props.strokeWidth || 2}
      d="M19.432 5.625a13.807 13.807 0 1 0 0 27.613 13.807 13.807 0 0 0 0-27.613Z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeMiterlimit={10}
      strokeWidth={props.strokeWidth || 2}
      d="m29.733 29.733 9.642 9.642"
    />
  </svg>
)
export default Search
