import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const pathname = url.pathname.replace('/memories', '');

    // GET /recent - Get recent memories
    if (req.method === 'GET' && pathname === '/recent') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      const { data, error } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /by-type - Get memories by type
    if (req.method === 'GET' && pathname === '/by-type') {
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (!type) {
        throw new Error('Type parameter is required');
      }

      const { data, error } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /search - Search memories
    if (req.method === 'POST' && pathname === '/search') {
      const { query, limit = 5 } = await req.json();

      // Simple text search (could be enhanced with full-text search or embeddings)
      const { data, error } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', user.id)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Return with relevance scores (simplified - all 1.0 for now)
      return new Response(
        JSON.stringify({
          memories: data || [],
          relevance_scores: (data || []).map(() => 1.0),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /append - Add new memory
    if (req.method === 'POST' && pathname === '/append') {
      const { type, content, metadata } = await req.json();

      if (!type || !content) {
        throw new Error('Type and content are required');
      }

      const { data, error } = await supabase
        .from('agent_memories')
        .insert({
          user_id: user.id,
          type,
          content,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /prefs - Get memory preferences
    if (req.method === 'GET' && pathname === '/prefs') {
      // Return default preferences (could be stored in a separate table)
      return new Response(
        JSON.stringify({
          doc_level_excerpts: false,
          auto_insights: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /prefs - Update preferences
    if (req.method === 'POST' && pathname === '/prefs') {
      // For now, just acknowledge the update
      // Could store in a user_preferences table
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /:id - Delete memory
    if (req.method === 'DELETE' && pathname.startsWith('/')) {
      const memoryId = pathname.substring(1);

      const { error } = await supabase
        .from('agent_memories')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /clear - Clear memories by type
    if (req.method === 'POST' && pathname === '/clear') {
      const { type } = await req.json();

      const { data, error } = await supabase
        .from('agent_memories')
        .delete()
        .eq('user_id', user.id)
        .eq('type', type)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({ deleted_count: data?.length || 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /export - Export memories
    if (req.method === 'POST' && pathname === '/export') {
      // For now, just return the data as JSON
      // Could implement actual file export with expiring URLs
      const { data, error } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = JSON.stringify(data, null, 2);
      const expires_at = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      return new Response(
        JSON.stringify({
          export_url: `data:application/json;base64,${btoa(exportData)}`,
          expires_at,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in memories function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
