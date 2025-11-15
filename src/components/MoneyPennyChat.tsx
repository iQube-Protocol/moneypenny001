import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { Send, Loader2, Brain, BarChart3, Target, Zap, UserCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOverlayManager } from '@/hooks/use-overlay-manager';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const MoneyPennyChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  const { openOverlay, activeOverlay } = useOverlayManager();

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: UserCircle },
    { id: 'metavatar' as const, label: 'MetaVatar', icon: Brain },
    { id: 'portfolio' as const, label: 'Portfolio', icon: BarChart3 },
    { id: 'intent-capture' as const, label: 'Intent', icon: Target },
    { id: 'research' as const, label: 'Research', icon: Search },
    { id: 'live-insights' as const, label: 'Insights', icon: Zap },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    <div className="relative flex h-[600px]">
      {/* Vertical Folder Tabs */}
      <div className="flex flex-col gap-2 py-4 pr-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => openOverlay(tab.id)}
            className={cn(
              "relative group flex items-center justify-center w-12 h-20 rounded-r-lg transition-all duration-300",
              "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:opacity-0 before:transition-opacity",
              "hover:bg-card/60 hover:before:opacity-100",
              activeOverlay === tab.id && "bg-card border-l-2 border-primary before:opacity-100"
            )}
            title={tab.label}
          >
            <div className="flex flex-col items-center gap-1">
              <tab.icon className={cn(
                "h-5 w-5 transition-colors",
                activeOverlay === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                "[writing-mode:vertical-lr] [text-orientation:mixed]",
                activeOverlay === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {tab.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Chat Card */}
      <Card className="flex flex-col flex-1">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Aigent MoneyPenny
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
    </div>
  );
};
