// src/components/PriceTable.jsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import StatusBadge from './StatusBadge';

const fmt = (val) =>
  val != null
    ? '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '—';

export default function PriceTable({ data }) {
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        header: '#',
        id: 'index',
        cell: (info) => (
          <span className="text-slate-500 text-xs">{info.row.index + 1}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'SKU_ID',
        header: 'Product SKU',
        cell: (info) => (
          <span className="font-mono text-xs text-violet-300 break-all">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'Title',
        header: 'Title',
        cell: (info) => (
          // No truncation — allow full wrap into multiple lines
          <span className="text-slate-200 text-xs leading-snug">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'PP',
        header: 'PP (₹)',
        cell: (info) => (
          <span className="text-slate-300 font-medium text-xs">{fmt(info.getValue())}</span>
        ),
      },
      {
        accessorKey: 'SP',
        header: 'Current SP (₹)',
        cell: (info) => (
          <span className="text-slate-300 text-xs">{fmt(info.getValue())}</span>
        ),
      },
      {
        accessorKey: 'RecommendedSP',
        header: 'Recommended SP (₹)',
        cell: (info) => (
          <span className="text-emerald-400 font-semibold text-xs">
            {fmt(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'ExtraProfitPct',
        header: 'Extra Profit',
        cell: (info) => {
          const val = info.getValue();
          if (val == null || val <= 0)
            return <span className="text-slate-500">—</span>;
          return (
            <span className="inline-flex items-center justify-center gap-1 text-amber-400 font-semibold text-xs">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              +{Number(val).toFixed(2)}%
            </span>
          );
        },
      },
      {
        accessorKey: 'CompetitorPrice',
        header: 'Competitor Price (₹)',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sky-400 font-medium text-xs">
                {fmt(info.getValue())}
              </span>
              <span className="text-slate-500 text-xs">{row.StoreName}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'CompetitorStockStatus',
        header: 'Comp. Stock',
        cell: (info) => <StatusBadge status={info.getValue()} />,
        enableSorting: false,
      },
      {
        accessorKey: 'CompetitorURL',
        header: 'Link',
        enableSorting: false,
        cell: (info) => {
          const url = info.getValue();
          if (!url) return <span className="text-slate-500">—</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-violet-400
                hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              View
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-xl border border-slate-700/60 shadow-2xl overflow-hidden">
      <table className="w-full text-sm border-collapse table-fixed">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-slate-800/80 border-b border-slate-700">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`
                    px-2 py-3 text-center text-xs font-semibold text-slate-400
                    uppercase tracking-wider
                    ${header.column.getCanSort()
                      ? 'cursor-pointer select-none hover:text-slate-200 transition-colors'
                      : ''}
                  `}
                >
                  <div className="flex items-center justify-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="text-slate-600">
                        {{ asc: '↑', desc: '↓' }[header.column.getIsSorted()] ?? '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={`
                border-b border-slate-800 transition-colors align-middle
                ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20'}
                hover:bg-slate-800/50
              `}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-2 py-3 text-center align-middle"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}













// // src/components/PriceTable.jsx
// import {
//   useReactTable,
//   getCoreRowModel,
//   getSortedRowModel,
//   flexRender,
// } from '@tanstack/react-table';
// import { useState, useMemo } from 'react';
// import StatusBadge from './StatusBadge';

// const fmt = (val) =>
//   val != null
//     ? '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })
//     : '—';

// export default function PriceTable({ data }) {
//   const [sorting, setSorting] = useState([]);

//   const columns = useMemo(
//     () => [
//       {
//         header: '#',
//         id: 'index',
//         cell: (info) => (
//           <span className="text-slate-500 text-xs">{info.row.index + 1}</span>
//         ),
//         size: 40,
//         enableSorting: false,
//       },
//       {
//         accessorKey: 'SKU_ID',
//         header: 'Product SKU',
//         cell: (info) => (
//           <span className="font-mono text-xs text-violet-300">
//             {info.getValue()}
//           </span>
//         ),
//       },
//       {
//         accessorKey: 'Title',
//         header: 'Title',
//         cell: (info) => (
//           <span className="text-slate-200 text-sm" title={info.getValue()}>
//             {info.getValue()?.length > 45
//               ? info.getValue().substring(0, 45) + '…'
//               : info.getValue()}
//           </span>
//         ),
//         size: 280,
//       },
//       {
//         accessorKey: 'PP',
//         header: 'PP (₹)',
//         cell: (info) => (
//           <span className="text-slate-300 font-medium">{fmt(info.getValue())}</span>
//         ),
//       },
//       {
//         accessorKey: 'SP',
//         header: 'Current SP (₹)',
//         cell: (info) => (
//           <span className="text-slate-300">{fmt(info.getValue())}</span>
//         ),
//       },
//       {
//         accessorKey: 'RecommendedSP',
//         header: 'Recommended SP (₹)',
//         cell: (info) => (
//           <span className="text-emerald-400 font-semibold">
//             {fmt(info.getValue())}
//           </span>
//         ),
//       },
//       {
//         accessorKey: 'ExtraProfitPct',
//         header: 'Extra Profit',
//         cell: (info) => {
//           const val = info.getValue();
//           if (val == null || val <= 0)
//             return <span className="text-slate-500">—</span>;
//           return (
//             <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
//               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
//                 <path
//                   fillRule="evenodd"
//                   d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
//                   clipRule="evenodd"
//                 />
//               </svg>
//               +{Number(val).toFixed(2)}%
//             </span>
//           );
//         },
//       },
//       {
//         accessorKey: 'CompetitorPrice',
//         header: 'Competitor Price (₹)',
//         cell: (info) => {
//           const row = info.row.original;
//           return (
//             <div className="flex flex-col gap-0.5">
//               <span className="text-sky-400 font-medium">
//                 {fmt(info.getValue())}
//               </span>
//               <span className="text-slate-500 text-xs">{row.StoreName}</span>
//             </div>
//           );
//         },
//       },
//       {
//         accessorKey: 'CompetitorStockStatus',
//         header: 'Comp. Stock',
//         cell: (info) => <StatusBadge status={info.getValue()} />,
//       },
//       {
//         accessorKey: 'CompetitorURL',
//         header: 'Competitor Link',
//         enableSorting: false,
//         cell: (info) => {
//           const url = info.getValue();
//           if (!url) return <span className="text-slate-500">—</span>;
//           return (
//             <a
//               href={url}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
//             >
//               View
//               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
//               </svg>
//             </a>
//           );
//         },
//       },
//     ],
//     []
//   );

//   const table = useReactTable({
//     data,
//     columns,
//     state: { sorting },
//     onSortingChange: setSorting,
//     getCoreRowModel: getCoreRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//   });

//   return (
//     <div className="overflow-x-auto rounded-xl border border-slate-700/60 shadow-2xl">
//       <table className="w-full text-sm border-collapse">
//         <thead>
//           {table.getHeaderGroups().map((headerGroup) => (
//             <tr key={headerGroup.id} className="bg-slate-800/80 border-b border-slate-700">
//               {headerGroup.headers.map((header) => (
//                 <th
//                   key={header.id}
//                   onClick={header.column.getToggleSortingHandler()}
//                   className={`
//                     px-4 py-3 text-left text-xs font-semibold text-slate-400
//                     uppercase tracking-wider whitespace-nowrap
//                     ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-200 transition-colors' : ''}
//                   `}
//                 >
//                   <div className="flex items-center gap-1">
//                     {flexRender(header.column.columnDef.header, header.getContext())}
//                     {header.column.getCanSort() && (
//                       <span className="text-slate-600">
//                         {{ asc: '↑', desc: '↓' }[header.column.getIsSorted()] ?? '↕'}
//                       </span>
//                     )}
//                   </div>
//                 </th>
//               ))}
//             </tr>
//           ))}
//         </thead>
//         <tbody>
//           {table.getRowModel().rows.map((row, i) => (
//             <tr
//               key={row.id}
//               className={`
//                 border-b border-slate-800 transition-colors
//                 ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20'}
//                 hover:bg-slate-800/50
//               `}
//             >
//               {row.getVisibleCells().map((cell) => (
//                 <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
//                   {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }