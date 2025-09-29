import { describe, it, expect } from 'vitest';
// On importe directement la fonction compileRapid (utilise un Worker). Pour test headless rapide, on va mocker le Worker.

// Sauvegarde référence globale Worker si existante
const OriginalWorker: any = globalThis.Worker;

// Mock minimal qui renvoie message compilé (on ne fait pas appel à svelte/compiler ici pour éviter coût et dépendances worker dans vitest jsdom/node)
class MockWorker {
  onmessage: ((ev: MessageEvent)=>void) | null = null;
  postMessage(payload: any){
    const { id, code } = payload;
    // Simulation réponse structure { ok:true, js, css }
    setTimeout(()=>{
      this.onmessage && this.onmessage({ data: { id, ok:true, js: `export const Component={ render:()=>({ html: ${JSON.stringify(code.includes('<button') ? '<button>OK</button>' : '<div>X</div>')} }) };`, css:'' } } as any);
    }, 0);
  }
  terminate(){}
}

// Remplace Worker global
(globalThis as any).Worker = MockWorker as any;

import { compileRapid } from '../src/lib/compile/rapidCompiler';

describe('compileRapid (mocked Worker)', () => {
  it('retourne un objet ok avec js', async () => {
    const res: any = await compileRapid('<button>Test</button>', 'Test.svelte');
    expect(res.ok).toBe(true);
    expect(res.js).toContain('<button>OK</button>');
  });

  it('retour js contient structure Component', async () => {
    const res: any = await compileRapid('<div>X</div>', 'X.svelte');
    expect(res.js).toMatch(/Component/);
  });
});

// Restaure Worker original après tests
if (OriginalWorker) {
  (globalThis as any).Worker = OriginalWorker;
}
