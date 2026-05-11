
"use strict";

const Store = (() => {
  const STORAGE_KEY = "taskboard_v2";
  const FILTER_KEY  = "taskboard_filter_v2";
  const SORT_KEY    = "taskboard_sort_v2";
  const VIEW_KEY    = "taskboard_view_v2";

  let _tasks  = [];
  let _filter = "todas";
  let _sort   = "default";
  let _view   = "grid";   

  /** Carrega do localStorage com migração de versão */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _tasks  = raw ? JSON.parse(raw) : [];
      _filter = localStorage.getItem(FILTER_KEY) || "todas";
      _sort   = localStorage.getItem(SORT_KEY)   || "default";
      _view   = localStorage.getItem(VIEW_KEY)   || "grid";
    } catch (e) {
      console.warn("TaskBoard: falha ao carregar dados.", e);
      _tasks = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_tasks));
    localStorage.setItem(FILTER_KEY,  _filter);
    localStorage.setItem(SORT_KEY,    _sort);
    localStorage.setItem(VIEW_KEY,    _view);
  }

  /** Gera um ID único simples */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    load,
    save,
    uid,

    getTasks:  () => [..._tasks],
    getFilter: () => _filter,
    getSort:   () => _sort,
    getView:   () => _view,

    setFilter(f) { _filter = f; save(); },
    setSort(s)   { _sort   = s; save(); },
    setView(v)   { _view   = v; save(); },

    addTask(data) {
      const task = {
        id:          uid(),
        text:        data.text.trim(),
        priority:    data.priority,
        category:    data.category,
        favorite:    data.favorite,
        done:        false,
        image:       data.image || null,
        time:        data.time  || null,
        date:        data.date  || null,
        createdAt:   new Date().toISOString(),
        completedAt: null,
      };
      _tasks.unshift(task);
      save();
      return task;
    },

    updateTask(id, changes) {
      const idx = _tasks.findIndex(t => t.id === id);
      if (idx === -1) return false;
      _tasks[idx] = { ..._tasks[idx], ...changes };
      if (changes.done === true  && !_tasks[idx].completedAt) _tasks[idx].completedAt = new Date().toISOString();
      if (changes.done === false) _tasks[idx].completedAt = null;
      save();
      return _tasks[idx];
    },

    deleteTask(id) {
      _tasks = _tasks.filter(t => t.id !== id);
      save();
    },

    clearDone() {
      _tasks = _tasks.filter(t => !t.done);
      save();
    },

    clearAll() {
      _tasks = [];
      save();
    },

    isDuplicate(text) {
      return _tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
    },

    /** Retorna as tarefas filtradas + ordenadas (não muta o array original) */
    getVisible(searchQuery = "") {
      const filter = _filter;
      const sort   = _sort;
      const q      = searchQuery.toLowerCase().trim();

      let result = _tasks.filter(t => {
        if (filter === "favorites") return t.favorite;
        if (filter === "pending")   return !t.done;
        if (filter === "done")      return t.done;
        if (filter === "todas")     return true;
        return t.priority == filter; // "1","2","3"
      });

      if (q) {
        result = result.filter(t =>
          t.text.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }

      result.sort((a, b) => {
        switch (sort) {
          case "az":           return a.text.localeCompare(b.text);
          case "za":           return b.text.localeCompare(a.text);
          case "date_asc":     return new Date(a.createdAt) - new Date(b.createdAt);
          case "date_desc":    return new Date(b.createdAt) - new Date(a.createdAt);
          case "priority_asc": return a.priority - b.priority;
          default:
            
            if (b.favorite !== a.favorite) return b.favorite - a.favorite;
            return a.priority - b.priority;
        }
      });

      return result;
    },

    getStats() {
      return {
        total:     _tasks.length,
        done:      _tasks.filter(t => t.done).length,
        favorites: _tasks.filter(t => t.favorite).length,
      };
    },
  };
})();



