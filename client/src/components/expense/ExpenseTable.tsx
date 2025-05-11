import { useState } from "react";
import { 
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Expense } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { formatCurrency, getStatusColor, getCategoryBgColor } from "@/lib/expenseUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  onEditExpense: (expense: Expense) => void;
}

const ExpenseTable = ({ expenses, onEditExpense }: ExpenseTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();

  // Get unique categories, statuses, and payment modes from expenses
  const uniqueCategories: string[] = [];
  const seenCategories = new Set<string>();
  const uniqueStatuses: string[] = [];
  const seenStatuses = new Set<string>();
  const uniquePaymentModes: string[] = [];
  const seenPaymentModes = new Set<string>();
  
  expenses.forEach(expense => {
    if (!seenCategories.has(expense.category)) {
      seenCategories.add(expense.category);
      uniqueCategories.push(expense.category);
    }
    
    if (!seenStatuses.has(expense.status)) {
      seenStatuses.add(expense.status);
      uniqueStatuses.push(expense.status);
    }
    
    if (!seenPaymentModes.has(expense.paymentMode)) {
      seenPaymentModes.add(expense.paymentMode);
      uniquePaymentModes.push(expense.paymentMode);
    }
  });

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <span>{format(new Date(row.original.date), "dd MMM yyyy")}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <div>
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-2">
              <Input
                placeholder="Filter..."
                value={(columnFilters.find(f => f.id === "name")?.value as string) ?? ""}
                onChange={(e) => {
                  column.setFilterValue(e.target.value);
                }}
                className="h-8 w-full"
              />
            </div>
          </div>
        );
      },
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <div>
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-2">
              <Select
                value={(columnFilters.find(f => f.id === "status")?.value as string) ?? ""}
                onValueChange={(value) => {
                  column.setFilterValue(value === "all" ? undefined : value);
                }}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      },
      cell: ({ row }) => {
        const status = row.original.status;
        const { bg, text } = getStatusColor(status);
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${bg} ${text} capitalize`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        return (
          <div>
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              Category
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-2">
              <Select
                value={(columnFilters.find(f => f.id === "category")?.value as string) ?? ""}
                onValueChange={(value) => {
                  column.setFilterValue(value === "all" ? undefined : value);
                }}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      },
      cell: ({ row }) => {
        const category = row.original.category;
        const bgColor = getCategoryBgColor(category);
        return (
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full ${bgColor} mr-2`}></span>
            <span>{category}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMode",
      header: ({ column }) => {
        return (
          <div>
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent"
            >
              Payment Mode
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-2">
              <Select
                value={(columnFilters.find(f => f.id === "paymentMode")?.value as string) ?? ""}
                onValueChange={(value) => {
                  column.setFilterValue(value === "all" ? undefined : value);
                }}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniquePaymentModes.map(mode => (
                    <SelectItem key={mode} value={mode}>
                      {mode.replace('_', ' ').charAt(0).toUpperCase() + mode.replace('_', ' ').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      },
      cell: ({ row }) => (
        <span className="capitalize">{row.original.paymentMode.replace('_', ' ')}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neutral-400 hover:text-neutral-700"
            onClick={() => onEditExpense(row.original)}
          >
            <i className="fas fa-edit"></i>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neutral-400 hover:text-danger-DEFAULT"
            onClick={() => handleDeleteExpense(row.original.id)}
          >
            <i className="fas fa-trash"></i>
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: expenses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleDeleteExpense = async (id: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        await apiRequest("DELETE", `/api/expenses/${id}`, {});
        
        // Invalidate expenses query
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
        
        toast({
          title: "Expense deleted",
          description: "The expense has been successfully deleted",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: "Failed to delete the expense. Please try again.",
        });
      }
    }
  };

  const { pageSize, pageIndex } = table.getState().pagination;
  const totalPages = table.getPageCount();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-neutral-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {expenses.length > 0 && (
        <div className="px-6 py-3 flex items-center justify-between border-t border-neutral-200">
          <div className="text-sm text-neutral-500">
            Showing <span className="font-medium">{pageIndex * pageSize + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min((pageIndex + 1) * pageSize, expenses.length)}
            </span>{" "}
            of <span className="font-medium">{expenses.length}</span> results
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-9 w-9"
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </Button>
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={pageIndex + 1 === page}
                    onClick={() => table.setPageIndex(page - 1)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-9 w-9"
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;
