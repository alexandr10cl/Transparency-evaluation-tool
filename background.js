// Função para pegar a aba ativa e enviar as informações
function getActiveTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
          // Envia os dados da aba para o popup.js
          chrome.runtime.sendMessage({
              action: "setActiveTabInfo",
              url: tabs[0].url
          });
      }
  });
}

// Escuta a mensagem enviada pelo popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getActiveTabInfo") {
      getActiveTabInfo();
  }
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});