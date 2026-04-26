import { getApiBaseUrl, setApiBaseUrl } from "./config.js";
import { createIzinTalep, deleteIzin, getIstatistikler, listIzinler, updateIzinDurum } from "./api.js";

function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element bulunamadı: ${selector}`);
  return el;
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
function formatDatePretty(value) {
  const iso = formatDate(value);
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateFormatter.format(d);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("is-show"), 2200);
}

function statusBadge(durum) {
  if (durum === "Bekliyor") return `<span class="badge badge--pending" style="font-size: 11px; padding: 2px 8px;">Bekliyor</span>`;
  if (durum === "Onaylandı") return `<span class="badge badge--ok" style="font-size: 11px; padding: 2px 8px;">Onaylandı</span>`;
  if (durum === "Reddedildi") return `<span class="badge badge--no" style="font-size: 11px; padding: 2px 8px;">Reddedildi</span>`;
  return `<span class="badge">${durum ?? ""}</span>`;
}

function setActiveTab(tabName) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tabName));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  $(`#view-${tabName}`).classList.add("is-active");
}

// Son oluşturulan talebi MİNİMAL kart şeklinde göster
function displayLastCreated(talep) {
  const lastCreatedDiv = $("#lastCreated");
  if (!talep) {
    lastCreatedDiv.innerHTML = `
      <div style="text-align: center; color: var(--muted); padding: 16px; font-size: 13px;">
        ✨ Henüz talep yok
      </div>
    `;
    return;
  }
  
  // Minimal kart HTML'i
  const html = `
    <div style="background: rgba(124,92,255,0.08); border-radius: 12px; padding: 10px 14px; border: 1px solid rgba(124,92,255,0.15); transition: all 0.2s;">
      <!-- Tek satır: ID, Ad Soyad ve Durum -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #7c5cff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">#${talep.id}</span>
          <span style="font-weight: 600; font-size: 13px;">${escapeHtml(talep.adSoyad)}</span>
        </div>
        ${statusBadge(talep.durum)}
      </div>
      
      <!-- İkinci satır: Tarih ve Tür -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--muted);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>📅 ${formatDatePretty(talep.baslangicTarihi)} → ${formatDatePretty(talep.bitisTarihi)}</span>
          <span>📋 ${escapeHtml(talep.izinTuru)}</span>
        </div>
        ${talep.aciklama && talep.aciklama.trim() !== "" ? `
          <span style="display: flex; align-items: center; gap: 4px;">💬 <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(talep.aciklama)}</span></span>
        ` : ""}
      </div>
    </div>
  `;
  
  lastCreatedDiv.innerHTML = html;
}

// HTML escape fonksiyonu
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// En son talebi getir
async function getLastCreatedIzin() {
  try {
    const izinler = await listIzinler({});
    if (Array.isArray(izinler) && izinler.length > 0) {
      const lastIzin = izinler[0];
      displayLastCreated(lastIzin);
      return lastIzin;
    } else {
      displayLastCreated(null);
    }
  } catch (e) {
    console.error("Son talep getirilemedi:", e);
    displayLastCreated(null);
  }
}

async function refreshList() {
  const tbody = $("#izinTableBody");
  tbody.innerHTML = `<tr><td colspan="7" class="muted">Yükleniyor…</td></tr>`;

  const durum = $("#durumFilter").value || undefined;
  try {
    const izinler = await listIzinler({ durum });
    if (!Array.isArray(izinler) || izinler.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Kayıt yok.</td></tr>`;
      return;
    }

    tbody.innerHTML = izinler
      .map((i) => {
        const canDecide = i.durum === "Bekliyor";
        const actions = `
          <div class="btns-inline" style="gap: 6px;">
            ${
              canDecide
                ? `<button class="btn btn--success" data-action="approve" data-id="${i.id}" style="padding: 4px 10px; font-size: 12px;">Onayla</button>
                   <button class="btn btn--warning" data-action="reject" data-id="${i.id}" style="padding: 4px 10px; font-size: 12px;">Reddet</button>`
                : ""
            }
            <button class="btn btn--danger" data-action="delete" data-id="${i.id}" style="padding: 4px 10px; font-size: 12px;">Sil</button>
          </div>
        `;

        return `
          <tr>
            <td>${i.id}</td>
            <td>${escapeHtml(i.adSoyad ?? "")}</td>
            <td>${escapeHtml(i.izinTuru ?? "")}</td>
            <td>${formatDatePretty(i.baslangicTarihi)}</td>
            <td>${formatDatePretty(i.bitisTarihi)}</td>
            <td>${statusBadge(i.durum)}</td>
            <td>${actions}</td>
          </tr>
        `;
      })
      .join("");
      
    await getLastCreatedIzin();
    
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">${escapeHtml(String(e.message ?? e))}</td></tr>`;
  }
}

async function refreshStats() {
  const grid = $("#statsGrid");
  grid.innerHTML = "";
  try {
    const stats = await getIstatistikler();
    const items = [
      { label: "Bekliyor", value: stats?.Bekliyor ?? 0 },
      { label: "Onaylandı", value: stats?.Onaylandı ?? 0 },
      { label: "Reddedildi", value: stats?.Reddedildi ?? 0 },
    ];
    grid.innerHTML = items
      .map(
        (x) => `
        <div class="stat" style="padding: 8px 12px;">
          <div class="stat__label" style="font-size: 11px;">${x.label}</div>
          <div class="stat__value" style="font-size: 18px;">${x.value}</div>
        </div>
      `
      )
      .join("");
  } catch (e) {
    grid.innerHTML = `<div class="muted">${escapeHtml(String(e.message ?? e))}</div>`;
  }
}

function initApiSettings() {
  const input = $("#apiBaseUrl");
  input.value = getApiBaseUrl();

  $("#saveApiBaseUrl").addEventListener("click", () => {
    const value = setApiBaseUrl(input.value);
    input.value = value;
    toast("API kaydedildi");
    refreshList();
    refreshStats();
  });
}

function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.tab);
    });
  });
}

