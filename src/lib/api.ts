import { supabase } from './supabase';

export const api = {
  saveScan: async (result: any, imageBase64: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let imageUrl = '';

    if (imageBase64 && imageBase64.startsWith('data:image')) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      // Convert base64 to Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // Ensure bucket exists (optional, usually done in dashboard)
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'scans');
      
      if (!bucketExists) {
        await supabase.storage.createBucket('scans', {
          public: true,
          fileSizeLimit: 10485760,
        });
      }

      const { error: uploadError } = await supabase.storage
        .from('scans')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('scans').getPublicUrl(fileName);
      imageUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from('scans')
      .insert([{ user_id: user.id, result, image_url: imageUrl }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getHistory: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  saveChat: async (role: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .insert([{ user_id: user.id, role, content }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getChats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  saveGoals: async (goals: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('goals')
      .upsert({ 
        user_id: user.id, 
        ...goals,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getGoals: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },
};
