export interface TableCell<T extends object = object> {
  value: any
  render: (type: string) => React.ReactNode
  getCellProps: () => Record<string, any>
}

export interface TableRow<T extends object = object> {
  original: T
  id?: string
  cells: TableCell<T>[]
  getRowProps: () => Record<string, any>
}

export interface TableColumn<T extends object = object> {
  Header?: string | React.ReactNode
  accessor?: keyof T
  Cell?: (info: { value: any; row: TableRow<T> }) => React.ReactNode
  id?: string
  [key: string]: any
}
