// MODEL : données + règles métier. Ne connaît ni la vue ni le contrôleur.
export class TodoModel {
  #todos = [];
  #listeners = [];

  add(title) {
    const clean = title.trim();
    if (!clean) throw new Error('Le titre est obligatoire');
    if (clean.length > 60) throw new Error('60 caractères maximum');
    this.#todos.push({ id: crypto.randomUUID(), title: clean, done: false });
    this.#notify();
  }
  toggle(id) {
    const todo = this.#todos.find(t => t.id === id);
    if (todo) {
      todo.done = !todo.done;
      this.#notify();
    }
  }
  remove(id) {
    this.#todos = this.#todos.filter(t => t.id !== id);
    this.#notify();
  }
  all() {
    return this.#todos.map(t => ({ ...t }));
  } // copie défensive

  subscribe(fn) {
    this.#listeners.push(fn);
    fn(this.all());
  }
  #notify() {
    this.#listeners.forEach(fn => fn(this.all()));
  }
}
