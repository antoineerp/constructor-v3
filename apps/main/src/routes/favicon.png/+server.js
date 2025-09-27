// Redirection favicon.png -> favicon.svg pour éviter 404 en mode blueprint
export function GET(){
  return new Response(null, { status:302, headers:{ Location: '/favicon.svg' } });
}
