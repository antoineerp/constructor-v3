import { json } from '@sveltejs/kit';

// GET /api/projects/:id/preview
// ⚠️ ENDPOINT DEPRECATED - SSR dangereux pour code généré par IA
// Redirection vers compilation client-side sécurisée comme Bolt.new/Lovable
export async function GET(event){
  const { params } = event;
  const projectId = params.id;
  
  if(!projectId) return json({ success:false, error:'projectId manquant' }, { status:400 });
  
  // � SSR DÉFINITIVEMENT DÉSACTIVÉ - Approche Bolt.new recommandée
  return json({ 
    success: false, 
    error: 'SSR preview deprecated for security reasons',
    migration: {
      reason: 'AI-generated code should never execute on server (like Bolt.new)',
      alternative: 'Use /api/projects/:id/compile for client-side iframe sandbox',
      security: 'Client-side execution prevents server compromise',
      examples: ['Bolt.new uses client-side only', 'Lovable.dev uses iframe sandbox', 'v0.dev compiles to client']
    },
    recommended_approach: {
      step1: 'Call /api/projects/:id/compile to get runtimeHtml', 
      step2: 'Display runtimeHtml in iframe with sandbox="allow-scripts"',
      step3: 'Code executes safely in user browser, not on server'
    }
  }, { status: 410 }); // 410 Gone = endpoint permanently removed
}
