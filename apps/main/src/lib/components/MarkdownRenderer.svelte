<script>
  export let source = '';
  // Parser markdown minimal sans dépendances externes (whitelist de base)
  function render(md){
    if(!md) return '';
    return md
      .replace(/^### (.*)$/gm,'<h3>$1</h3>')
      .replace(/^## (.*)$/gm,'<h2>$1</h2>')
      .replace(/^# (.*)$/gm,'<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/`([^`]+)`/g,'<code class="px-1 bg-gray-100 rounded text-xs">$1</code>')
      .replace(/\n\n/g,'<br/><br/>' );
  }
  $: html = render(source||'');
</script>
<div class="prose prose-sm max-w-none" >{@html html}</div>
