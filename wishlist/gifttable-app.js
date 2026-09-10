const CONFIG_KEY = "gifttable_cloud_config_v1";
const PEOPLE = ["Hawa", "Reia"];
const CATEGORIES = ["<$10", "<$40", "$40+"];

const configForm = document.getElementById("config-form");
const apiUrlInput = document.getElementById("api-url-input");
const apiKeyInput = document.getElementById("api-key-input");
const groupIdInput = document.getElementById("group-id-input");
const clearConfigBtn = document.getElementById("clear-config-btn");
const refreshItemsBtn = document.getElementById("refresh-items-btn");
const configNote = document.getElementById("config-note");

const form = document.getElementById("wish-form");
const personSelect = document.getElementById("person-select");
const priceSelect = document.getElementById("price-select");
const itemInput = document.getElementById("item-input");
const linkInput = document.getElementById("link-input");
const listRoot = document.getElementById("list-root");
const saveNote = document.getElementById("save-note");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = {
  add: document.getElementById("tab-add"),
  view: document.getElementById("tab-view"),
};

let currentItems = [];

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.apiUrl || !parsed.apiKey || !parsed.sharedGroupId) return null;
    return {
      apiUrl: String(parsed.apiUrl).replace(/\/+$/, ""),
      apiKey: String(parsed.apiKey),
      sharedGroupId: Number(parsed.sharedGroupId),
    };
  } catch (err) {
    return null;
  }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function getHeaders(config) {
  return {
    apikey: config.apiKey,
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
}

async function fetchItemsFromCloud() {
  const config = loadConfig();
  if (!config) return [];

  const url =
    `${config.apiUrl}/rest/v1/wishlist_items` +
    `?shared_group_id=eq.${encodeURIComponent(config.sharedGroupId)}` +
    "&select=id,list_owner,price_category,item_text,item_link,created_at,shared_group_id" +
    "&order=created_at.desc";

  const res = await fetch(url, { headers: getHeaders(config) });
  if (!res.ok) {
    throw new Error("Could not fetch cloud data.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function addItemToCloud(item) {
  const config = loadConfig();
  if (!config) throw new Error("Cloud sync not configured.");

  const url = `${config.apiUrl}/rest/v1/wishlist_items`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...getHeaders(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify([item]),
  });

  if (!res.ok) {
    throw new Error("Could not save item to cloud.");
  }
}

async function deleteItemFromCloud(id) {
  const config = loadConfig();
  if (!config) throw new Error("Cloud sync not configured.");

  const url = `${config.apiUrl}/rest/v1/wishlist_items?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(config),
  });

  if (!res.ok) {
    throw new Error("Could not delete item.");
  }
}

function normalizeOptionalUrl(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch (error) {
    return null;
  }
}

function renderLists(items = currentItems) {
  listRoot.innerHTML = "";

  PEOPLE.forEach((person) => {
    const personSection = document.createElement("section");
    personSection.className = "person-group";
    personSection.innerHTML = `<h3>${person}'s Items</h3>`;

    CATEGORIES.forEach((category) => {
      const categoryWrap = document.createElement("div");
      categoryWrap.className = "category";
      categoryWrap.innerHTML = `<h4>${category}</h4>`;

      const list = document.createElement("ul");
      const filtered = items.filter(
        (item) => item.list_owner === person && item.price_category === category
      );

      if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No items yet.";
        categoryWrap.appendChild(empty);
      } else {
        filtered.forEach((item) => {
          const li = document.createElement("li");
          const row = document.createElement("div");
          row.className = "item-row";

          const text = document.createElement("span");
          text.textContent = item.item_text;
          row.appendChild(text);

          if (item.item_link) {
            const link = document.createElement("a");
            link.href = item.item_link;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "item-link";
            link.textContent = "Open link";
            row.appendChild(link);
          }

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "delete-btn";
          removeBtn.textContent = "Delete";
          removeBtn.addEventListener("click", () => removeItem(item.id));

          row.appendChild(removeBtn);
          li.appendChild(row);
          list.appendChild(li);
        });
      }

      if (filtered.length > 0) categoryWrap.appendChild(list);
      personSection.appendChild(categoryWrap);
    });

    listRoot.appendChild(personSection);
  });
}

