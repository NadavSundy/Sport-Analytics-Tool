import type { ReactNode, TableHTMLAttributes } from 'react';

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  caption: string;
  children: ReactNode;
}

export function DataTable({ caption, children, className, ...props }: DataTableProps) {
  return (
    <div className="ui-data-table" tabIndex={0}>
      <table {...props} className={['ui-data-table__table', className].filter(Boolean).join(' ')}>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