function initTalepForm() {
  const form = $("#talepForm");
  const baslangicInput = $("#baslangicTarihi");
  const bitisInput = $("#bitisTarihi");

  function enableShowPickerOnClick(input) {
    input.addEventListener("click", () => {
      if (input.disabled || input.readOnly) return;
      if (typeof input.showPicker !== "function") return;
      try {
        input.showPicker();
      } catch {
        // Bazı tarayıcılarda/koşullarda showPicker engellenebilir.
      }
    });
  }

  enableShowPickerOnClick(baslangicInput);
  enableShowPickerOnClick(bitisInput);

  baslangicInput.addEventListener("change", function() {
    const baslangic = this.value;
    if (baslangic) {
      bitisInput.min = baslangic;
      if (bitisInput.value && bitisInput.value < baslangic) {
        bitisInput.value = "";
        toast("Bitiş tarihi başlangıç tarihinden önce olamaz");
      }
    } else {
      bitisInput.min = "";
    }
  });

  bitisInput.addEventListener("change", function() {
    const baslangic = baslangicInput.value;
    const bitis = this.value;
    if (baslangic && bitis && bitis < baslangic) {
      this.value = "";
      toast("Bitiş tarihi başlangıç tarihinden önce olamaz");
    }
  });

  if (baslangicInput.value) {
    bitisInput.min = baslangicInput.value;
  }

  $("#talepFormReset").addEventListener("click", () => {
    form.reset();
    bitisInput.min = "";
    getLastCreatedIzin();
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const payload = {
      adSoyad: String(fd.get("adSoyad") ?? "").trim(),
      izinTuru: String(fd.get("izinTuru") ?? ""),
      baslangicTarihi: String(fd.get("baslangicTarihi") ?? ""),
      bitisTarihi: String(fd.get("bitisTarihi") ?? ""),
      aciklama: String(fd.get("aciklama") ?? ""),
    };

    if (!payload.adSoyad) return toast("Ad Soyad zorunlu");
    if (!payload.baslangicTarihi || !payload.bitisTarihi) return toast("Tarih alanları zorunlu");
    
    if (payload.baslangicTarihi > payload.bitisTarihi) {
      return toast("Başlangıç tarihi bitiş tarihinden sonra olamaz");
    }

    try {
      const created = await createIzinTalep(payload);
      displayLastCreated(created);
      toast("Talep oluşturuldu ✅");
      setActiveTab("yonetici");
      await refreshList();
      await refreshStats();
    } catch (e) {
      toast(String(e.message ?? e));
    }
  });
}

function initListActions() {
  $("#refreshList").addEventListener("click", refreshList);
  $("#durumFilter").addEventListener("change", refreshList);

  $("#izinTableBody").addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === "approve") {
        await updateIzinDurum(id, "Onaylandı");
        toast("Onaylandı ✅");
      } else if (action === "reject") {
        await updateIzinDurum(id, "Reddedildi");
        toast("Reddedildi ❌");
      } else if (action === "delete") {
        const ok = window.confirm(`Talep silinsin mi? (ID: ${id})`);
        if (!ok) return;
        await deleteIzin(id);
        toast("Silindi 🗑️");
      }
      await refreshList();
      await refreshStats();
      await getLastCreatedIzin();
    } catch (e) {
      toast(String(e.message ?? e));
    }
  });
}

function initStats() {
  $("#refreshStats").addEventListener("click", refreshStats);
}

// Başlat
initApiSettings();
initTabs();
initTalepForm();
initListActions();
initStats();

getLastCreatedIzin();
refreshList();
refreshStats();