function updateUiForConfig() {
  const config = loadConfig();
  const ready = Boolean(config);
  form.querySelectorAll("input, select, button").forEach((el) => {
    if (el.id !== "refresh-items-btn") el.disabled = !ready;
  });
  refreshItemsBtn.disabled = !ready;
  if (ready) {
    saveNote.textContent = `Cloud sync ready (Group ${config.sharedGroupId}).`;
  } else {
    saveNote.textContent = "Cloud sync is not configured yet.";
  }
}

async function removeItem(id) {
  try {
    await deleteItemFromCloud(id);
    saveNote.textContent = "Item deleted.";
    await loadAndRenderCloudItems();
  } catch (error) {
    saveNote.textContent = "Delete failed. Check cloud settings/policies.";
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const config = loadConfig();
  if (!config) {
    saveNote.textContent = "Please save cloud settings first.";
    return;
  }

  const person = personSelect.value;
  const category = priceSelect.value;
  const name = itemInput.value.trim();
  const itemLink = normalizeOptionalUrl(linkInput.value);
  if (!name) return;
  if (linkInput.value.trim() && !itemLink) {
    saveNote.textContent = "Link format is invalid. Use a full URL or domain.";
    return;
  }

  try {
    await addItemToCloud({
      list_owner: person,
      price_category: category,
      item_text: name,
      item_link: itemLink,
      shared_group_id: config.sharedGroupId,
    });
    form.reset();
    personSelect.value = person;
    priceSelect.value = category;
    saveNote.textContent = "Saved to cloud.";
    await loadAndRenderCloudItems();
  } catch (error) {
    saveNote.textContent = "Save failed. Check cloud settings/policies.";
  }
}

async function loadAndRenderCloudItems() {
  const config = loadConfig();
  if (!config) {
    currentItems = [];
    renderLists();
    return;
  }

  try {
    currentItems = await fetchItemsFromCloud();
    renderLists(currentItems);
  } catch (error) {
    saveNote.textContent = "Could not load cloud items.";
  }
}

function fillConfigInputs() {
  const config = loadConfig();
  if (!config) return;
  apiUrlInput.value = config.apiUrl;
  apiKeyInput.value = config.apiKey;
  groupIdInput.value = String(config.sharedGroupId);
}

async function handleConfigSubmit(event) {
  event.preventDefault();

  const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "");
  const apiKey = apiKeyInput.value.trim();
  const sharedGroupId = Number(groupIdInput.value);

  if (!apiUrl || !apiKey || !Number.isInteger(sharedGroupId) || sharedGroupId < 1) {
    configNote.textContent = "Enter valid URL, anon key, and numeric group ID.";
    return;
  }

  saveConfig({ apiUrl, apiKey, sharedGroupId });
  configNote.textContent = "Cloud settings saved on this phone.";
  updateUiForConfig();
  await loadAndRenderCloudItems();
}

async function handleRefreshClick() {
  saveNote.textContent = "Refreshing from cloud...";
  await loadAndRenderCloudItems();
  if (loadConfig()) {
    saveNote.textContent = "Cloud items refreshed.";
  }
}

function handleClearConfig() {
  localStorage.removeItem(CONFIG_KEY);
  configForm.reset();
  configNote.textContent = "Cloud settings cleared from this phone.";
  updateUiForConfig();
  currentItems = [];
  renderLists();
}

function switchTab(target) {
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === target));
  Object.entries(tabPanels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === target);
  });
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

configForm.addEventListener("submit", handleConfigSubmit);
clearConfigBtn.addEventListener("click", handleClearConfig);
refreshItemsBtn.addEventListener("click", handleRefreshClick);
form.addEventListener("submit", handleSubmit);
fillConfigInputs();
updateUiForConfig();
loadAndRenderCloudItems();
