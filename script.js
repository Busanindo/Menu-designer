// Menu Designer PWA with Touch Drag
const state = {
  meta: {
    name: "Restaurant",
    tagline: "Tagline",
    accent: "#d32f2f",
    font: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    theme: "classic",
    columns: 2,
    currency: "$",
    dotLeaders: true,
    showPhotos: true,
    photoSize: 88,
    logoDataUrl: ""
  },
  sections: [
    { id: id(), name: "Starters", items: [] },
    { id: id(), name: "Mains", items: [] },
  ]
};

// Helpers
function id(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

// Elements
const restaurantName = $("#restaurantName");
const tagline = $("#tagline");
const nameOut = $("#nameOut");
const tagOut = $("#tagOut");
const logoInput = $("#logoInput");
const logo = $("#logo");
const accentColor = $("#accentColor");
const fontSelect = $("#fontSelect");
const themeSelect = $("#themeSelect");
const columnsSelect = $("#columnsSelect");
const currencySymbol = $("#currencySymbol");
const dotLeaders = $("#dotLeaders");
const showPhotos = $("#showPhotos");
const photoSize = $("#photoSize");
const printBtn = $("#printBtn");
const installBtn = $("#installBtn");

const sectionsList = $("#sectionsList");
const newSectionName = $("#newSectionName");
const addSectionBtn = $("#addSectionBtn");
const itemSection = $("#itemSection");
const itemName = $("#itemName");
const itemPrice = $("#itemPrice");
const itemDesc = $("#itemDesc");
const itemImage = $("#itemImage");
const addItemBtn = $("#addItemBtn");
const clearItemBtn = $("#clearItemBtn");

const saveBtn = $("#saveBtn");
const loadBtn = $("#loadBtn");
const exportJsonBtn = $("#exportJsonBtn");
const importJsonInput = $("#importJsonInput");
const resetBtn = $("#resetBtn");

const sectionsPreview = $("#sectionsPreview");
const menuCanvas = $("#menuCanvas");
const preview = $("#preview");

// PWA: install prompt
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installBtn.hidden = true;
  deferredPrompt = null;
});

// Init UI
function init(){
  const saved = localStorage.getItem("menu-designer:v3-pwa");
  if(saved){
    try { Object.assign(state, JSON.parse(saved)); }
    catch(e){ console.warn("Saved state corrupt, starting fresh."); }
  }
  renderMeta();
  refreshSectionsUI();
  refreshSectionSelect();
  renderMenu();
}
init();

// Meta bindings
restaurantName.addEventListener("input", e=>{ state.meta.name = e.target.value || "Restaurant"; renderMeta(); save(); });
tagline.addEventListener("input", e=>{ state.meta.tagline = e.target.value; renderMeta(); save(); });
accentColor.addEventListener("input", e=>{ state.meta.accent = e.target.value; applyStyles(); save(); });
fontSelect.addEventListener("change", e=>{ state.meta.font = e.target.value; applyStyles(); save(); });
themeSelect.addEventListener("change", e=>{ state.meta.theme = e.target.value; applyStyles(); save(); });
columnsSelect.addEventListener("change", e=>{ state.meta.columns = Number(e.target.value); applyStyles(); save(); });
currencySymbol.addEventListener("input", e=>{ state.meta.currency = e.target.value || "$"; renderMenu(); save(); });
dotLeaders.addEventListener("change", e=>{ state.meta.dotLeaders = e.target.checked; renderMenu(); save(); });
showPhotos.addEventListener("change", e=>{ state.meta.showPhotos = e.target.checked; renderMenu(); save(); });
photoSize.addEventListener("input", e=>{ state.meta.photoSize = Number(e.target.value); applyStyles(); save(); });

logoInput.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{ state.meta.logoDataUrl = reader.result; renderMeta(); save(); };
  reader.readAsDataURL(file);
});

printBtn.addEventListener("click", ()=>window.print());

// Sections
addSectionBtn.addEventListener("click", ()=>{
  const name = newSectionName.value.trim(); if(!name) return;
  state.sections.push({ id: id(), name, items: [] });
  newSectionName.value = "";
  refreshSectionsUI(); refreshSectionSelect(); renderMenu(); save();
});

