import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplets, TrendingUp, TrendingDown, Activity, DollarSign, Percent } from 'lucide-react';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';

interface LiquidityPool {
  chain: string;
  dex: string;
  pair: string;
  liquidity_usd: number;
  spread_bps: number;
  volume_24h: number;
  depth_1pct: number;
  depth_5pct: number;
  slippage_10k: number;
  slippage_100k: number;
  apy: number;
  lastUpdate: string;
}

export function LiquidityAnalytics() {
  const moneyPenny = useMoneyPenny();
  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiquidityData();
    const interval = setInterval(fetchLiquidityData, 30000);
    return () => clearInterval(interval);
  }, [selectedAsset]);

  const fetchLiquidityData = async () => {
    setLoading(true);
    try {
      // Simulate liquidity data - in production, this would call moneyPenny.aggregates or similar
      const mockPools: LiquidityPool[] = [
        {
          chain: 'ethereum',
          dex: 'Uniswap V3',
          pair: `${selectedAsset}/WETH`,
          liquidity_usd: 45_230_000,
          spread_bps: 5,
          volume_24h: 12_400_000,
          depth_1pct: 850_000,
          depth_5pct: 3_200_000,
          slippage_10k: 0.08,
          slippage_100k: 0.45,
          apy: 12.4,
          lastUpdate: new Date().toISOString(),
        },
        {
          chain: 'arbitrum',
          dex: 'Camelot',
          pair: `${selectedAsset}/WETH`,
          liquidity_usd: 8_920_000,
          spread_bps: 8,
          volume_24h: 2_100_000,
          depth_1pct: 180_000,
          depth_5pct: 720_000,
          slippage_10k: 0.12,
          slippage_100k: 0.85,
          apy: 18.2,
          lastUpdate: new Date().toISOString(),
        },
        {
          chain: 'base',
          dex: 'Aerodrome',
          pair: `${selectedAsset}/WETH`,
          liquidity_usd: 6_450_000,
          spread_bps: 10,
          volume_24h: 1_850_000,
          depth_1pct: 145_000,
          depth_5pct: 580_000,
          slippage_10k: 0.15,
          slippage_100k: 1.02,
          apy: 22.1,
          lastUpdate: new Date().toISOString(),
        },
        {
          chain: 'polygon',
          dex: 'Quickswap',
          pair: `${selectedAsset}/WMATIC`,
          liquidity_usd: 4_120_000,
          spread_bps: 12,
          volume_24h: 980_000,
          depth_1pct: 95_000,
          depth_5pct: 380_000,
          slippage_10k: 0.22,
          slippage_100k: 1.45,
          apy: 15.7,
          lastUpdate: new Date().toISOString(),
        },
        {
          chain: 'optimism',
          dex: 'Velodrome',
          pair: `${selectedAsset}/WETH`,
          liquidity_usd: 7_680_000,
          spread_bps: 7,
          volume_24h: 1_920_000,
          depth_1pct: 165_000,
          depth_5pct: 660_000,
          slippage_10k: 0.10,
          slippage_100k: 0.72,
          apy: 19.5,
          lastUpdate: new Date().toISOString(),
        },
      ];

      setPools(mockPools);
    } catch (error) {
      console.error('Error fetching liquidity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getSpreadColor = (bps: number) => {
    if (bps <= 5) return 'text-green-500';
    if (bps <= 10) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLiquidityScore = (liquidity: number) => {
    const maxLiquidity = Math.max(...pools.map(p => p.liquidity_usd));
    return (liquidity / maxLiquidity) * 100;
  };

  const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidity_usd, 0);
  const avgSpread = pools.length > 0 ? pools.reduce((sum, pool) => sum + pool.spread_bps, 0) / pools.length : 0;
  const bestPool = pools.reduce((best, pool) => 
    pool.liquidity_usd > best.liquidity_usd ? pool : best
  , pools[0] || {} as LiquidityPool);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Liquidity Analytics</h2>
          <p className="text-sm text-muted-foreground">Monitor liquidity depth and slippage across chains</p>
        </div>
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USDC">USDC</SelectItem>
            <SelectItem value="USDT">USDT</SelectItem>
            <SelectItem value="DAI">DAI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{formatCurrency(totalLiquidity)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across {pools.length} pools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Spread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{avgSpread.toFixed(1)} bps</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Weighted average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{bestPool.dex}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{bestPool.chain}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Details */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading liquidity data...</p>
            </CardContent>
          </Card>
        ) : (
          pools.map((pool) => (
            <Card key={`${pool.chain}-${pool.dex}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-foreground">{pool.dex}</span>
                      <Badge variant="outline" className="text-xs">
                        {pool.chain}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{pool.pair}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {pool.apy.toFixed(1)}% APY
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Liquidity Depth */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Liquidity Depth</span>
                    <span className="font-medium text-foreground">{formatCurrency(pool.liquidity_usd)}</span>
                  </div>
                  <Progress value={getLiquidityScore(pool.liquidity_usd)} className="h-2" />
                </div>

                {/* Spread */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Spread</span>
                  <span className={`text-sm font-medium ${getSpreadColor(pool.spread_bps)}`}>
                    {pool.spread_bps} bps
                  </span>
                </div>

                {/* Volume */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">24h Volume</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(pool.volume_24h)}</span>
                </div>

                {/* Depth at price levels */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">1% Depth</p>
                    <p className="text-sm font-medium text-foreground">{formatCurrency(pool.depth_1pct)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">5% Depth</p>
                    <p className="text-sm font-medium text-foreground">{formatCurrency(pool.depth_5pct)}</p>
                  </div>
                </div>

                {/* Slippage estimates */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Slippage ($10K)</p>
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{pool.slippage_10k.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Slippage ($100K)</p>
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{pool.slippage_100k.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
