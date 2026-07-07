export function renderNotFound() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="not-found">
      <h1>Página no encontrada</h1>
      <p>Lo sentimos, pero esa ruta aún no existe en IsoCore.</p>
    </div>
  `;
}
