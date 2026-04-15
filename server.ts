import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client for backend operations
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Middleware to verify user token
const authenticate = async (req: any, res: any, next: any) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};

// --- EDGE FUNCTIONS EQUIVALENTS ---

// 1. save-scan
app.post('/api/save-scan', authenticate, async (req: any, res: any) => {
  try {
    const { result, imageBase64 } = req.body;
    const userId = req.user.id;

    let imageUrl = '';

    // Upload image to Supabase Storage if base64 provided
    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${userId}/${Date.now()}.jpg`;

      // Ensure bucket exists
      const { data: buckets } = await supabase!.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'scans');
      
      if (!bucketExists) {
        const { error: createBucketError } = await supabase!.storage.createBucket('scans', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        if (createBucketError) {
          console.error("Failed to create bucket:", createBucketError);
        }
      }

      const { data: uploadData, error: uploadError } = await supabase!.storage
        .from('scans')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase!.storage.from('scans').getPublicUrl(fileName);
      imageUrl = publicUrl;
    }

    // Save to database
    const { data, error } = await supabase!
      .from('scans')
      .insert([
        { user_id: userId, result, image_url: imageUrl }
      ])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error saving scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. get-history
app.get('/api/get-history', authenticate, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase!
      .from('scans')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. save-chat
app.post('/api/save-chat', authenticate, async (req: any, res: any) => {
  try {
    const { role, content } = req.body;
    const { data, error } = await supabase!
      .from('chats')
      .insert([{ user_id: req.user.id, role, content }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-chats', authenticate, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase!
      .from('chats')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. save-goals
app.post('/api/save-goals', authenticate, async (req: any, res: any) => {
  try {
    const goals = req.body;
    const { data, error } = await supabase!
      .from('goals')
      .upsert({ 
        user_id: req.user.id, 
        ...goals,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-goals', authenticate, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase!
      .from('goals')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
    res.json(data || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- VITE INTEGRATION ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