function createImageManager({ areaEl, inputEl, previewEl, placeholderEl, clearBtnEl, onError }) {
  let current = null; // base64 string ou null

  inputEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Valida tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      if (onError) onError("Imagem muito grande. Máximo 5MB.");
      inputEl.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      current = ev.target.result;
      _show(current);
    };
    reader.readAsDataURL(file);
  });

  
  areaEl.addEventListener("dragover", (e) => { e.preventDefault(); areaEl.classList.add("drag-over"); });
  areaEl.addEventListener("dragleave", () => areaEl.classList.remove("drag-over"));
  areaEl.addEventListener("drop", (e) => {
    e.preventDefault();
    areaEl.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const synth = { target: { files: [file] } };
      inputEl.dispatchEvent(Object.assign(new Event("change"), { target: { files: [file] } }));
      
      if (file.size > 5 * 1024 * 1024) {
        if (onError) onError("Imagem muito grande. Máximo 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => { current = ev.target.result; _show(current); };
      reader.readAsDataURL(file);
    }
  });

  clearBtnEl.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); clear(); });

  function _show(src) {
    previewEl.src = src;
    previewEl.style.display = "block";
    placeholderEl.style.display = "none";
    areaEl.classList.add("has-image");
    clearBtnEl.hidden = false;
  }

  function set(src) {
    current = src;
    if (src) _show(src);
    else clear(false);
  }

  function clear(resetInput = true) {
    current = null;
    previewEl.src = "";
    previewEl.style.display = "none";
    placeholderEl.style.display = "flex";
    areaEl.classList.remove("has-image");
    clearBtnEl.hidden = true;
    if (resetInput) inputEl.value = "";
  }

  return {
    get value()  { return current; },
    set(src)     { set(src); },
    clear()      { clear(); },
  };
}



const Toast = (() => {
  const container = document.getElementById("toastContainer");

  function show(message, type = "info", duration = 3000) {
    const icons = { success: "✔", error: "✕", warn: "⚠", info: "ℹ" };
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span>${icons[type] || ""}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => toast.remove());
    }, duration);
  }

  return { show };
})();



const Modal = (() => {
  const _stack = [];

  function open(el) {
    el.hidden = false;
    el.removeAttribute("hidden");
    el.querySelector("button, input")?.focus();
    _stack.push(el);
    document.body.style.overflow = "hidden";
  }

  function close(el) {
    el.hidden = true;
    const idx = _stack.indexOf(el);
    if (idx !== -1) _stack.splice(idx, 1);
    if (_stack.length === 0) document.body.style.overflow = "";
  }

  // Fechar ao clicar no fundo
  document.addEventListener("click", (e) => {
    for (const modal of _stack) {
      if (e.target === modal) { close(modal); break; }
    }
  });

  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && _stack.length) close(_stack[_stack.length - 1]);
  });

  return { open, close };
})();



