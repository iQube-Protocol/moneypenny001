import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { Send, Loader2, Brain, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const MoneyPennyChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMemories = async () => {
    try {
      const [recentMemories, insightsList, decisionsList] = await Promise.all([
        moneyPenny.memories.getRecent(20),
        moneyPenny.memories.getByType('insight', 10),
        moneyPenny.memories.getByType('decision', 10),
      ]);
      
      setMemories(recentMemories);
      setInsights(insightsList);
      setDecisions(decisionsList);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moneypenny-chat`;
    
    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage }
    ];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: chatMessages,
          scope: moneyPenny.getScope() 
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        if (resp.status === 402) {
          toast({
            title: "Credits required",
            description: "Please add funds to your workspace.",
            variant: "destructive",
          });
          return;
        }
        throw new Error('Failed to start stream');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      // Add assistant message placeholder
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: new Date() 
      }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === 'assistant') {
                  lastMsg.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Store conversation as memory
      if (assistantContent) {
        await moneyPenny.memories.append('trade', `User: ${userMessage}\nMoneyPenny: ${assistantContent}`, {
          source: 'chat',
          timestamp: new Date().toISOString(),
        });
        
        // Check if response contains insights or decisions
        if (assistantContent.toLowerCase().includes('insight') || 
            assistantContent.toLowerCase().includes('recommend')) {
          await moneyPenny.memories.appendInsight(
            assistantContent,
            'chat',
          );
          loadMemories(); // Refresh memories
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    try {
      await streamChat(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 flex flex-col h-[600px]">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            MoneyPenny Agent
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered trading assistant with cross-chain capabilities
          </p>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Start a conversation with MoneyPenny</p>
                <p className="text-xs mt-2">Ask about trades, market insights, or DeFi strategies</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask MoneyPenny about trades, quotes, or strategies..."
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="h-[600px] flex flex-col">
        <Tabs defaultValue="insights" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="flex-1 px-4 pb-4">
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

          <TabsContent value="decisions" className="flex-1 px-4 pb-4">
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

          <TabsContent value="memory" className="flex-1 px-4 pb-4">
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
    </div>
  );
};
