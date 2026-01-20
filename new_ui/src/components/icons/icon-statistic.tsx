import * as React from 'react'
import type { SVGProps } from 'react'

const Statistic = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={props.width || 33}
    height={props.width || 33}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M9.14062 28.125H6.32812C5.9398 28.125 5.625 28.4398 5.625 28.8281V41.4844C5.625 41.8727 5.9398 42.1875 6.32812 42.1875H9.14062C9.52895 42.1875 9.84375 41.8727 9.84375 41.4844V28.8281C9.84375 28.4398 9.52895 28.125 9.14062 28.125Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28.8281 19.6875H26.0156C25.6273 19.6875 25.3125 20.0023 25.3125 20.3906V41.4844C25.3125 41.8727 25.6273 42.1875 26.0156 42.1875H28.8281C29.2165 42.1875 29.5312 41.8727 29.5312 41.4844V20.3906C29.5312 20.0023 29.2165 19.6875 28.8281 19.6875Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M38.6719 9.84375H35.8594C35.471 9.84375 35.1562 10.1585 35.1562 10.5469V41.4844C35.1562 41.8727 35.471 42.1875 35.8594 42.1875H38.6719C39.0602 42.1875 39.375 41.8727 39.375 41.4844V10.5469C39.375 10.1585 39.0602 9.84375 38.6719 9.84375Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.9844 2.8125H16.1719C15.7835 2.8125 15.4688 3.1273 15.4688 3.51562V41.4844C15.4688 41.8727 15.7835 42.1875 16.1719 42.1875H18.9844C19.3727 42.1875 19.6875 41.8727 19.6875 41.4844V3.51562C19.6875 3.1273 19.3727 2.8125 18.9844 2.8125Z"
      stroke="white"
      strokeWidth={props.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
export default Statistic
