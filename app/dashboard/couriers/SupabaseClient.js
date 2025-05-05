import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qpkaklmbiwitlroykjim.supabase.co"; // Replace with your Supabase URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwa2FrbG1iaXdpdGxyb3lramltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MTM4NjIsImV4cCI6MjA1MjM4OTg2Mn0.4y_ogmlsnMMXCaISQeVo-oS6zDJnyAVEeAo6p7Ms97U"; // Replace with your Supabase API Key

// Export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'my-app-name'
    }
  },
  storage: {
    retryInterval: 500,
    maxRetries: 3
  }
});

// Add authentication state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user?.email);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});

// Add custom methods for storage operations
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteFile = async (bucket: string, path: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Database operations
export const createRecord = async (table: string, data: any) => {
  try {
    const { data: record, error } = await supabase
      .from(table)
      .insert([data])
      .select();

    if (error) throw error;
    return record;
  } catch (error) {
    console.error(`Error creating record in ${table}:`, error);
    throw error;
  }
};

export const updateRecord = async (table: string, id: string, data: any) => {
  try {
    const { data: record, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();

    if (error) throw error;
    return record;
  } catch (error) {
    console.error(`Error updating record in ${table}:`, error);
    throw error;
  }
};

export const deleteRecord = async (table: string, id: string) => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting record from ${table}:`, error);
    throw error;
  }
};

// Authentication helpers
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Export the supabase client and all helper functions
export {
  supabase,
  SUPABASE_URL,
  SUPABASE_KEY
};

// Types
export type Database = any; // Replace with your database types
export type Tables = any; // Replace with your table types

const handleFileUpload = async (file: File) => {
  try {
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log('Attempting upload with filename:', fileName);

    const { data, error: uploadError } = await supabase.storage
      .from('courier-profiles')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      toast.error(`Upload failed: ${uploadError.message}`);
      return null;
    }

    console.log('Upload successful:', data);

    const { data: { publicUrl } } = supabase.storage
      .from('courier-profiles')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in handleFileUpload:', error);
    toast.error('Failed to upload profile picture');
    return null;
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    let profilePictureUrl = '';
    
    // Handle file upload if a file is selected
    if (profilePicture) {
      const uploadedUrl = await handleFileUpload(profilePicture);
      if (!uploadedUrl) {
        setIsLoading(false);
        return;
      }
      profilePictureUrl = uploadedUrl;
    }

    // Insert courier data into the database
    const { data, error } = await supabase
      .from('couriers')
      .insert([
        {
          name: name,
          email: email,
          profile_picture: profilePictureUrl,
          client_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'active'
        }
      ]);

    if (error) throw error;

    toast.success('Courier added successfully');
    // Reset form and refresh data
    resetForm();
    fetchCouriers();
  } catch (error) {
    console.error('Error adding courier:', error);
    toast.error('Failed to add courier');
  } finally {
    setIsLoading(false);
  }
};

const deleteProfilePicture = async (filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from('courier-profiles')
      .remove([filePath]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};
