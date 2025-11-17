import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, CheckCircle2 } from 'lucide-react';

export const AgentMemoryPanel = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [recentRes, insightsRes, decisionsRes] = await Promise.all([
        supabase
          .from('agent_memories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('agent_memories')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'insight')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('agent_memories')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'decision')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setMemories(recentRes.data || []);
      setInsights(insightsRes.data || []);
      setDecisions(decisionsRes.data || []);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col p-4">
      <Tabs defaultValue="insights" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4 shrink-0">
          <TabsTrigger value="insights" className="text-xs sm:text-sm px-2">Insights</TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs sm:text-sm px-2">Decisions</TabsTrigger>
          <TabsTrigger value="memory" className="text-xs sm:text-sm px-2">Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="flex-1 mt-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-3">
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No insights yet
                </p>
              ) : (
                insights.map((insight) => (
                  <Card key={insight.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{insight.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(insight.created_at).toLocaleString()}
                        </p>
                        {insight.metadata?.aggregate_link && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            DataQube Linked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="decisions" className="flex-1 mt-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No decisions yet
                </p>
              ) : (
                decisions.map((decision) => (
                  <Card key={decision.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{decision.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(decision.created_at).toLocaleString()}
                        </p>
                        {decision.metadata?.anchor_id && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            DVN Anchored
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="memory" className="flex-1 mt-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-3">
              {memories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No memories yet
                </p>
              ) : (
                memories.map((memory) => (
                  <Card key={memory.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {memory.type}
                          </Badge>
                        </div>
                        <p className="text-sm">{memory.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(memory.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
