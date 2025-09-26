// Redirection de l'ancienne page d'accueil vers /user
import { redirect } from '@sveltejs/kit';

export function load() {
  throw redirect(307, '/user');
}
