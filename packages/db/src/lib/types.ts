/**
 * Types TypeScript pour la base de données Supabase
 */

// Types pour les prompts
export interface Prompt {
  id: number;
  name: string;
  description?: string;
  template_id?: number;
  components: number[]; // IDs des composants associés
  created_at: string;
  updated_at?: string;
}

// Types pour les templates
export interface Template {
  id: number;
  name: string;
  type: 'e-commerce' | 'crm' | 'blog' | 'portfolio' | 'dashboard' | 'landing' | 'other';
  structure: TemplateStructure;
  created_at: string;
  updated_at?: string;
}

export interface TemplateStructure {
  routes: RouteStructure[];
  components: string[];
  stores: string[];
  styles: string[];
}

export interface RouteStructure {
  path: string;
  component: string;
  layout?: string;
  props?: Record<string, any>;
}

// Types pour les composants
export interface Component {
  id: number;
  name: string;
  type: 'header' | 'footer' | 'card' | 'form' | 'button' | 'navbar' | 'sidebar' | 'modal' | 'table' | 'chart' | 'other';
  category: 'ui' | 'layout' | 'form' | 'data' | 'navigation';
  code: string; // Code Svelte du composant
  props?: ComponentProp[];
  dependencies?: string[];
  created_at: string;
  updated_at?: string;
}

export interface ComponentProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description?: string;
}

// Types pour les projets utilisateurs
export interface Project {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  prompt_original: string;
  template_id?: number;
  components_used: number[];
  code_generated: ProjectCode;
  iterations: ProjectIteration[];
  status: 'draft' | 'completed' | 'deployed';
  created_at: string;
  updated_at?: string;
}

export interface ProjectCode {
  routes: Record<string, string>;
  components: Record<string, string>;
  stores: Record<string, string>;
  styles: Record<string, string>;
  config: Record<string, any>;
}

export interface ProjectIteration {
  id: number;
  project_id: number;
  iteration_number: number;
  prompt: string;
  code_changes: Record<string, string>;
  created_at: string;
}

// Types pour les utilisateurs
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at?: string;
}

// Types pour les sessions de chat
export interface ChatSession {
  id: number;
  project_id: number;
  messages: ChatMessage[];
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}