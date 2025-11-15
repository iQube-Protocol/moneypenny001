import { useState, useEffect, useMemo } from "react";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";

type TransactionType = "fio" | "x402_claim" | "x402_custody" | "execution";
type TransactionStatus = "pending" | "completed" | "failed" | "paid" | "rejected" | "settled" | "redeemed";

interface UnifiedTransaction {
  id: string;
  type: TransactionType;
  description: string;
  amount?: number;
  asset?: string;
  status: TransactionStatus;
  timestamp: string;
  details: any;
}

export function TransactionHistory() {
  const moneyPenny = useMoneyPenny();
  
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const allTransactions: UnifiedTransaction[] = [];

      // Load FIO payment requests
      try {
        const [sentRequests, receivedRequests] = await Promise.all([
          moneyPenny.fio.listPaymentRequests('sent'),
          moneyPenny.fio.listPaymentRequests('received')
        ]);

        sentRequests.forEach(req => {
          allTransactions.push({
            id: req.request_id,
            type: "fio",
            description: `Payment request to ${req.to_fio}`,
            amount: req.amount,
            asset: req.asset,
            status: req.status as TransactionStatus,
            timestamp: req.created_at,
            details: req
          });
        });

        receivedRequests.forEach(req => {
          allTransactions.push({
            id: req.request_id,
            type: "fio",
            description: `Payment request from ${req.from_fio}`,
            amount: req.amount,
            asset: req.asset,
            status: req.status as TransactionStatus,
            timestamp: req.created_at,
            details: req
          });
        });
      } catch (error) {
        console.error("Error loading FIO requests:", error);
      }

      // Load X402 claims
      try {
        const claims = await moneyPenny.x402.listClaims();
        claims.forEach(claim => {
          allTransactions.push({
            id: claim.claim_id,
            type: "x402_claim",
            description: `X402 ${claim.settlement_type} claim`,
            amount: claim.amount,
            asset: claim.asset,
            status: claim.status as TransactionStatus,
            timestamp: claim.created_at,
            details: claim
          });
        });
      } catch (error) {
        console.error("Error loading X402 claims:", error);
      }

      // Load X402 remote custody
      try {
        const custodyAccounts = await moneyPenny.x402.listRemoteCustody();
        custodyAccounts.forEach(custody => {
          allTransactions.push({
            id: custody.escrow_id,
            type: "x402_custody",
            description: `Remote custody escrow on ${custody.chain}`,
            amount: custody.balance,
            asset: custody.asset,
            status: custody.status as TransactionStatus,
            timestamp: custody.opened_at,
            details: custody
          });
        });
      } catch (error) {
        console.error("Error loading custody accounts:", error);
      }

      // Load execution history
      try {
        const executions = await moneyPenny.execution.listExecutions(100);
        executions.forEach(exec => {
          allTransactions.push({
            id: exec.execution_id,
            type: "execution",
            description: `${exec.side} trade on ${exec.chain}`,
            amount: exec.qty_filled,
            asset: exec.chain,
            status: exec.status === "confirmed" ? "completed" : exec.status as TransactionStatus,
            timestamp: exec.timestamp,
            details: exec
          });
        });
      } catch (error) {
        console.error("Error loading executions:", error);
      }

      // Sort by timestamp descending
      allTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      
      const txDate = new Date(tx.timestamp);
      if (dateFrom && txDate < dateFrom) return false;
      if (dateTo && txDate > dateTo) return false;
      
      return true;
    });
  }, [transactions, typeFilter, statusFilter, dateFrom, dateTo]);

  const exportToCSV = () => {
    const headers = ["ID", "Type", "Description", "Amount", "Asset", "Status", "Timestamp"];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      tx.type,
      tx.description,
      tx.amount?.toString() || "",
      tx.asset || "",
      tx.status,
      tx.timestamp
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Exported to CSV");
  };

  const exportToJSON = () => {
    const json = JSON.stringify(filteredTransactions, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Exported to JSON");
  };

  const getStatusBadgeVariant = (status: TransactionStatus) => {
    switch (status) {
      case "completed":
      case "paid":
      case "settled":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTypeBadgeVariant = (type: TransactionType) => {
    switch (type) {
      case "fio":
        return "secondary";
      case "x402_claim":
        return "default";
      case "x402_custody":
        return "outline";
      case "execution":
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          Complete history of FIO payments, X402 claims, custody, and trades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="fio">FIO Payments</SelectItem>
                <SelectItem value="x402_claim">X402 Claims</SelectItem>
                <SelectItem value="x402_custody">X402 Custody</SelectItem>
                <SelectItem value="execution">Trades</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={exportToJSON} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>

        {/* Transactions table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(tx.type)}>
                        {tx.type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>
                      {tx.amount && tx.asset ? (
                        <span className="font-mono">
                          {tx.amount.toFixed(6)} {tx.asset}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tx.status)}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tx.timestamp), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
