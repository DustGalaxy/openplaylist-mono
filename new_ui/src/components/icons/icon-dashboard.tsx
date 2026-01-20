import * as React from 'react'
import type { SVGProps } from 'react'

const Dashboard = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M36.8376 15.4688H8.1624C6.76103 15.4688 5.625 16.6048 5.625 18.0062V35.4313C5.625 36.8327 6.76103 37.9688 8.1624 37.9688H36.8376C38.239 37.9688 39.375 36.8327 39.375 35.4313V18.0062C39.375 16.6048 38.239 15.4688 36.8376 15.4688Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinejoin="round"
    />
    <path d="M12.6562 7.03125H32.3438ZM9.84375 11.25H35.1562Z" fill="white" />
    <path
      d="M12.6562 7.03125H32.3438M9.84375 11.25H35.1562"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeMiterlimit={10}
      strokeLinecap="round"
    />
  </svg>
)
export default Dashboard
