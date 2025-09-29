import { json } from '@sveltejs/kit';

// Petit pack embarqué de composants/templates Svelte open-source inspirés (simplifiés) pour tests IA offline.
// Source: créations synthétiques (pas de copie 1:1). L'utilisateur pourra étendre dynamiquement.
// GET /api/library/svelte-pack
export async function GET(){
  const files = {
    'components/ButtonPrimary.svelte': `<script>export let disabled=false; export let label='Primary';<\/script>\n<button class=\"px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition\" disabled={disabled}>{label}<\/button>` ,
    'components/Modal.svelte': `<script>export let open=false; export let title='Modal'; const close=()=>open=false;<\/script>\n{#if open}<div class=\"fixed inset-0 bg-black/40 flex items-center justify-center z-50\"><div class=\"bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4\">\n  <div class=\"flex items-center justify-between\"><h2 class=\"text-lg font-semibold\">{title}<\/h2><button on:click={close} class=\"text-gray-500 hover:text-gray-700\"><i class=\"fas fa-times\"><\/i><\/button></div>\n  <div class=\"text-sm text-gray-600\"><slot/><\/div>\n  <div class=\"flex justify-end gap-2 pt-2\"><button on:click={close} class=\"px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm\">Fermer<\/button><\/div>\n</div></div>{/if}`,
    'components/CardStat.svelte': `<script>export let label='Users'; export let value=0; export let icon='fa-user';<\/script>\n<div class=\"p-4 rounded-xl border bg-white flex items-center gap-4 shadow-sm\">\n  <div class=\"w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center\"><i class=\"fas {icon}\"><\/i><\/div>\n  <div><p class=\"text-xs text-gray-500\">{label}<\/p><p class=\"text-lg font-semibold\">{value}<\/p></div>\n</div>`,
    'routes/dashboard/+page.svelte': `<script>import CardStat from '../../components/CardStat.svelte'; let stats=[{label:'Users',value:128,icon:'fa-user'},{label:'Sales',value:54,icon:'fa-cart-shopping'},{label:'Errors',value:3,icon:'fa-triangle-exclamation'}];<\/script>\n<h1 class=\"text-2xl font-bold mb-6\">Dashboard<\/h1>\n<div class=\"grid grid-cols-1 md:grid-cols-3 gap-4\">{#each stats as s}<CardStat {...s}/>{/each}<\/div>`,
    'components/NavBar.svelte': `<script>export let items=[{href:'/',label:'Home'}]; export let current='/';<\/script>\n<nav class=\"flex gap-4 text-sm\">{#each items as it}<a href={it.href} class=\"px-2 py-1 rounded hover:bg-gray-100 {current===it.href?'text-indigo-600 font-semibold':''}\" aria-current={current===it.href?'page':undefined}>{it.label}<\/a>{/each}</nav>`
  };
  return json({ success:true, files, count: Object.keys(files).length });
}
