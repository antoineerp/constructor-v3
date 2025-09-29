<script>export let article={ title:'Article', slug:'article', excerpt:'Extrait...', image:'' };</script>
<article class="group relative flex flex-col bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
  <div class="aspect-video bg-gray-100 overflow-hidden">
    <img src={article.image || 'https://picsum.photos/400/225'} alt={article.title} class="w-full h-full object-cover group-hover:scale-105 transition"/>
  </div>
  <div class="p-4 flex flex-col gap-2">
    <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2">{article.title}</h3>
    <p class="text-xs text-gray-500 uppercase tracking-wide">{article.category || 'Moto'}</p>
    <p class="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>
    <a href={'/articles/' + article.slug} class="mt-auto inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:underline">Lire <i class="fas fa-arrow-right text-xs"></i></a>
  </div>
</article>
