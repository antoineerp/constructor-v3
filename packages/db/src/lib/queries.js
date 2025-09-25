import { supabase } from './client.js';

/**
 * Requêtes pour les prompts
 */
export const promptQueries = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  create: async (prompt) => {
    const { data, error } = await supabase
      .from('prompts')
      .insert(prompt)
      .select()
      .single();
    
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('prompts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id);
    
    return { error };
  }
};

/**
 * Requêtes pour les templates
 */
export const templateQueries = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  getByType: async (type) => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('type', type);
    
    return { data, error };
  },

  create: async (template) => {
    const { data, error } = await supabase
      .from('templates')
      .insert(template)
      .select()
      .single();
    
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }
};

/**
 * Requêtes pour les composants
 */
export const componentQueries = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .order('name');
    
    return { data, error };
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  getByType: async (type) => {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('type', type);
    
    return { data, error };
  },

  getByCategory: async (category) => {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('category', category);
    
    return { data, error };
  },

  create: async (component) => {
    const { data, error } = await supabase
      .from('components')
      .insert(component)
      .select()
      .single();
    
    return { data, error };
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('components')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }
};

/**
 * Requêtes pour les projets
 */
export const projectQueries = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    return { data, error };
  },

  getById: async (id, userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  },

  create: async (project) => {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    return { data, error };
  },

  update: async (id, updates, userId) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  delete: async (id, userId) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    return { error };
  }
};

/**
 * Statistiques pour le dashboard admin
 */
export const statsQueries = {
  getCounts: async () => {
    const [prompts, templates, components, projects] = await Promise.all([
      supabase.from('prompts').select('id', { count: 'exact' }),
      supabase.from('templates').select('id', { count: 'exact' }),
      supabase.from('components').select('id', { count: 'exact' }),
      supabase.from('projects').select('id', { count: 'exact' })
    ]);

    return {
      totalPrompts: prompts.count || 0,
      totalTemplates: templates.count || 0,
      totalComponents: components.count || 0,
      totalProjects: projects.count || 0
    };
  },

  getRecentProjects: async (limit = 10) => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  },

  getPopularPrompts: async (limit = 10) => {
    // Cette requête nécessiterait une table de tracking des usages
    // Pour l'instant, on retourne les prompts les plus récents
    const { data, error } = await supabase
      .from('prompts')
      .select('name, id')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  }
};