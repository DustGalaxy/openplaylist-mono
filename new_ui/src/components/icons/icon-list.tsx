import * as React from 'react'
import type { SVGProps } from 'react'

const List = (props: SVGProps<SVGSVGElement>) => (
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
      d="M14.063 12.656h25.312M14.062 22.5h25.313m-25.313 9.844h25.313M7.031 14.063a1.406 1.406 0 1 0 0-2.813 1.406 1.406 0 0 0 0 2.813ZM7.031 23.906a1.406 1.406 0 1 0 0-2.812 1.406 1.406 0 0 0 0 2.812ZM7.031 33.75a1.406 1.406 0 1 0 0-2.812 1.406 1.406 0 0 0 0 2.812Z"
    />
  </svg>
)
export default List
