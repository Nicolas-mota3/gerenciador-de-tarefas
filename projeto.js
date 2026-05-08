let tarefas = JSON.parse(localStorage.getItem("tarefas")) || [];
let filtroAtual = localStorage.getItem("filtro") || "todas";

// ── Elementos do DOM ──────────────────────────
const el = {
  tarefa:       document.getElementById("tarefa"),
  prioridade:   document.getElementById("prioridade"),
  horario:      document.getElementById("horarioTarefa"),
  data:         document.getElementById("dataTarefa"),
  descricao:    document.getElementById("descricao"),
  categoria:    document.getElementById("categoria"),
  favorita:     document.getElementById("favorita"),
  contador:     document.getElementById("contador"),
  lista:        document.getElementById("lista"),
  btnAdicionar: document.getElementById("btnAdicionar"),
  relogio:      document.getElementById("relogio"),
  modal:        document.getElementById("modal-overlay")
};
// ─────────────────────────────────────────────

// Inicialização
el.btnAdicionar.addEventListener("click", adicionarTarefa);
pedirPermissaoNotificacao();
atualizarLista();

// Pedir permissão para notificações
function pedirPermissaoNotificacao() {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

// Verificar tarefas no horário
function verificarNotificacoes() {
  if (Notification.permission !== "granted") return;

  const agora = new Date();
  const horaAtual = agora.getHours().toString().padStart(2, "0") +
                    ":" +
                    agora.getMinutes().toString().padStart(2, "0");
  const dataAtual = agora.toISOString().split("T")[0];

  tarefas.forEach(tarefa => {
    const horarioOk = tarefa.horarioTarefa === horaAtual;
    const dataOk = !tarefa.dataTarefa || tarefa.dataTarefa === dataAtual;

    if (horarioOk && dataOk && !tarefa.concluida && !tarefa.notificada) {
      new Notification("⏰ Hora de realizar sua tarefa!", {
        body: `📌 ${tarefa.texto}\n📂 ${tarefa.categoria}${tarefa.descricao ? "\n📝 " + tarefa.descricao : ""}`,
        icon: "https://cdn-icons-png.flaticon.com/512/1827/1827504.png"
      });
      tarefa.notificada = true;
      salvarDados();
    }
  });
}

// Adicionar tarefa
function adicionarTarefa() {
  let texto      = el.tarefa.value.trim();
  let prioridade = parseInt(el.prioridade.value);
  let horarioTarefa = el.horario.value;
  let dataTarefa = el.data.value;
  let descricao  = el.descricao.value.trim();
  let categoria  = el.categoria.value;
  let favorita   = el.favorita.checked;

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
    descricao,
    concluida: false,
    notificada: false,
    horario: new Date().toLocaleTimeString(),
    horarioTarefa: horarioTarefa,
    dataTarefa: dataTarefa
  });

  salvarDados();

  el.tarefa.value      = "";
  el.horario.value     = "";
  el.data.value        = "";
  el.descricao.value   = "";
  el.favorita.checked  = false;

  atualizarLista();
}

// Ordenar (favoritas primeiro, depois por prioridade)
function ordenarTarefas() {
  tarefas.sort((a, b) => {
    if (b.favorita !== a.favorita) return b.favorita - a.favorita;
    return a.prioridade - b.prioridade;
  });
}

// Formatar data para exibição
function formatarData(data) {
  if (!data) return "Sem data";
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const [ano, mes, dia] = data.split("-");
  const dataObj = new Date(ano, mes - 1, dia);

  const nomeDia = dias[dataObj.getDay()];
  const nomeMes = meses[dataObj.getMonth()];

  return `${nomeDia}, ${dia} de ${nomeMes} de ${ano}`;
}


// Atualizar lista
function atualizarLista() {
  el.lista.innerHTML = "";
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

      ${tarefa.descricao ? `<em style="color:#aaa; font-size:13px;">📝 ${tarefa.descricao}</em><br><br>` : ""}

      <strong>🕒 Adicionada:</strong> ${tarefa.horario}<br>
      <strong>📅 Data:</strong> ${formatarData(tarefa.dataTarefa)}<br>
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

    el.lista.appendChild(div);
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
  el.modal.style.display = "flex";
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
  el.modal.style.display = "none";
}

// Fechar modal clicando fora
el.modal.addEventListener("click", function (e) {
  if (e.target === el.modal) fecharModal();
});

// Contador
function mostrarContador() {
  let total      = tarefas.length;
  let concluidas = tarefas.filter(t => t.concluida).length;
  let favoritas  = tarefas.filter(t => t.favorita).length;

  el.relogio.innerHTML = `🕒 ${new Date().toLocaleTimeString()}`;

  el.contador.innerHTML = `
    📊 Total: ${total}<br>
    ✔ Concluídas: ${concluidas}<br>
    ⭐ Favoritas: ${favoritas}
  `;
}

// Salvar
function salvarDados() {
  localStorage.setItem("tarefas", JSON.stringify(tarefas));
}

// Relógio e verificação de notificações
setInterval(mostrarContador, 1000);
setInterval(verificarNotificacoes, 60000);
