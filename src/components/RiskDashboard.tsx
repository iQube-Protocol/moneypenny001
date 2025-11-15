import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Activity,
  Bell,
  Plus,
  Settings,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface RiskLimit {
  id: string;
  chain: string;
  maxPosition: number;
  currentPosition: number;
  maxDrawdown: number;
  currentDrawdown: number;
  enabled: boolean;
}

interface RiskRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  action: 'alert' | 'pause' | 'liquidate';
  enabled: boolean;
  triggered: boolean;
}

interface ExposureMetric {
  chain: string;
  exposure: number;
  percentage: number;
  pnl: number;
  trades: number;
}

const CHAINS = ['eth', 'arb', 'base', 'op', 'poly', 'btc', 'sol'];

export const RiskDashboard = () => {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  
  const [limits, setLimits] = useState<RiskLimit[]>([]);
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [exposure, setExposure] = useState<ExposureMetric[]>([]);
  const [totalExposure, setTotalExposure] = useState(0);
  const [maxDrawdown, setMaxDrawdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [isAddLimitOpen, setIsAddLimitOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newLimit, setNewLimit] = useState({
    chain: '',
    maxPosition: 10000,
    maxDrawdown: 20,
  });
  const [newRule, setNewRule] = useState({
    name: '',
    condition: 'drawdown',
    threshold: 15,
    action: 'alert' as const,
  });

  useEffect(() => {
    loadRiskData();
    // Set up polling for real-time updates
    const interval = setInterval(loadRiskData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRiskData = async () => {
    setIsLoading(true);
    try {
      // Fetch execution history to calculate metrics
      const stats = await moneyPenny.execution.getStats();
      const history = await moneyPenny.execution.listIntents();
      const executions = await moneyPenny.execution.listExecutions(100);
      
      // Calculate exposure by chain
      const exposureByChain = new Map<string, { exposure: number; pnl: number; trades: number }>();
      let total = 0;
      let worstDrawdown = 0;
      
      executions.forEach((exec: any) => {
        const chain = exec.chain;
        const amount = exec.qty_filled || 0;
        const capture = exec.capture_bps || 0;
        const existing = exposureByChain.get(chain) || { exposure: 0, pnl: 0, trades: 0 };
        
        exposureByChain.set(chain, {
          exposure: existing.exposure + amount,
          pnl: existing.pnl + capture,
          trades: existing.trades + 1,
        });
        
        total += amount;
        
        // Track worst capture (drawdown)
        if (capture < worstDrawdown) {
          worstDrawdown = capture;
        }
      });
      
      // Convert to array with percentages
      const exposureMetrics: ExposureMetric[] = Array.from(exposureByChain.entries()).map(
        ([chain, data]) => ({
          chain,
          exposure: data.exposure,
          percentage: total > 0 ? (data.exposure / total) * 100 : 0,
          pnl: data.pnl,
          trades: data.trades,
        })
      );
      
      setExposure(exposureMetrics);
      setTotalExposure(total);
      
      // Set max drawdown
      const currentDrawdown = Math.abs(worstDrawdown);
      setMaxDrawdown(currentDrawdown);
      
      // Initialize limits if empty
      if (limits.length === 0) {
        const initialLimits: RiskLimit[] = CHAINS.map(chain => {
          const chainData = exposureByChain.get(chain) || { exposure: 0, pnl: 0, trades: 0 };
          return {
            id: chain,
            chain,
            maxPosition: 10000,
            currentPosition: chainData.exposure,
            maxDrawdown: 20,
            currentDrawdown: Math.abs(chainData.pnl),
            enabled: true,
          };
        });
        setLimits(initialLimits);
      } else {
        // Update current positions
        setLimits(prev => prev.map(limit => {
          const chainData = exposureByChain.get(limit.chain) || { exposure: 0, pnl: 0, trades: 0 };
          return {
            ...limit,
            currentPosition: chainData.exposure,
            currentDrawdown: Math.abs(chainData.pnl),
          };
        }));
      }
      
      // Check rules and trigger alerts
      checkRiskRules();
    } catch (error) {
      console.error('Failed to load risk data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkRiskRules = () => {
    rules.forEach(rule => {
      if (!rule.enabled) return;
      
      let triggered = false;
      
      if (rule.condition === 'drawdown' && maxDrawdown > rule.threshold) {
        triggered = true;
      } else if (rule.condition === 'exposure' && totalExposure > rule.threshold) {
        triggered = true;
      }
      
      if (triggered && !rule.triggered) {
        toast({
          title: "Risk Rule Triggered",
          description: `${rule.name}: ${rule.condition} exceeded ${rule.threshold}`,
          variant: "destructive",
        });
        
        // Update rule state
        setRules(prev => prev.map(r => 
          r.id === rule.id ? { ...r, triggered: true } : r
        ));
      }
    });
  };

  const handleAddLimit = () => {
    if (!newLimit.chain) {
      toast({
        title: "Missing chain",
        description: "Please select a chain",
        variant: "destructive",
      });
      return;
    }
    
    const limit: RiskLimit = {
      id: `limit-${Date.now()}`,
      chain: newLimit.chain,
      maxPosition: newLimit.maxPosition,
      currentPosition: 0,
      maxDrawdown: newLimit.maxDrawdown,
      currentDrawdown: 0,
      enabled: true,
    };
    
    setLimits(prev => [...prev, limit]);
    setNewLimit({ chain: '', maxPosition: 10000, maxDrawdown: 20 });
    setIsAddLimitOpen(false);
    
    toast({
      title: "Limit added",
      description: `Position limit set for ${newLimit.chain.toUpperCase()}`,
    });
  };

  const handleAddRule = () => {
    if (!newRule.name) {
      toast({
        title: "Missing name",
        description: "Please enter a rule name",
        variant: "destructive",
      });
      return;
    }
    
    const rule: RiskRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      condition: newRule.condition,
      threshold: newRule.threshold,
      action: newRule.action,
      enabled: true,
      triggered: false,
    };
    
    setRules(prev => [...prev, rule]);
    setNewRule({ name: '', condition: 'drawdown', threshold: 15, action: 'alert' });
    setIsAddRuleOpen(false);
    
    toast({
      title: "Rule added",
      description: `Risk rule "${newRule.name}" created`,
    });
  };

  const toggleLimit = (id: string) => {
    setLimits(prev => prev.map(limit =>
      limit.id === id ? { ...limit, enabled: !limit.enabled } : limit
    ));
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled, triggered: false } : rule
    ));
  };

  const getStatusColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Risk Controls
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor limits, exposure, and automated risk management
          </p>
        </div>
        
        <Button onClick={loadRiskData} disabled={isLoading} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Exposure</p>
              <p className="text-2xl font-bold mt-1">
                ${totalExposure.toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Max Drawdown</p>
              <p className="text-2xl font-bold mt-1">
                {maxDrawdown.toFixed(2)}%
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Rules</p>
              <p className="text-2xl font-bold mt-1">
                {rules.filter(r => r.enabled).length}
              </p>
            </div>
            <Bell className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="limits" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="limits">Position Limits</TabsTrigger>
          <TabsTrigger value="exposure">Exposure</TabsTrigger>
          <TabsTrigger value="rules">Risk Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="limits" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddLimitOpen} onOpenChange={setIsAddLimitOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Limit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Position Limit</DialogTitle>
                  <DialogDescription>
                    Set maximum position and drawdown for a chain
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Chain</Label>
                    <Select value={newLimit.chain} onValueChange={(value) => setNewLimit(prev => ({ ...prev, chain: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chain" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHAINS.map(chain => (
                          <SelectItem key={chain} value={chain}>
                            {chain.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Position ($)</Label>
                    <Input
                      type="number"
                      value={newLimit.maxPosition}
                      onChange={(e) => setNewLimit(prev => ({ ...prev, maxPosition: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Drawdown (%)</Label>
                    <Input
                      type="number"
                      value={newLimit.maxDrawdown}
                      onChange={(e) => setNewLimit(prev => ({ ...prev, maxDrawdown: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddLimitOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLimit}>Add Limit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {limits.map(limit => (
              <Card key={limit.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{limit.chain.toUpperCase()}</Badge>
                    <Switch
                      checked={limit.enabled}
                      onCheckedChange={() => toggleLimit(limit.id)}
                    />
                  </div>
                  <Badge variant={getStatusColor(limit.currentPosition, limit.maxPosition)}>
                    {((limit.currentPosition / limit.maxPosition) * 100).toFixed(1)}%
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Position</span>
                      <span>
                        ${limit.currentPosition.toLocaleString()} / ${limit.maxPosition.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={(limit.currentPosition / limit.maxPosition) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Drawdown</span>
                      <span>
                        {limit.currentDrawdown.toFixed(2)}% / {limit.maxDrawdown}%
                      </span>
                    </div>
                    <Progress 
                      value={(limit.currentDrawdown / limit.maxDrawdown) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exposure" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Exposure by Chain</h3>
            <div className="space-y-4">
              {exposure.map(metric => (
                <div key={metric.chain} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{metric.chain.toUpperCase()}</Badge>
                      <span className="text-muted-foreground">
                        {metric.trades} trades
                      </span>
                    </span>
                    <span className="font-medium">
                      ${metric.exposure.toLocaleString()} ({metric.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={metric.percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>P&L: {metric.pnl > 0 ? '+' : ''}{metric.pnl.toFixed(2)} bps</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Risk Rule</DialogTitle>
                  <DialogDescription>
                    Create automated risk management rules
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input
                      placeholder="e.g., Max Drawdown Alert"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={newRule.condition} onValueChange={(value) => setNewRule(prev => ({ ...prev, condition: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drawdown">Max Drawdown</SelectItem>
                        <SelectItem value="exposure">Total Exposure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select value={newRule.action} onValueChange={(value: any) => setNewRule(prev => ({ ...prev, action: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alert">Alert Only</SelectItem>
                        <SelectItem value="pause">Pause Trading</SelectItem>
                        <SelectItem value="liquidate">Auto Liquidate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddRule}>Add Rule</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {rules.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No risk rules configured</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddRuleOpen(true)}
                >
                  Create your first rule
                </Button>
              </Card>
            ) : (
              rules.map(rule => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{rule.name}</h4>
                        {rule.triggered ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Triggered
                          </Badge>
                        ) : rule.enabled ? (
                          <Badge variant="secondary">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <XCircle className="w-3 h-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.condition} exceeds {rule.threshold}
                        {rule.condition === 'drawdown' ? '%' : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {rule.action}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
