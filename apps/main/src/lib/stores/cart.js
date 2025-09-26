import { writable, derived } from 'svelte/store';

function createCart(){
  const { subscribe, update } = writable({ items: [] });
  function add(product){
    update(state => {
      const existing = state.items.find(i => i.id === product.id);
      if (existing) existing.qty += 1; else state.items.push({ ...product, qty:1 });
      return { ...state };
    });
  }
  function remove(id){ update(s => ({ ...s, items: s.items.filter(i => i.id !== id) })); }
  function increment(id){ update(s => { const it = s.items.find(i=>i.id===id); if (it) it.qty++; return { ...s };}); }
  function decrement(id){ update(s => { const it = s.items.find(i=>i.id===id); if (it && it.qty>1) it.qty--; else if(it) s.items = s.items.filter(i=>i.id!==id); return { ...s };}); }
  function clear(){ update(()=>({ items: [] })); }
  const total = derived({ subscribe }, $s => $s.items.reduce((t,i)=> t + i.price * i.qty, 0));
  return { subscribe, add, remove, increment, decrement, clear, total, get items(){ let v; const unsub = subscribe(s=>v=s); unsub(); return v.items; } };
}

export const cart = createCart();