import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, Trash2, Plus, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TriggerCondition {
  id: string;
  type: 'price' | 'edge' | 'volume' | 'time';
  operator: 'above' | 'below' | 'equals' | 'between';
  value: number;
  value2?: number;
  chain?: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  chain: string;
  side: 'BUY' | 'SELL';
  amountQc: number;
  minEdgeBps: number;
  maxSlippageBps: number;
  triggers: TriggerCondition[];
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  totalPnL: number;
}

interface BacktestResult {
  date: string;
  portfolioValue: number;
  trades: number;
  pnl: number;
}

export function StrategyBuilder() {
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [editingStrategy, setEditingStrategy] = useState<Partial<Strategy> | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [isBacktesting, setIsBacktesting] = useState(false);

  useEffect(() => {
    // Load strategies from localStorage
    const saved = localStorage.getItem('trading-strategies');
    if (saved) {
      setStrategies(JSON.parse(saved));
    }
  }, []);

  const saveStrategies = (newStrategies: Strategy[]) => {
    setStrategies(newStrategies);
    localStorage.setItem('trading-strategies', JSON.stringify(newStrategies));
  };

  const createStrategy = () => {
    setEditingStrategy({
      name: '',
      description: '',
      enabled: false,
      chain: 'ethereum',
      side: 'BUY',
      amountQc: 1000,
      minEdgeBps: 10,
      maxSlippageBps: 50,
      triggers: [],
      executionCount: 0,
      totalPnL: 0,
    });
  };

  const saveStrategy = () => {
    if (!editingStrategy?.name) {
      toast({
        title: 'Validation Error',
        description: 'Strategy name is required',
        variant: 'destructive',
      });
      return;
    }

    const strategy: Strategy = {
      ...editingStrategy,
      id: editingStrategy.id || `strategy-${Date.now()}`,
      createdAt: editingStrategy.createdAt || new Date(),
    } as Strategy;

    const updated = editingStrategy.id
      ? strategies.map(s => s.id === strategy.id ? strategy : s)
      : [...strategies, strategy];

    saveStrategies(updated);
    setEditingStrategy(null);
    toast({
      title: 'Strategy Saved',
      description: `${strategy.name} has been saved successfully`,
    });
  };

  const toggleStrategy = (id: string) => {
    const updated = strategies.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveStrategies(updated);
    
    const strategy = updated.find(s => s.id === id);
    toast({
      title: strategy?.enabled ? 'Strategy Activated' : 'Strategy Paused',
      description: `${strategy?.name} is now ${strategy?.enabled ? 'active' : 'paused'}`,
    });
  };

  const deleteStrategy = (id: string) => {
    const updated = strategies.filter(s => s.id !== id);
    saveStrategies(updated);
    toast({
      title: 'Strategy Deleted',
      description: 'The strategy has been removed',
    });
  };

  const addTrigger = () => {
    if (!editingStrategy) return;
    
    const newTrigger: TriggerCondition = {
      id: `trigger-${Date.now()}`,
      type: 'price',
      operator: 'above',
      value: 0,
      chain: editingStrategy.chain,
    };

    setEditingStrategy({
      ...editingStrategy,
      triggers: [...(editingStrategy.triggers || []), newTrigger],
    });
  };

  const updateTrigger = (id: string, updates: Partial<TriggerCondition>) => {
    if (!editingStrategy) return;

    setEditingStrategy({
      ...editingStrategy,
      triggers: editingStrategy.triggers?.map(t =>
        t.id === id ? { ...t, ...updates } : t
      ),
    });
  };

  const removeTrigger = (id: string) => {
    if (!editingStrategy) return;

    setEditingStrategy({
      ...editingStrategy,
      triggers: editingStrategy.triggers?.filter(t => t.id !== id),
    });
  };

  const runBacktest = async () => {
    setIsBacktesting(true);
    
    // Simulate backtesting with historical data
    const results: BacktestResult[] = [];
    const days = 30;
    let portfolioValue = 10000;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      // Simulate random market movements and strategy execution
      const shouldExecute = Math.random() > 0.7;
      const trades = shouldExecute ? Math.floor(Math.random() * 3) + 1 : 0;
      const pnl = shouldExecute ? (Math.random() - 0.45) * 200 : 0;
      
      portfolioValue += pnl;

      results.push({
        date: date.toISOString().split('T')[0],
        portfolioValue: Math.round(portfolioValue),
        trades,
        pnl: Math.round(pnl),
      });
    }

    setBacktestResults(results);
    setIsBacktesting(false);

    const totalPnL = results.reduce((sum, r) => sum + r.pnl, 0);
    const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);

    toast({
      title: 'Backtest Complete',
      description: `Simulated ${totalTrades} trades with ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} PnL`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Trading Strategies</h2>
          <p className="text-muted-foreground">Automate your trading with rule-based strategies</p>
        </div>
        <Button onClick={createStrategy}>
          <Plus className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      <Tabs defaultValue="strategies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="strategies">Active Strategies</TabsTrigger>
          <TabsTrigger value="builder">Strategy Builder</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-4">
          {strategies.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No strategies created yet. Click "New Strategy" to get started.
              </CardContent>
            </Card>
          ) : (
            strategies.map(strategy => (
              <Card key={strategy.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {strategy.name}
                        <Badge variant={strategy.enabled ? 'default' : 'secondary'}>
                          {strategy.enabled ? 'Active' : 'Paused'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{strategy.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleStrategy(strategy.id)}
                      >
                        {strategy.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingStrategy(strategy)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteStrategy(strategy.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Chain</div>
                      <div className="font-medium capitalize">{strategy.chain}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Side</div>
                      <div className="font-medium flex items-center gap-1">
                        {strategy.side === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        {strategy.side}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Executions</div>
                      <div className="font-medium">{strategy.executionCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total PnL</div>
                      <div className={`font-medium ${strategy.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {strategy.totalPnL >= 0 ? '+' : ''}${strategy.totalPnL.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {strategy.triggers.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground mb-2">Triggers:</div>
                      <div className="flex flex-wrap gap-2">
                        {strategy.triggers.map(trigger => (
                          <Badge key={trigger.id} variant="outline">
                            {trigger.type} {trigger.operator} {trigger.value}
                            {trigger.value2 && ` - ${trigger.value2}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="builder">
          {editingStrategy ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingStrategy.id ? 'Edit Strategy' : 'Create New Strategy'}
                </CardTitle>
                <CardDescription>
                  Define rules and conditions for automated trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="strategy-name">Strategy Name</Label>
                    <Input
                      id="strategy-name"
                      value={editingStrategy.name || ''}
                      onChange={(e) => setEditingStrategy({ ...editingStrategy, name: e.target.value })}
                      placeholder="e.g., ETH Buy on Dip"
                    />
                  </div>

                  <div>
                    <Label htmlFor="strategy-description">Description</Label>
                    <Input
                      id="strategy-description"
                      value={editingStrategy.description || ''}
                      onChange={(e) => setEditingStrategy({ ...editingStrategy, description: e.target.value })}
                      placeholder="Brief description of the strategy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="strategy-chain">Chain</Label>
                      <Select
                        value={editingStrategy.chain}
                        onValueChange={(value) => setEditingStrategy({ ...editingStrategy, chain: value })}
                      >
                        <SelectTrigger id="strategy-chain">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ethereum">Ethereum</SelectItem>
                          <SelectItem value="polygon">Polygon</SelectItem>
                          <SelectItem value="arbitrum">Arbitrum</SelectItem>
                          <SelectItem value="optimism">Optimism</SelectItem>
                          <SelectItem value="base">Base</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="strategy-side">Side</Label>
                      <Select
                        value={editingStrategy.side}
                        onValueChange={(value: 'BUY' | 'SELL') => setEditingStrategy({ ...editingStrategy, side: value })}
                      >
                        <SelectTrigger id="strategy-side">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">Buy</SelectItem>
                          <SelectItem value="SELL">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="strategy-amount">Amount (Quote Currency)</Label>
                    <Input
                      id="strategy-amount"
                      type="number"
                      value={editingStrategy.amountQc || 0}
                      onChange={(e) => setEditingStrategy({ ...editingStrategy, amountQc: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label>Min Edge (bps): {editingStrategy.minEdgeBps}</Label>
                    <Slider
                      value={[editingStrategy.minEdgeBps || 10]}
                      onValueChange={([value]) => setEditingStrategy({ ...editingStrategy, minEdgeBps: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>

                  <div>
                    <Label>Max Slippage (bps): {editingStrategy.maxSlippageBps}</Label>
                    <Slider
                      value={[editingStrategy.maxSlippageBps || 50]}
                      onValueChange={([value]) => setEditingStrategy({ ...editingStrategy, maxSlippageBps: value })}
                      min={0}
                      max={200}
                      step={5}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Trigger Conditions</h3>
                    <Button variant="outline" size="sm" onClick={addTrigger}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Trigger
                    </Button>
                  </div>

                  {editingStrategy.triggers?.map((trigger) => (
                    <Card key={trigger.id} className="mb-3">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-4 gap-3 items-end">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={trigger.type}
                              onValueChange={(value: TriggerCondition['type']) =>
                                updateTrigger(trigger.id, { type: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="price">Price</SelectItem>
                                <SelectItem value="edge">Edge</SelectItem>
                                <SelectItem value="volume">Volume</SelectItem>
                                <SelectItem value="time">Time</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Operator</Label>
                            <Select
                              value={trigger.operator}
                              onValueChange={(value: TriggerCondition['operator']) =>
                                updateTrigger(trigger.id, { operator: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="above">Above</SelectItem>
                                <SelectItem value="below">Below</SelectItem>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="between">Between</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={trigger.value}
                              onChange={(e) =>
                                updateTrigger(trigger.id, { value: parseFloat(e.target.value) })
                              }
                            />
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeTrigger(trigger.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {(!editingStrategy.triggers || editingStrategy.triggers.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                      <p>No triggers defined. Add at least one trigger to activate the strategy.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveStrategy}>Save Strategy</Button>
                  <Button variant="outline" onClick={() => setEditingStrategy(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Select a strategy to edit or create a new one
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backtest">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Backtesting</CardTitle>
              <CardDescription>
                Test your strategies against historical data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    {strategies.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={runBacktest} disabled={isBacktesting}>
                  {isBacktesting ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </div>

              {backtestResults.length > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          ${backtestResults[backtestResults.length - 1].portfolioValue.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Final Portfolio Value</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {backtestResults.reduce((sum, r) => sum + r.trades, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Trades</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className={`text-2xl font-bold ${backtestResults[backtestResults.length - 1].portfolioValue >= 10000 ? 'text-green-500' : 'text-red-500'}`}>
                          {((backtestResults[backtestResults.length - 1].portfolioValue - 10000) / 10000 * 100).toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Return</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={backtestResults}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="portfolioValue"
                          stroke="hsl(var(--primary))"
                          name="Portfolio Value"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