function refreshSectionsUI(){
  sectionsList.innerHTML = "";
  state.sections.forEach((s)=>{
    const chip = document.createElement("div");
    chip.className = "section-chip";
    chip.innerHTML = `<span>${escapeHtml(s.name)}</span>
      <div class="actions">
        <button data-act="up">↑</button>
        <button data-act="down">↓</button>
        <button data-act="rename">Rename</button>
        <button data-act="delete" class="danger">Delete</button>
      </div>`;
    chip.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const act = btn.dataset.act;
        const i = state.sections.findIndex(x=>x.id===s.id);
        if(act==="up" && i>0) [state.sections[i-1], state.sections[i]] = [state.sections[i], state.sections[i-1]];
        if(act==="down" && i<state.sections.length-1) [state.sections[i+1], state.sections[i]] = [state.sections[i], state.sections[i+1]];
        if(act==="rename"){ const nn = prompt("Section name", s.name); if(nn) s.name = nn; }
        if(act==="delete"){ if(confirm("Delete section and its items?")) state.sections.splice(i,1); }
        refreshSectionsUI(); refreshSectionSelect(); renderMenu(); save();
      });
    });
    sectionsList.appendChild(chip);
  });
}

function refreshSectionSelect(){
  itemSection.innerHTML = "";
  state.sections.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    itemSection.appendChild(opt);
  });
}

// Items
let pendingImageDataUrl = "";
itemImage.addEventListener("change", e=>{
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{ pendingImageDataUrl = reader.result; };
  reader.readAsDataURL(file);
});

addItemBtn.addEventListener("click", ()=>{
  const secId = itemSection.value;
  const sec = state.sections.find(s=>s.id===secId);
  if(!sec) return;
  const name = itemName.value.trim();
  const price = itemPrice.value.trim();
  const desc = itemDesc.value.trim();
  if(!name) return;
  sec.items.push({ id: id(), name, price, desc, photo: pendingImageDataUrl || "" });
  itemName.value = ""; itemPrice.value = ""; itemDesc.value = ""; itemImage.value = ""; pendingImageDataUrl = "";
  renderMenu(); save();
});

clearItemBtn.addEventListener("click", ()=>{
  itemName.value = ""; itemPrice.value = ""; itemDesc.value = ""; itemImage.value = ""; pendingImageDataUrl = "";
});

// Save/Load/Export/Import
function save(){ localStorage.setItem("menu-designer:v3-pwa", JSON.stringify(state)); }
saveBtn.addEventListener("click", save);
loadBtn.addEventListener("click", ()=>{
  const saved = localStorage.getItem("menu-designer:v3-pwa");
  if(saved){
    Object.assign(state, JSON.parse(saved));
    renderMeta(); refreshSectionsUI(); refreshSectionSelect(); renderMenu(); applyStyles();
  } else {
    alert("No saved data found.");
  }
});
exportJsonBtn.addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "menu-data-with-photos.json";
  a.click();
});
importJsonInput.addEventListener("change", e=>{
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      const obj = JSON.parse(reader.result);
      Object.assign(state, obj);
      renderMeta(); refreshSectionsUI(); refreshSectionSelect(); renderMenu(); applyStyles(); save();
    } catch(err){ alert("Invalid JSON file."); }
  };
  reader.readAsText(file);
});
resetBtn.addEventListener("click", ()=>{
  if(!confirm("Reset everything?")) return;
  localStorage.removeItem("menu-designer:v3-pwa");
  window.location.reload();
});

// Rendering
function renderMeta(){
  restaurantName.value = state.meta.name;
  tagline.value = state.meta.tagline;
  nameOut.textContent = state.meta.name || "Restaurant";
  tagOut.textContent = state.meta.tagline || "";
  tagOut.style.display = state.meta.tagline ? "block" : "none";
  if(state.meta.logoDataUrl){ logo.src = state.meta.logoDataUrl; logo.classList.add("has-logo"); }
  else { logo.removeAttribute("src"); logo.classList.remove("has-logo"); }
  applyStyles();
}

function applyStyles(){
  menuCanvas.style.setProperty("--accent", state.meta.accent);
  menuCanvas.style.fontFamily = state.meta.font;
  sectionsPreview.classList.remove("grid-1","grid-2","grid-3");
  sectionsPreview.classList.add(`grid-${state.meta.columns}`);
  document.body.classList.remove("theme-classic","theme-modern","theme-elegant","theme-bold");
  document.body.classList.add(`theme-${state.meta.theme}`);
  menuCanvas.style.setProperty("--thumb", `${state.meta.photoSize}px`);
}

