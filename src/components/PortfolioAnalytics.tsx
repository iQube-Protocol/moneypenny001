import { useEffect, useState } from 'react';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { Execution } from '@/lib/aigent/moneypenny/modules/execution';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  total_fills: number;
  total_volume_usd: number;
  avg_capture_bps: number;
  chains_traded: string[];
  win_rate: number;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: 'hsl(var(--chart-1))',
  polygon: 'hsl(var(--chart-2))',
  arbitrum: 'hsl(var(--chart-3))',
  optimism: 'hsl(var(--chart-4))',
  base: 'hsl(var(--chart-5))',
};

export function PortfolioAnalytics() {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [executionsData, statsData] = await Promise.all([
        moneyPenny.execution.listExecutions(100),
        moneyPenny.execution.getStats('30d'),
      ]);
      setExecutions(executionsData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: 'Error loading analytics',
        description: error instanceof Error ? error.message : 'Failed to load portfolio data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate PnL over time
  const pnlOverTime = executions
    .map((exec) => ({
      date: new Date(exec.timestamp).toLocaleDateString(),
      pnl: (exec.capture_bps / 10000) * exec.qty_filled * exec.avg_price,
      chain: exec.chain,
    }))
    .reverse();

  // Aggregate PnL by date
  const pnlByDate = pnlOverTime.reduce((acc, curr) => {
    const existing = acc.find((item) => item.date === curr.date);
    if (existing) {
      existing.pnl += curr.pnl;
    } else {
      acc.push({ date: curr.date, pnl: curr.pnl });
    }
    return acc;
  }, [] as { date: string; pnl: number }[]);

  // Calculate cumulative PnL
  let cumulative = 0;
  const cumulativePnL = pnlByDate.map((item) => {
    cumulative += item.pnl;
    return { date: item.date, pnl: cumulative };
  });

  // PnL by chain
  const pnlByChain = executions.reduce((acc, exec) => {
    const pnl = (exec.capture_bps / 10000) * exec.qty_filled * exec.avg_price;
    const existing = acc.find((item) => item.chain === exec.chain);
    if (existing) {
      existing.pnl += pnl;
      existing.trades += 1;
    } else {
      acc.push({ chain: exec.chain, pnl, trades: 1 });
    }
    return acc;
  }, [] as { chain: string; pnl: number; trades: number }[]);

  // Volume by chain for pie chart
  const volumeByChain = executions.reduce((acc, exec) => {
    const volume = exec.qty_filled * exec.avg_price;
    const existing = acc.find((item) => item.chain === exec.chain);
    if (existing) {
      existing.volume += volume;
    } else {
      acc.push({ chain: exec.chain, volume });
    }
    return acc;
  }, [] as { chain: string; volume: number }[]);

  // Win/Loss analysis
  const wins = executions.filter((e) => e.capture_bps > 0).length;
  const losses = executions.filter((e) => e.capture_bps <= 0).length;
  const winRate = executions.length > 0 ? (wins / executions.length) * 100 : 0;

  const totalPnL = executions.reduce(
    (sum, exec) => sum + (exec.capture_bps / 10000) * exec.qty_filled * exec.avg_price,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPnL.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalPnL > 0 ? '+' : ''}
              {((totalPnL / (stats?.total_volume_usd || 1)) * 100).toFixed(2)}% of volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {wins} wins / {losses} losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Capture</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avg_capture_bps || 0} bps</div>
            <p className="text-xs text-muted-foreground">Per trade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.total_volume_usd || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_fills || 0} fills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pnl" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pnl">PnL Over Time</TabsTrigger>
          <TabsTrigger value="chains">By Chain</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative PnL</CardTitle>
              <CardDescription>Your profit and loss over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativePnL}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    name="Cumulative PnL ($)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PnL by Chain</CardTitle>
              <CardDescription>Performance across different chains</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlByChain}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="chain" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="pnl" name="PnL ($)" radius={[8, 8, 0, 0]}>
                    {pnlByChain.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHAIN_COLORS[entry.chain] || 'hsl(var(--primary))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume Allocation</CardTitle>
              <CardDescription>Trading volume distribution by chain</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={volumeByChain}
                    dataKey="volume"
                    nameKey="chain"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry) => `${entry.chain}: $${entry.volume.toFixed(0)}`}
                  >
                    {volumeByChain.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHAIN_COLORS[entry.chain] || 'hsl(var(--primary))'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chain Performance</CardTitle>
          <CardDescription>Detailed metrics by chain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pnlByChain.map((item) => (
              <div
                key={item.chain}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHAIN_COLORS[item.chain] || 'hsl(var(--primary))' }}
                  />
                  <span className="font-medium capitalize">{item.chain}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-muted-foreground">Trades</div>
                    <div className="font-medium">{item.trades}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">PnL</div>
                    <div className={`font-medium flex items-center gap-1 ${item.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.pnl > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      ${Math.abs(item.pnl).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
