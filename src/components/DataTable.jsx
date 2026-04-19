import { useCallback, useMemo, useState } from 'react';

const EMPTY_FILTERS = [];
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

// Generic headless table wrapper. All markup + styling is inline here so
// every table in the palace shares sort + filter behavior but can still
// customize cells via column.cell render functions.
export default function DataTable({
  columns,
  data,
  onRowClick,
  getRowId,                // (row) => string — for selection highlighting
  selectedId,              // currently selected row id
  initialSorting,
  showFilters = true,      // show column filter inputs
  showGlobalFilter = false,
  rowHeight = 'auto',
  compact = false,
  pinnedColumnFilters, // filters set externally (e.g. multi-select dropdowns); merged with internal free-text filters
}) {
  const [sorting, setSorting] = useState(initialSorting || []);
  const [internalFilters, setInternalFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Merge pinned (external) + internal (free-text) filters. Memoized so
  // TanStack sees a stable reference when neither changed — without this,
  // every parent re-render produced a new columnFilters array reference
  // which could cascade into a controlled-state feedback loop.
  const columnFilters = useMemo(() => {
    const pinned = pinnedColumnFilters || [];
    const pinnedIds = new Set(pinned.map(f => f.id));
    const free = internalFilters.filter(f => !pinnedIds.has(f.id));
    return pinned.length || free.length ? [...pinned, ...free] : EMPTY_FILTERS;
  }, [pinnedColumnFilters, internalFilters]);

  const setColumnFilters = useCallback(updater => {
    // Keep pinned filters untouched — only update the internal free-text slice.
    setInternalFilters(prev => {
      const pinned = pinnedColumnFilters || [];
      const pinnedIds = new Set(pinned.map(f => f.id));
      const full = [...pinned, ...prev];
      const next = typeof updater === 'function' ? updater(full) : updater;
      return next.filter(f => !pinnedIds.has(f.id));
    });
  }, [pinnedColumnFilters]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {showGlobalFilter && (
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="filter all columns…"
            style={{ width: 280, fontFamily: 'var(--font-mono)', fontSize: 11 }}
          />
        </div>
      )}

      <div style={{
        border: '1px solid var(--line)',
        fontSize: compact ? 11 : 12,
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: columns.map(c => c.size || '1fr').join(' '),
          borderBottom: '1px solid var(--line)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          {headerGroups[0]?.headers.map(header => {
            const canSort = header.column.getCanSort();
            const sortDir = header.column.getIsSorted();
            return (
              <div
                key={header.id}
                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                style={{
                  padding: compact ? '8px 10px' : '10px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  cursor: canSort ? 'pointer' : 'default',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {canSort && (
                  <span style={{ color: sortDir ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)' }}>
                    {sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '▲▼'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Filter row */}
        {showFilters && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: columns.map(c => c.size || '1fr').join(' '),
            borderBottom: '1px solid var(--line)',
          }}>
            {headerGroups[0]?.headers.map(header => {
              const canFilter = header.column.getCanFilter() && header.column.columnDef.enableColumnFilter !== false;
              const hideInput = header.column.columnDef.meta?.hideFilterInput;
              return (
                <div
                  key={header.id}
                  style={{ padding: '6px 10px' }}
                >
                  {canFilter && !hideInput && (
                    <input
                      type="text"
                      value={(header.column.getFilterValue() ?? '')}
                      onChange={e => header.column.setFilterValue(e.target.value)}
                      placeholder="filter…"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        {rows.map((row, rowIdx) => {
          const id = getRowId ? getRowId(row.original) : row.id;
          const isSelected = selectedId != null && id === selectedId;
          const delayMs = rowIdx < 15 ? rowIdx * 20 : 0;
          return (
            <div
              key={row.id}
              className={`datatable-row${isSelected ? ' is-selected' : ''}`}
              onClick={() => onRowClick && onRowClick(row.original)}
              style={{
                display: 'grid',
                gridTemplateColumns: columns.map(c => c.size || '1fr').join(' '),
                alignItems: 'center',
                cursor: onRowClick ? 'pointer' : 'default',
                borderBottom: '1px solid var(--line)',
                minHeight: rowHeight,
                animationDelay: `${delayMs}ms`,
              }}
            >
              {row.getVisibleCells().map(cell => (
                <div
                  key={cell.id}
                  style={{
                    padding: compact ? '8px 10px' : '10px 12px',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{
            padding: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}>
            no matching rows
          </div>
        )}
      </div>

      <div style={{
        marginTop: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--color-text-muted)',
      }}>
        {rows.length} / {data.length} rows
      </div>
    </div>
  );
}