const Renderer = (() => {
  const listEl    = document.getElementById("taskList");
  const countBadge = document.getElementById("tasksCountBadge");
  const progFill  = document.getElementById("progressFill");
  const progLabel = document.getElementById("progressLabel");
  const statTotal = document.getElementById("stat-total");
  const statDone  = document.getElementById("stat-done");
  const statFav   = document.getElementById("stat-fav");

  const PRIORITY_LABELS = { 1: "🔴 Alta", 2: "🟡 Média", 3: "🟢 Baixa" };
  const PRIORITY_CLASS  = { 1: "alta",    2: "media",    3: "baixa" };
  const BADGE_CLASS     = { 1: "badge-alta", 2: "badge-media", 3: "badge-baixa" };

  function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  function buildCard(task, delay) {
    const card = document.createElement("article");
    card.className = `card ${PRIORITY_CLASS[task.priority]} ${task.done ? "is-done" : ""}`;
    card.dataset.id = task.id;
    card.setAttribute("role", "listitem");
    card.style.animationDelay = delay + "ms";

    card.innerHTML = `
      <div class="card-strip" aria-hidden="true"></div>
      ${task.image ? `<img class="card-image" src="${task.image}" alt="Imagem da tarefa: ${task.text}" loading="lazy">` : ""}
      <div class="card-body">
        <div class="card-top">
          <span class="card-title ${task.done ? "is-done-text" : ""}" title="${task.text}">${task.text}</span>
          ${task.favorite ? `<span class="card-fav-star" aria-label="Favorita" title="Favorita">⭐</span>` : ""}
        </div>
        <div class="card-meta">
          <div class="meta-row">
            <span class="meta-icon" aria-hidden="true">🕒</span>
            <span>Criada: ${new Date(task.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          ${task.time ? `
          <div class="meta-row">
            <span class="meta-icon" aria-hidden="true">⏰</span>
            <span>Realizar: ${task.time}${task.date ? " · " + task.date : ""}</span>
          </div>` : ""}
          ${task.done && task.completedAt ? `
          <div class="meta-row">
            <span class="meta-icon" aria-hidden="true">✔</span>
            <span>Concluída: ${formatDate(task.completedAt)}</span>
          </div>` : ""}
        </div>
        <div class="card-badges">
          <span class="badge ${BADGE_CLASS[task.priority]}">${PRIORITY_LABELS[task.priority]}</span>
          <span class="badge badge-cat">${task.category}</span>
          ${task.done ? `<span class="badge badge-done">Concluída</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button type="button" class="card-btn is-fav ${task.favorite ? "active" : ""}"
          data-action="fav" aria-label="${task.favorite ? "Remover favorita" : "Favoritar"}" aria-pressed="${task.favorite}">
          ${task.favorite ? "⭐ Favoritada" : "☆ Favoritar"}
        </button>
        <button type="button" class="card-btn is-done ${task.done ? "active" : ""}"
          data-action="done" aria-label="${task.done ? "Desfazer conclusão" : "Marcar como concluída"}" aria-pressed="${task.done}">
          ${task.done ? "↩ Desfazer" : "✔ Concluir"}
        </button>
        <button type="button" class="card-btn"
          data-action="edit" aria-label="Editar tarefa: ${task.text}">
          ✏ Editar
        </button>
        <button type="button" class="card-btn is-del"
          data-action="delete" aria-label="Remover tarefa: ${task.text}">
          🗑 Remover
        </button>
      </div>
    `;

    return card;
  }

  function renderList(tasks, view) {
    listEl.innerHTML = "";
    listEl.className = `task-list task-list--${view}`;

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" role="status">
          <div class="empty-icon" aria-hidden="true">📭</div>
          <p>Nenhuma tarefa encontrada.</p>
        </div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    tasks.forEach((task, i) => {
      frag.appendChild(buildCard(task, i * 35));
    });
    listEl.appendChild(frag);
  }

  function updateStats(stats, visible) {
    statTotal.textContent = stats.total;
    statDone.textContent  = stats.done;
    statFav.textContent   = stats.favorites;

    const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    progFill.style.width  = pct + "%";
    progLabel.textContent = pct + "% concluído";

    const n = visible.length;
    countBadge.textContent = n + (n === 1 ? " tarefa" : " tarefas");
  }

  return { renderList, updateStats };
})();


const Form = (() => {
  const titleInput = document.getElementById("taskTitle");
  const timeInput  = document.getElementById("taskTime");
  const dateInput  = document.getElementById("taskDate");
  const catSelect  = document.getElementById("taskCategory");
  const favCb      = document.getElementById("taskFavorite");
  const favLabel   = document.getElementById("favLabel");
  const charCounter = document.getElementById("titleHint");

  let priority = 1;

  // Contador de caracteres
  titleInput.addEventListener("input", () => {
    const len = titleInput.value.length;
    charCounter.textContent = `${len}/120`;
    charCounter.style.color = len > 100 ? "var(--yellow)" : "";
  });

  // Botões de prioridade
  document.querySelectorAll(".priority-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      priority = parseInt(btn.dataset.priority);
      document.querySelectorAll(".priority-btn").forEach(b => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
    });
  });

  // Label do favorito
  favCb.addEventListener("change", () => {
    favLabel.textContent = favCb.checked ? "Favoritada ⭐" : "Marcar como favorita";
  });

  // Imagem
  const imgManager = createImageManager({
    areaEl:      document.getElementById("imgUploadArea"),
    inputEl:     document.getElementById("imgInput"),
    previewEl:   document.getElementById("imgPreview"),
    placeholderEl: document.getElementById("imgPlaceholder"),
    clearBtnEl:  document.getElementById("imgClearBtn"),
    onError:     (msg) => {
      const errEl = document.getElementById("imgError");
      errEl.textContent = msg;
      errEl.hidden = false;
      setTimeout(() => { errEl.hidden = true; }, 4000);
    },
  });

  function getData() {
    return {
      text:     titleInput.value,
      priority,
      category: catSelect.value,
      favorite: favCb.checked,
      time:     timeInput.value || null,
      date:     dateInput.value || null,
      image:    imgManager.value,
    };
  }

  function reset() {
    titleInput.value = "";
    timeInput.value  = "";
    dateInput.value  = "";
    favCb.checked    = false;
    favLabel.textContent = "Marcar como favorita";
    charCounter.textContent = "0/120";
    charCounter.style.color = "";
    priority = 1;
    document.querySelectorAll(".priority-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.priority === "1");
      b.setAttribute("aria-pressed", b.dataset.priority === "1" ? "true" : "false");
    });
    imgManager.clear();
  }

  function shakeTitle() {
    titleInput.style.borderColor = "var(--red)";
    titleInput.style.animation   = "shake 0.3s ease";
    titleInput.focus();
    setTimeout(() => {
      titleInput.style.borderColor = "";
      titleInput.style.animation   = "";
    }, 600);
  }

  return { getData, reset, shakeTitle };
})();



const EditModal = (() => {
  const overlay    = document.getElementById("modalEdit");
  const titleInput = document.getElementById("editTitle");
  const timeInput  = document.getElementById("editTime");
  const dateInput  = document.getElementById("editDate");
  const catSelect  = document.getElementById("editCategory");
  const priSelect  = document.getElementById("editPriority");

  const imgManager = createImageManager({
    areaEl:      document.getElementById("editImgArea"),
    inputEl:     document.getElementById("editImgInput"),
    previewEl:   document.getElementById("editImgPreview"),
    placeholderEl: document.getElementById("editImgPlaceholder"),
    clearBtnEl:  document.getElementById("editImgClearBtn"),
  });

  let currentId = null;

  function open(task) {
    currentId = task.id;
    titleInput.value = task.text;
    timeInput.value  = task.time  || "";
    dateInput.value  = task.date  || "";
    catSelect.value  = task.category;
    priSelect.value  = task.priority;
    imgManager.set(task.image);
    Modal.open(overlay);
    titleInput.focus();
  }

  document.getElementById("modalEditCancel").addEventListener("click", () => Modal.close(overlay));
  document.getElementById("modalEditSave").addEventListener("click", save);

  titleInput.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });

  function save() {
    const text = titleInput.value.trim();
    if (!text) {
      titleInput.style.borderColor = "var(--red)";
      titleInput.style.animation   = "shake 0.3s ease";
      setTimeout(() => { titleInput.style.borderColor = ""; titleInput.style.animation = ""; }, 600);
      return;
    }

    Store.updateTask(currentId, {
      text,
      time:     timeInput.value || null,
      date:     dateInput.value || null,
      category: catSelect.value,
      priority: parseInt(priSelect.value),
      image:    imgManager.value,
    });

    Modal.close(overlay);
    App.render();
    Toast.show("Tarefa atualizada!", "success");
  }

  return { open };
})();



const Search = (() => {
  const input    = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  let _query     = "";
  let _timer     = null;

  input.addEventListener("input", () => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      _query = input.value.trim();
      clearBtn.hidden = !_query;
      App.render();
    }, 200);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    _query = "";
    clearBtn.hidden = true;
    App.render();
    input.focus();
  });

  return { get query() { return _query; } };
})();



const App = {
  init() {
    Store.load();
    this._bindUI();
    this._startClock();
    document.getElementById("footerYear").textContent = new Date().getFullYear();
    this.render();
  },

  render() {
    const visible = Store.getVisible(Search.query);
    const stats   = Store.getStats();
    Renderer.renderList(visible, Store.getView());
    Renderer.updateStats(stats, visible);
  },

  _bindUI() {
    // ── ADICIONAR TAREFA ──
    document.getElementById("btnAdd").addEventListener("click", () => this._addTask());
    document.getElementById("taskTitle").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this._addTask();
    });

   
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        Store.setFilter(btn.dataset.filter);
        this.render();
      });
    });

    // Marcar filtro ativo ao carregar
    const activeFilter = Store.getFilter();
    document.querySelectorAll(".filter-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.filter === activeFilter);
    });

    // ── ORDENAÇÃO ──
    const sortEl = document.getElementById("sortSelect");
    sortEl.value = Store.getSort();
    sortEl.addEventListener("change", () => {
      Store.setSort(sortEl.value);
      this.render();
    });

    
    const viewBtn  = document.getElementById("viewToggleBtn");
    const viewIcon = document.getElementById("viewToggleIcon");
    viewIcon.textContent = Store.getView() === "grid" ? "☰" : "⊞";

    viewBtn.addEventListener("click", () => {
      const next = Store.getView() === "grid" ? "list" : "grid";
      Store.setView(next);
      viewIcon.textContent = next === "grid" ? "☰" : "⊞";
      this.render();
    });

    
    document.getElementById("taskList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const card = btn.closest(".card");
      if (!card) return;
      const id = card.dataset.id;

      switch (btn.dataset.action) {
        case "fav":
          this._toggleFav(id);
          break;
        case "done":
          this._toggleDone(id);
          break;
        case "edit":
          this._openEdit(id);
          break;
        case "delete":
          this._deleteTask(id);
          break;
      }
    });

    // ── APAGAR TUDO ──
    const modalDeleteAll = document.getElementById("modalDeleteAll");
    document.getElementById("btnDeleteAll").addEventListener("click", () => {
      if (Store.getTasks().length === 0) { Toast.show("Não há tarefas para apagar.", "warn"); return; }
      Modal.open(modalDeleteAll);
    });
    document.getElementById("modalDeleteConfirm").addEventListener("click", () => {
      Store.clearAll();
      Modal.close(modalDeleteAll);
      this.render();
      Toast.show("Todas as tarefas foram removidas.", "info");
    });
    document.getElementById("modalDeleteCancel").addEventListener("click", () => Modal.close(modalDeleteAll));

    // ── LIMPAR CONCLUÍDAS ──
    const modalClearDone = document.getElementById("modalClearDone");
    document.getElementById("btnClearDone").addEventListener("click", () => {
      const hasDone = Store.getTasks().some(t => t.done);
      if (!hasDone) { Toast.show("Nenhuma tarefa concluída para remover.", "warn"); return; }
      Modal.open(modalClearDone);
    });
    document.getElementById("modalClearConfirm").addEventListener("click", () => {
      Store.clearDone();
      Modal.close(modalClearDone);
      this.render();
      Toast.show("Tarefas concluídas removidas.", "success");
    });
    document.getElementById("modalClearCancel").addEventListener("click", () => Modal.close(modalClearDone));
  },

  _addTask() {
    const data = Form.getData();
    if (!data.text) {
      Form.shakeTitle();
      Toast.show("Digite o título da tarefa.", "error");
      return;
    }
    if (Store.isDuplicate(data.text)) {
      Toast.show("Já existe uma tarefa com esse título.", "warn");
      return;
    }
    Store.addTask(data);
    Form.reset();
    this.render();
    Toast.show("Tarefa adicionada!", "success");
  },

  _toggleFav(id) {
    const task = Store.getTasks().find(t => t.id === id);
    if (!task) return;
    Store.updateTask(id, { favorite: !task.favorite });
    this.render();
  },

  _toggleDone(id) {
    const task = Store.getTasks().find(t => t.id === id);
    if (!task) return;
    Store.updateTask(id, { done: !task.done });
    this.render();
    Toast.show(task.done ? "Tarefa reaberta." : "Tarefa concluída! ✔", task.done ? "info" : "success");
  },

  _openEdit(id) {
    const task = Store.getTasks().find(t => t.id === id);
    if (task) EditModal.open(task);
  },

  _deleteTask(id) {
    const task = Store.getTasks().find(t => t.id === id);
    if (!task) return;

    
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast toast-warn";
    toast.innerHTML = `
      <span>🗑 Remover "<strong>${task.text.slice(0, 28)}${task.text.length > 28 ? "…" : ""}</strong>"?</span>
      <button type="button" id="toastConfirmDel" style="
        margin-left:8px;padding:4px 10px;background:var(--red);border:none;border-radius:6px;
        color:white;font-size:12px;cursor:pointer;white-space:nowrap;font-family:var(--font-body)">
        Confirmar
      </button>
    `;
    container.appendChild(toast);

    let removed = false;
    const cleanup = () => {
      if (!toast.parentNode) return;
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    };

    toast.querySelector("#toastConfirmDel").addEventListener("click", () => {
      removed = true;
      Store.deleteTask(id);
      this.render();
      cleanup();
      Toast.show("Tarefa removida.", "info");
    });

    setTimeout(() => { if (!removed) cleanup(); }, 5000);
  },

  _startClock() {
    const el = document.getElementById("clock");
    const tick = () => { el.textContent = new Date().toLocaleTimeString("pt-BR"); };
    tick();
    setInterval(tick, 1000);
  },
};


App.init();
