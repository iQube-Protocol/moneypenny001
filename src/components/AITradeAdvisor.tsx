import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Recommendation {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
}

export function AITradeAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-trade-advisor", {
        body: { messages: [...messages, userMessage] },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("AI advisor error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getQuickAnalysis = async (type: string) => {
    setIsLoading(true);
    const prompts: Record<string, string> = {
      market: "Analyze current cross-chain market conditions and provide a brief overview of opportunities.",
      risk: "Assess the current risk level in my trading positions and provide recommendations.",
      strategy: "Suggest an optimal trading strategy based on current market conditions.",
    };

    const userMessage: Message = { role: "user", content: prompts[type] };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-trade-advisor", {
        body: { messages: [...messages, userMessage] },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("AI advisor error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Trade Advisor
            </CardTitle>
            <CardDescription>
              Get intelligent trading recommendations powered by AI
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => getQuickAnalysis("market")}
            disabled={isLoading}
          >
            <Info className="h-4 w-4 mr-1" />
            Market Analysis
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => getQuickAnalysis("risk")}
            disabled={isLoading}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Risk Assessment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => getQuickAnalysis("strategy")}
            disabled={isLoading}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Strategy Suggestion
          </Button>
        </div>

        {/* Chat Messages */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-muted/20">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Ask me anything about trading strategies, market analysis, or risk management.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-secondary mr-8"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
          {isLoading && (
            <div className="bg-secondary p-3 rounded-lg mr-8">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">Analyzing...</div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask for trading advice, market analysis, or strategy recommendations..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="min-h-[80px]"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
