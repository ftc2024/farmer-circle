import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BIAS_BUCKET = "daily-bias-screenshots";
const MAX_BIAS_IMAGE_SIZE = 10 * 1024 * 1024;
const $ = (selector, root = document) => root.querySelector(selector);
let supabasePromise;
let renderBusy = false;
let lastRole = "";

async function getClient() {
  if (supabasePromise) return supabasePromise;
  supabasePromise = fetch(`./app.js?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => response.text())
    .then((source) => {
      const url = source.match(/const\s+SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
      const key = source.match(/const\s+SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)?.[1];
      if (!url || !key) throw new Error("Konfigurasi Supabase tidak ditemukan.");
      return createClient(url, key, {
        auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
      });
    });
  return supabasePromise;
}

async function getSessionUser(client) {
  const { data } = await client.auth.getSession();
  return data.session?.user || null;
}

function pageRole() {
  return String($("#user-role")?.textContent || lastRole || "").trim().toLowerCase();
}

function canManage(role) {
  return ["admin", "mentor"].includes(String(role || "").trim().toLowerCase());
}

async function getRole(client, user) {
  const visible = pageRole();
  if (canManage(visible)) {
    lastRole = visible;
    return visible;
  }
  if (!user) return visible || "";
  const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  lastRole = String(data?.role || user.user_metadata?.role || visible || "member").trim().toLowerCase();
  return lastRole;
}

function text(selector, value = "") {
  const element = $(selector);
  if (element) element.textContent = value;
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function fmtDate(value) {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "-";
  }
}

function injectStyles() {
  if ($("#daily-bias-storage-style")) return;
  const style = document.createElement("style");
  style.id = "daily-bias-storage-style";
  style.textContent = `
    .bias-shot-field small { color: var(--muted); line-height: 1.45; }
    .bias-shot-grid { display: grid; gap: 10px; margin-top: 14px; }
    .bias-shot-grid img { width: 100%; max-height: 420px; object-fit: cover; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.035); }
    .bias-shot-grid a { color: var(--cyan); font-weight: 800; text-decoration: none; }
    .bias-shot-grid a:hover { text-decoration: underline; }
  `;
  document.head.appendChild(style);
}

function enhanceDailyBiasForm() {
  const form = $("#bias-form");
  if (!form) return;
  if (!$("#bias-screenshot")) {
    const target = $("#bias-error") || form.querySelector("button[type='submit']");
    target?.insertAdjacentHTML("beforebegin", `
      <label class="bias-shot-field">
        <span>Screenshot Analisa</span>
        <input id="bias-screenshot" type="file" accept="image/jpeg,image/png,image/webp" />
        <small>Opsional. JPG, PNG, atau WebP maksimal 10MB.</small>
      </label>`);
  }
}

function stabilizeForm(role = pageRole()) {
  const form = $("#bias-form");
  if (!form) return;
  const allowed = canManage(role);
  form.classList.toggle("hidden", !allowed);
  form.style.display = allowed ? "" : "none";
  enhanceDailyBiasForm();
}

async function uploadBiasScreenshot(client, user, biasId, file, title) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Screenshot harus JPG, PNG, atau WebP.");
  if (file.size > MAX_BIAS_IMAGE_SIZE) throw new Error("Ukuran screenshot Daily Bias maksimal 10MB.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
  const path = `${user.id}/${biasId}/${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await client.storage.from(BIAS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw new Error(`Upload screenshot gagal: ${uploadError.message}`);

  const metaPayload = {
    owner_user_id: user.id,
    uploaded_by: user.id,
    folder_type: "daily_bias_screenshots",
    related_table: "daily_biases",
    related_id: biasId,
    title: title || "Daily Bias Screenshot",
    original_filename: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    drive_file_id: `supabase:${BIAS_BUCKET}:${path}`,
    drive_folder_id: BIAS_BUCKET,
    visibility: "member",
    metadata: { provider: "supabase_storage", bucket: BIAS_BUCKET, path },
  };

  const { error: metaError } = await client.from("drive_files").insert(metaPayload);
  if (metaError) throw new Error(`Metadata screenshot gagal disimpan: ${metaError.message}`);
}

async function getSignedUrl(client, file) {
  const bucket = file.metadata?.bucket || BIAS_BUCKET;
  const path = file.metadata?.path;
  if (!path) return "";
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

async function renderDailyBiases() {
  const list = $("#bias-list");
  if (!list || renderBusy) return;
  renderBusy = true;

  if (!list.innerHTML.trim()) {
    list.innerHTML = '<div class="empty-state">Memuat daily bias...</div>';
  }

  try {
    const client = await getClient();
    const user = await getSessionUser(client);
    if (!user) {
      list.innerHTML = '<div class="empty-state">Login dulu untuk melihat Daily Bias.</div>';
      return;
    }

    const role = await getRole(client, user);
    stabilizeForm(role);
    const editable = canManage(role);

    const { data: biases, error } = await client
      .from("daily_biases")
      .select("*, profiles(full_name, role)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!biases?.length) {
      list.innerHTML = '<div class="empty-state">Belum ada daily bias.</div>';
      return;
    }

    const ids = biases.map((item) => item.id);
    let files = [];
    if (ids.length) {
      const filesResult = await client
        .from("drive_files")
        .select("*")
        .eq("folder_type", "daily_bias_screenshots")
        .eq("related_table", "daily_biases")
        .in("related_id", ids)
        .order("created_at", { ascending: true });
      files = filesResult.data || [];
    }

    for (const file of files) {
      file.previewUrl = await getSignedUrl(client, file);
    }

    const byBias = new Map();
    files.forEach((file) => {
      const key = String(file.related_id);
      byBias.set(key, [...(byBias.get(key) || []), file]);
    });

    list.innerHTML = biases.map((bias) => {
      const shots = byBias.get(String(bias.id)) || [];
      const shotHTML = shots.length
        ? `<div class="bias-shot-grid">${shots.map((shot) => shot.previewUrl ? `<a href="${shot.previewUrl}" target="_blank" rel="noopener"><img src="${shot.previewUrl}" alt="Screenshot ${escapeHTML(bias.title)}" loading="lazy" /></a>` : "").join("")}</div>`
        : "";
      return `<article class="data-card" data-bias-storage-card="${bias.id}">
        <div class="card-topline">
          <div class="card-title"><strong>${escapeHTML(bias.title)}</strong><span>${escapeHTML(bias.market)} - ${fmtDate(bias.created_at)} - ${escapeHTML(bias.profiles?.full_name || bias.profiles?.role || "Team")}</span></div>
          ${editable ? `<div class="card-actions"><button class="icon-button" type="button" data-edit-bias="${bias.id}" aria-label="Edit daily bias"><i data-lucide="pencil"></i></button><button class="icon-button" type="button" data-delete-bias="${bias.id}" aria-label="Hapus daily bias"><i data-lucide="trash-2"></i></button></div>` : ""}
        </div>
        <div class="badge-row"><span class="badge ${escapeHTML(bias.direction)}">${escapeHTML(bias.direction)}</span></div>
        <p class="card-body">${escapeHTML(bias.content)}</p>
        ${shotHTML}
      </article>`;
    }).join("");
    window.lucide?.createIcons();
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Gagal memuat daily bias: ${escapeHTML(error.message)}</div>`;
  } finally {
    renderBusy = false;
  }
}

async function saveDailyBias(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "bias-form") return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  text("#bias-error", "");
  if (!form.reportValidity()) return;

  const button = form.querySelector("button[type='submit']");
  const buttonText = button?.querySelector("span");
  if (button) button.disabled = true;
  if (buttonText) buttonText.textContent = "Menyimpan...";

  try {
    const client = await getClient();
    const user = await getSessionUser(client);
    if (!user) throw new Error("Session login tidak ditemukan. Coba login ulang.");
    const role = await getRole(client, user);
    if (!canManage(role)) throw new Error("Hanya admin dan mentor yang boleh upload daily bias.");

    const id = $("#bias-id")?.value || "";
    const title = $("#bias-title")?.value.trim() || "";
    const payload = {
      author_id: user.id,
      title,
      market: $("#bias-market")?.value.trim().toUpperCase() || "",
      direction: $("#bias-direction")?.value || "neutral",
      content: $("#bias-content")?.value.trim() || "",
    };

    const query = id
      ? client.from("daily_biases").update(payload).eq("id", id).select("id").single()
      : client.from("daily_biases").insert(payload).select("id").single();

    const { data, error } = await query;
    if (error) throw error;
    const biasId = data?.id || id;

    const file = $("#bias-screenshot")?.files?.[0];
    if (file) await uploadBiasScreenshot(client, user, biasId, file, title);

    form.reset();
    const idField = $("#bias-id");
    if (idField) idField.value = "";
    text("#bias-form-title", "Upload Daily Bias");
    $("#cancel-edit-bias")?.classList.add("hidden");
    await renderDailyBiases();
  } catch (error) {
    text("#bias-error", error.message || "Gagal menyimpan daily bias.");
  } finally {
    if (button) button.disabled = false;
    if (buttonText) buttonText.textContent = "Publish Daily Bias";
  }
}

async function handleBiasClick(event) {
  const nav = event.target.closest?.('[data-section="bias-section"]');
  const edit = event.target.closest?.("[data-edit-bias]");
  const del = event.target.closest?.("[data-delete-bias]");
  const refresh = event.target.closest?.("#refresh-biases");

  if (nav || refresh) {
    setTimeout(() => { stabilizeFromServer(); renderDailyBiases(); }, 350);
    return;
  }

  if (!edit && !del) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const client = await getClient();

  if (edit) {
    const { data, error } = await client.from("daily_biases").select("*").eq("id", edit.dataset.editBias).maybeSingle();
    if (error || !data) return text("#bias-error", error?.message || "Daily bias tidak ditemukan.");
    $("#bias-id").value = data.id;
    $("#bias-title").value = data.title || "";
    $("#bias-market").value = data.market || "";
    $("#bias-direction").value = data.direction || "neutral";
    $("#bias-content").value = data.content || "";
    const fileInput = $("#bias-screenshot");
    if (fileInput) fileInput.value = "";
    text("#bias-form-title", "Edit Daily Bias");
    $("#cancel-edit-bias")?.classList.remove("hidden");
    stabilizeForm("mentor");
    return;
  }

  if (del) {
    if (!confirm("Hapus daily bias ini?")) return;
    const id = del.dataset.deleteBias;
    const { data: files } = await client
      .from("drive_files")
      .select("id, metadata")
      .eq("folder_type", "daily_bias_screenshots")
      .eq("related_table", "daily_biases")
      .eq("related_id", id);

    for (const file of files || []) {
      const path = file.metadata?.path;
      if (path) await client.storage.from(BIAS_BUCKET).remove([path]);
    }
    if (files?.length) await client.from("drive_files").delete().in("id", files.map((file) => file.id));
    const { error } = await client.from("daily_biases").delete().eq("id", id);
    if (error) return text("#bias-error", error.message);
    await renderDailyBiases();
  }
}

async function stabilizeFromServer() {
  try {
    injectStyles();
    enhanceDailyBiasForm();
    const client = await getClient();
    const user = await getSessionUser(client);
    const role = await getRole(client, user);
    stabilizeForm(role);
    const list = $("#bias-list");
    if (list && !list.innerHTML.trim()) list.innerHTML = '<div class="empty-state">Memuat daily bias...</div>';
  } catch {
    stabilizeForm(pageRole());
  }
}

function boot() {
  injectStyles();
  enhanceDailyBiasForm();
  stabilizeForm(pageRole());
  setTimeout(stabilizeFromServer, 500);
  setTimeout(renderDailyBiases, 900);
  setTimeout(() => { stabilizeFromServer(); renderDailyBiases(); }, 1800);
  setTimeout(() => { stabilizeFromServer(); renderDailyBiases(); }, 3600);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

document.addEventListener("submit", saveDailyBias, true);
document.addEventListener("click", handleBiasClick, true);
setInterval(() => {
  enhanceDailyBiasForm();
  stabilizeForm(pageRole());
  const list = $("#bias-list");
  if (list && (!list.innerHTML.trim() || list.textContent.trim() === "Daily Bias Terbaru") && !renderBusy) renderDailyBiases();
}, 1800);
