import * as LzString from "lz-string";

const app = window.comfyAPI.app.app;
const $el = window.comfyAPI.ui.$el;
const url = `${new URL(window.location.href).origin}/comfyui`;

function isApiJson(data) {
  return Object.values(data).every((v) => v.class_type);
}

function getWorkflowFromHash() {
  try {
    const code = window.location.hash.split("#wf/")?.[1];
    if (code) {
      return JSON.parse(LzString.decompressFromEncodedURIComponent(code));
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function loadWorkflow(workflow) {
  if (isApiJson(workflow)) {
    app.loadApiJson(workflow, "workflow.json");
    return;
  }
  const clientId = sessionStorage.getItem("clientId");
  if (clientId) {
    sessionStorage.setItem(`workflow:${clientId}`, JSON.stringify(workflow));
  } else {
    localStorage.setItem("workflow", JSON.stringify(workflow));
  }

  app.loadGraphData(workflow);
}

async function exportWorkflow() {
  const { workflow } = await app.graphToPrompt();
  if (!workflow) return;
  const hash = LzString.compressToEncodedURIComponent(JSON.stringify(workflow));

  const Toast = app.extensionManager.toast;
  Toast.add({
    severity: "info",
    summary: "🚀 Share url!",
    detail: "Url copied to clipboard",
  });

  copyToClipboard(`${url}?#wf/${hash}`);
}

const extension = {
  init: async () => {},
  name: `playground.view`,
  setup: async () => {
    app.menu?.settingsGroup.append(
      $el(
        "button",
        {
          title: "Share",
          classList: "comfyui-button",
          onclick: exportWorkflow,
          icon: "share",
        },
        [$el("i", { classList: "pi pi-share-alt" })],
      ),
    );
    const workflow = getWorkflowFromHash();
    if (workflow) {
      loadWorkflow(workflow);
    }
  },
};

app.registerExtension(extension);

const copyToClipboard = async (text) => {
  let result = false;
  if (!text) return;
  if (!navigator.clipboard) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      result = true;
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
    fnc?.();
    return result;
  }

  result = await navigator.clipboard
    .writeText(text)
    .then(() => {
      return true;
    })
    .catch((error) => {
      console.error("Async: Could not copy text: ", error);
      return false;
    });

  fnc?.();
  return result;
};
