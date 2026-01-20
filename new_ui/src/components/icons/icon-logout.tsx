import * as React from 'react'
import type { SVGProps } from 'react'

const Logout = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={props.width || 33}
    height={props.height || 33}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M26.7188 29.5312V33.0469C26.7188 33.9793 26.3484 34.8735 25.689 35.5328C25.0297 36.1921 24.1355 36.5625 23.2031 36.5625H9.14062C8.20822 36.5625 7.31401 36.1921 6.6547 35.5328C5.9954 34.8735 5.625 33.9793 5.625 33.0469V11.9531C5.625 11.0207 5.9954 10.1265 6.6547 9.4672C7.31401 8.8079 8.20822 8.4375 9.14062 8.4375H22.5C24.4415 8.4375 26.7188 10.0116 26.7188 11.9531V15.4688M32.3438 29.5312L39.375 22.5L32.3438 15.4688M15.4688 22.5H37.9688"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
export default Logout
