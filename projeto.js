let tarefas = JSON.parse(localStorage.getItem("tarefas")) || [];
let filtroAtual = localStorage.getItem("filtro") || "todas";

// Elementos
const inputTarefa = document.getElementById("tarefa");
const selectPrioridade = document.getElementById("prioridade");
const inputHorario = document.getElementById("horarioTarefa");
const selectCategoria = document.getElementById("categoria");
const inputFavorita = document.getElementById("favorita");
const contador = document.getElementById("contador");
const lista = document.getElementById("lista");
const btnAdicionar = document.getElementById("btnAdicionar");
const relogio = document.getElementById("relogio");
const modalOverlay = document.getElementById("modal-overlay");

// Inicialização
btnAdicionar.addEventListener("click", adicionarTarefa);
atualizarLista();

// Adicionar tarefa
function adicionarTarefa() {
  let texto = inputTarefa.value.trim();
  let prioridade = parseInt(selectPrioridade.value);
  let horarioTarefa = inputHorario.value;
  let categoria = selectCategoria.value;
  let favorita = inputFavorita.checked;

  if (texto === "") {
    alert("Digite uma tarefa!");
    return;
  }

  if (tarefas.some(t => t.texto === texto)) {
    alert("Essa tarefa já existe!");
    return;
  }

  tarefas.push({
    texto,
    prioridade,
    categoria,
    favorita,
    concluida: false,
    horario: new Date().toLocaleTimeString(),
    horarioTarefa: horarioTarefa
  });

  salvarDados();

  inputTarefa.value = "";
  inputHorario.value = "";
  inputFavorita.checked = false;

  atualizarLista();
}

// Ordenar (favoritas primeiro, depois por prioridade)
function ordenarTarefas() {
  tarefas.sort((a, b) => {
    if (b.favorita !== a.favorita) return b.favorita - a.favorita;
    return a.prioridade - b.prioridade;
  });
}

// Atualizar lista
function atualizarLista() {
  lista.innerHTML = "";
  ordenarTarefas();

  tarefas.forEach((tarefa, i) => {

    if (filtroAtual !== "todas" && tarefa.prioridade != filtroAtual) return;

    let div = document.createElement("div");

    let classe =
      tarefa.prioridade === 1 ? "alta" :
      tarefa.prioridade === 2 ? "media" : "baixa";

    div.className = `card ${classe} ${tarefa.concluida ? "concluida" : ""}`;

    div.innerHTML = `
      <strong style="text-decoration: ${tarefa.concluida ? "line-through" : "none"}; font-size: 15px;">
        ${tarefa.texto}
      </strong><br><br>

      <strong>🕒 Adicionada:</strong> ${tarefa.horario}<br>
      <strong>⏰ Realizar:</strong> ${tarefa.horarioTarefa || "Sem horário"}<br>
      <strong>📂 Categoria:</strong> ${tarefa.categoria}<br>

      <div class="card-botoes">
        <button class="btn-favoritar ${tarefa.favorita ? 'favoritada' : ''}" onclick="toggleFavorita(${i})">
          ${tarefa.favorita ? "⭐ Favoritada" : "☆ Favoritar"}
        </button>
        <button onclick="toggleConcluida(${i})">
          ${tarefa.concluida ? "↩ Desfazer" : "✔ Concluir"}
        </button>
        <button onclick="editarTarefa(${i})">
          ✏ Editar
        </button>
        <button class="btn-remover" onclick="removerTarefa(${i})">
          🗑 Remover
        </button>
      </div>
    `;

    lista.appendChild(div);
  });

  mostrarContador();
}

// Favoritar direto no card
function toggleFavorita(i) {
  tarefas[i].favorita = !tarefas[i].favorita;
  salvarDados();
  atualizarLista();
}

// Concluir
function toggleConcluida(i) {
  tarefas[i].concluida = !tarefas[i].concluida;
  salvarDados();
  atualizarLista();
}

// Editar
function editarTarefa(i) {
  let novoTexto = prompt("Editar tarefa:", tarefas[i].texto);

  if (novoTexto && novoTexto.trim() !== "") {
    tarefas[i].texto = novoTexto.trim();
    salvarDados();
    atualizarLista();
  }
}

// Remover
function removerTarefa(i) {
  if (confirm("Deseja remover esta tarefa?")) {
    tarefas.splice(i, 1);
    salvarDados();
    atualizarLista();
  }
}

// Filtro
function filtrarTarefas(filtro) {
  filtroAtual = filtro;
  localStorage.setItem("filtro", filtro);
  atualizarLista();
}

// Abrir modal de confirmação
function apagarTudo() {
  if (tarefas.length === 0) {
    alert("Não há tarefas para apagar!");
    return;
  }
  modalOverlay.style.display = "flex";
}

// Confirmar apagar tudo
function confirmarApagarTudo() {
  tarefas = [];
  salvarDados();
  atualizarLista();
  fecharModal();
}

// Fechar modal
function fecharModal() {
  modalOverlay.style.display = "none";
}

// Fechar modal clicando fora
modalOverlay.addEventListener("click", function (e) {
  if (e.target === modalOverlay) fecharModal();
});

// Contador
function mostrarContador() {
  let total = tarefas.length;
  let concluidas = tarefas.filter(t => t.concluida).length;
  let favoritas = tarefas.filter(t => t.favorita).length;

  relogio.innerHTML = `🕒 ${new Date().toLocaleTimeString()}`;

  contador.innerHTML = `
    📊 Total: ${total}<br>
    ✔ Concluídas: ${concluidas}<br>
    ⭐ Favoritas: ${favoritas}
  `;
}

// Salvar
function salvarDados() {
  localStorage.setItem("tarefas", JSON.stringify(tarefas));
}

// Relógio
setInterval(mostrarContador, 1000);