function renderMenu(){
  sectionsPreview.innerHTML = "";
  state.sections.forEach(sec=>{
    const secEl = document.importNode($("#sectionTemplate").content, true).children[0];
    secEl.querySelector(".section-title").textContent = sec.name;
    const ul = secEl.querySelector(".items");

    sec.items.forEach(item=>{
      const itemEl = document.importNode($("#itemTemplate").content, true).children[0];
      itemEl.dataset.id = item.id;
      itemEl.dataset.sectionId = sec.id;
      itemEl.setAttribute("tabindex", "0");

      // Touch drag handlers
      enableTouchDrag(itemEl, ul, sec);

      // Photo
      const img = itemEl.querySelector(".thumb");
      if(state.meta.showPhotos && item.photo){
        img.src = item.photo; img.alt = item.name; img.classList.add("has-photo");
      } else {
        img.removeAttribute("src"); img.classList.remove("has-photo");
      }

      // Text
      itemEl.querySelector(".name").textContent = item.name;
      const priceEl = itemEl.querySelector(".price");
      priceEl.textContent = item.price || "";
      priceEl.setAttribute("data-currency", state.meta.currency || "$");

      const descEl = itemEl.querySelector(".desc");
      descEl.textContent = item.desc || "";
      descEl.style.display = item.desc ? "block" : "none";

      const dotsEl = itemEl.querySelector(".dots");
      dotsEl.style.display = state.meta.dotLeaders ? "block" : "none";

      ul.appendChild(itemEl);
    });

    sectionsPreview.appendChild(secEl);
  });
}

// Pointer-based drag for iOS/Android
function enableTouchDrag(itemEl, ul, sec){
  let startY = 0;
  let dragging = false;
  let placeholder = null;
  let originalIndex = -1;

  const onPointerDown = (e)=>{
    const t = e.target;
    if(!(e.pointerType === "touch" || e.pointerType === "pen" || e.pointerType === "mouse")) return;
    startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    dragging = true;
    itemEl.classList.add("dragging");
    placeholder = document.createElement("li");
    placeholder.style.height = `${itemEl.getBoundingClientRect().height}px`;
    placeholder.style.border = "2px dashed var(--accent)";
    placeholder.style.borderRadius = "10px";
    placeholder.style.opacity = "0.4";
    originalIndex = Array.from(ul.children).indexOf(itemEl);
    ul.insertBefore(placeholder, itemEl.nextSibling);
    itemEl.style.position = "absolute";
    const rect = itemEl.getBoundingClientRect();
    itemEl.style.width = `${rect.width}px`;
    itemEl.style.pointerEvents = "none";
    itemEl.style.zIndex = "20";
    moveAt(e);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const moveAt = (e)=>{
    const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    itemEl.style.transform = `translate(${0}px, ${y - startY}px)`;
    const siblings = Array.from(ul.children).filter(ch => ch !== itemEl && ch !== placeholder);
    let next = null;
    for(const sib of siblings){
      const r = sib.getBoundingClientRect();
      if(y < r.top + r.height/2){ next = sib; break; }
    }
    if(next) ul.insertBefore(placeholder, next);
    else ul.appendChild(placeholder);
  };

  const onPointerMove = (e)=>{
    if(!dragging) return;
    moveAt(e);
    e.preventDefault();
  };

  const onPointerUp = (e)=>{
    window.removeEventListener("pointermove", onPointerMove);
    dragging = false;
    itemEl.classList.remove("dragging");
    itemEl.style.position = "";
    itemEl.style.width = "";
    itemEl.style.pointerEvents = "";
    itemEl.style.zIndex = "";
    itemEl.style.transform = "";

    if(placeholder){
      ul.insertBefore(itemEl, placeholder);
      placeholder.remove();
      placeholder = null;

      // update state order
      const secObj = state.sections.find(s=>s.id===sec.id);
      if(secObj){
        const items = secObj.items;
        const fromIdx = originalIndex;
        const toIdx = Array.from(ul.children).indexOf(itemEl);
        if(fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx){
          const moving = items.splice(fromIdx, 1)[0];
          items.splice(toIdx, 0, moving);
          save();
        }
      }
      renderMenu(); // re-render to normalize DOM
    }
  };

  itemEl.addEventListener("pointerdown", onPointerDown);
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[c])); }

// Accessibility & init
preview.addEventListener("keydown", (e)=>{
  if(e.key === "p" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); window.print(); }
});

document.addEventListener("DOMContentLoaded", ()=>{
  accentColor.value = state.meta.accent;
  fontSelect.value = state.meta.font;
  themeSelect.value = state.meta.theme;
  columnsSelect.value = String(state.meta.columns);
  currencySymbol.value = state.meta.currency;
  dotLeaders.checked = !!state.meta.dotLeaders;
  showPhotos.checked = !!state.meta.showPhotos;
  photoSize.value = String(state.meta.photoSize);
});
