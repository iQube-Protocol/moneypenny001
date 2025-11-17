import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Transaction {
  transaction_date: string;
  amount: number;
  category: string;
  description: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function FinancialChartsPanel() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: true });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No transaction data available. Upload banking documents to see visualizations.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const dailyBalanceData = prepareDailyBalanceData(transactions);
  const categoryData = prepareCategoryData(transactions);
  const cashFlowData = prepareCashFlowData(transactions);
  const incomeVsExpenseData = prepareIncomeVsExpenseData(transactions);

  return (
    <Tabs defaultValue="timeline" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        <TabsTrigger value="income">Income vs Expense</TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Balance Trend</CardTitle>
            <CardDescription>Cumulative balance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyBalanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="categories" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Distribution of expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Expense amounts by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="cashflow" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Analysis</CardTitle>
            <CardDescription>Cumulative cash flow over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)"
                  name="Cumulative Flow"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="income" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="hsl(var(--chart-2))" name="Income" />
                <Bar dataKey="expenses" fill="hsl(var(--chart-1))" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function prepareDailyBalanceData(transactions: Transaction[]) {
  let balance = 0;
  const data: { date: string; balance: number }[] = [];
  
  transactions.forEach((t) => {
    balance += t.amount;
    data.push({
      date: new Date(t.transaction_date).toLocaleDateString(),
      balance: Math.round(balance),
    });
  });
  
  return data;
}

function prepareCategoryData(transactions: Transaction[]) {
  const categoryMap = new Map<string, number>();
  
  transactions.forEach((t) => {
    if (t.amount < 0) {
      const current = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, current + Math.abs(t.amount));
    }
  });
  
  return Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function prepareCashFlowData(transactions: Transaction[]) {
  let cumulative = 0;
  const data: { date: string; cumulative: number }[] = [];
  
  transactions.forEach((t) => {
    cumulative += t.amount;
    data.push({
      date: new Date(t.transaction_date).toLocaleDateString(),
      cumulative: Math.round(cumulative),
    });
  });
  
  return data;
}

function prepareIncomeVsExpenseData(transactions: Transaction[]) {
  const monthMap = new Map<string, { income: number; expenses: number }>();
  
  transactions.forEach((t) => {
    const month = new Date(t.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const current = monthMap.get(month) || { income: 0, expenses: 0 };
    
    if (t.amount > 0) {
      current.income += t.amount;
    } else {
      current.expenses += Math.abs(t.amount);
    }
    
    monthMap.set(month, current);
  });
  
  return Array.from(monthMap.entries()).map(([month, values]) => ({
    month,
    income: Math.round(values.income),
    expenses: Math.round(values.expenses),
  }));
}