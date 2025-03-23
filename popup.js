let starttestdiv = document.querySelector(".main_page");
let finalpage = document.querySelector(".final_page");

// Variáveis globais
let data_collection = {
  "username" : "Admin",
  "seco_portal" : "default",
  "performed_tasks" : []
}
let tasks_data = [];   // Armazena as respostas para envio
let todo_tasks = [];   // Armazena as tasks recebidas em formato de objeto para serem feitas
let currentTaskIndex = -1; // Índice da task atual (-1 significa página incial e 0 significa primeira task e por ai vai)
let currentPhase = "initial"; // Pode ser "initial", "task", "review" ou "final", serve para configurara a exibição na tela
let currentTaskTimestamp = "Erro ao obter o timestamp"; // Armazena o timestamp da task atual

// Comunicação com o background.js para pegar a aba ativa
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "setActiveTabInfo") {
      data_collection.seco_portal = request.url;
  }
});


// Inicio da avaliação (passa para a primeira task)
document.getElementById("startTestButton").addEventListener("click", function () {
  starttestdiv.style.display = "none";
  currentTaskIndex = 0;
  currentPhase = "task";

  // Solicita a aba ativa para o background.js
  chrome.runtime.sendMessage({ action: "getActiveTabInfo" });
  
  data_collection.startTime = new Date().toISOString(); // Salva o timestamp inicial da avaliação

  updateDisplay();
});

// Recupera tasks do Flask e gera o HTML
document.addEventListener("DOMContentLoaded", function () {
  chrome.runtime.sendMessage({ action: "getActiveTabInfo" }); // Envia mensagem para o background.js para pegar a aba ativa

  fetch("http://127.0.0.1:5000/gettasks")
    .then(response => response.json())
    .then(tasks => {
      const container = document.querySelector("#taskscontainer"); // Puxa o container que guarda as tasks no html

      tasks.forEach(task => {
        // Cria um wrapper para cada task (contendo a parte de tarefa e a de review)
        const taskWrapper = document.createElement("div");

        // Gera o HTML das questões iterando por cada questao que tem relacionada a task
        let questionsHTML = "";
        task.questions.forEach((question, index) => {
          questionsHTML += `
            <div class="question">
              <label for="question-${task.id}-${index}">${question.text}</label>
              <input class="input" type="text" id="question-${task.id}-${index}" name="question-${task.id}-${index}">
            </div>
          `;
        });

        // Estrutura da task e da review
        taskWrapper.innerHTML = `
          <div class="task" id="task${task.id}">
            <h1>Task ${task.id}</h1>
            <h2 id="task${task.id}_title" style="display: none;">${task.description}</h2>
            <h2 id="task${task.id}_startmassage">Start the task when you're ready</h2>
            <button id="startTask${task.id}Button">Start Task</button>
            <button id="finishTask${task.id}Button" style="display: none;">Finish</button>
            <button class="couldntsolve" id="couldntSolveTask${task.id}Button" style="display: none;">Couldn't solve it?</button>
          </div>
          <div class="task_review" id="task${task.id}_review">
            <h1>Task ${task.id} Review</h1>
            <h2>${task.description}</h2>
            <div class="task-questions">
              ${questionsHTML}
            </div>
            <button id="task${task.id}ReviewButton">Next</button>
          </div>
        `;

        container.appendChild(taskWrapper); // Colocar a task criada no container
        // Armazena o objeto da task para ser realizada
        todo_tasks.push(task);

        // Adiciona eventos aos botões da task para passar para a fase de review
        document.getElementById(`finishTask${task.id}Button`).addEventListener("click", () => {
          currentPhase = "review";
          updateDisplay();
        });
        document.getElementById(`couldntSolveTask${task.id}Button`).addEventListener("click", () => {
          currentPhase = "review";
          updateDisplay();
        });

        // Evento para iniciar a task e guardar o timestamp inicial
        document.getElementById(`startTask${task.id}Button`).addEventListener("click", () => {
          document.getElementById(`task${task.id}_startmassage`).style.display = "none";
          document.getElementById(`startTask${task.id}Button`).style.display = "none";
          document.getElementById(`finishTask${task.id}Button`).style.display = "block";
          document.getElementById(`couldntSolveTask${task.id}Button`).style.display = "block";
          document.getElementById(`task${task.id}_title`).style.display = "block";
          currentTaskTimestamp = new Date().toISOString(); // Salvar na global o timestamp inicial da task atual
        });

        // Evento do botão Next na review
        document.getElementById(`task${task.id}ReviewButton`).addEventListener("click", () => {
          // Coleta as respostas
          const inputs = document.querySelectorAll(`#task${task.id}_review .task-questions input`);
          const answers = [];
          inputs.forEach((input, index) => {
            answers.push({
              question: task.questions[index].text,
              answer: input.value
            });
          });
          // Criar o objeto com os dados da task e adiciona no array
          tasks_data.push({
            id: task.id,
            title: task.title,
            description: task.description,
            initial_timestamp : currentTaskTimestamp,
            final_timestamp : new Date().toISOString(),
            answers: answers
          });
          // Avança para a próxima task ou para a página final se não houver mais tasks
          currentTaskIndex++;
          if (currentTaskIndex < todo_tasks.length) {
            currentPhase = "task";
          } else {
            currentPhase = "final";
          }
          updateDisplay();
        });
      });
      // Atualiza a exibição após gerar as tasks
      updateDisplay();
    })
    .catch(error => {
      const container = document.querySelector("#taskscontainer");
      container.innerHTML = "<h1>Servidor fora do ar</h1> <p>Erro ao carregar tarefas</p>";
      console.error("Erro ao carregar as tasks:", error)
    });
});

// Função que atualiza a exibição com base na fase e na task atual
function updateDisplay() {
  // Esconde tudo
  starttestdiv.style.display = "none";
  finalpage.style.display = "none";
  document.querySelectorAll(".task").forEach(div => div.style.display = "none");
  document.querySelectorAll(".task_review").forEach(div => div.style.display = "none");

  if (currentPhase === "initial") {
    starttestdiv.style.display = "block";
  } else if (currentPhase === "task") {
    // Exibe a parte da tarefa da task atual
    const taskId = todo_tasks[currentTaskIndex].id;
    document.getElementById("task" + taskId).style.display = "block";
  } else if (currentPhase === "review") {
    // Exibe a parte de review da task atual
    const taskId = todo_tasks[currentTaskIndex].id;
    document.getElementById("task" + taskId + "_review").style.display = "block";
  } else if (currentPhase === "final") {
    finalpage.style.display = "block";
  }
}


// Botão para finalizar a avaliação e enviar os dados para o Flask
document.getElementById("finishevaluationbtn").addEventListener("click", function () {
    // Enviando os dados para o backend Flask
    data_collection.endTime = new Date().toISOString(); // Salva o timestamp final da avaliação

    data_collection.performed_tasks = tasks_data;

    fetch("http://127.0.0.1:5000/submit_tasks", {
        method: "POST",
        headers: {
            "Content-Type": "application/json" // informar ao flask que o dado que esta sendo enviado é um json
        },
        body: JSON.stringify(data_collection)
    })
    .then(response => response.json()) // converte a resposta recebida pela api em um json
    .then(data => { // Agora com os dados convertidos, exibe na tela que foi enviado com sucesso
        console.log("Resposta do servidor:", data);
        alert("Dados enviados com sucesso");
    })
    .catch(error => { //tratamento de erro
        console.error("Erro ao enviar os dados:", error);
    });
});