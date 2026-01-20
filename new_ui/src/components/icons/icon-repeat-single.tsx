import * as React from 'react'
import type { SVGProps } from 'react'

const RepeatSingle = (props: SVGProps<SVGSVGElement>) => (
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
      fill="#fff"
      d="M23.459 18.727h.65a.65.65 0 0 0-.65-.65v.65Zm0 7.273v.65a.65.65 0 0 0 .65-.65h-.65Zm-1.101 0h-.65c0 .359.291.65.65.65V26Zm0-6.172h.65a.65.65 0 0 0-.65-.65v.65Zm-.043 0v-.65a.65.65 0 0 0-.355.106l.355.544Zm-1.74 1.137h-.65a.65.65 0 0 0 1.006.544l-.356-.544Zm0-1.052-.355-.544a.65.65 0 0 0-.295.544h.65Zm1.815-1.186v-.65a.65.65 0 0 0-.356.106l.356.544Zm1.069 0h-.65V26h1.3v-7.273h-.65Zm0 7.273v-.65h-1.101v1.3h1.1V26Zm-1.101 0h.65v-6.172h-1.3V26h.65Zm0-6.172v-.65h-.043v1.3h.043v-.65Zm-.043 0-.355-.544-1.74 1.136.355.544.356.545 1.74-1.137-.356-.544Zm-1.74 1.137h.65v-1.052h-1.3v1.052h.65Zm0-1.052.356.544 1.814-1.186-.355-.544-.356-.544-1.814 1.186.355.544Zm1.815-1.186v.65h1.069v-1.3h-1.07v.65Z"
    />
  </svg>
)
export default RepeatSingle
