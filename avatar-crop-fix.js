const AVATAR_INPUT_ID = "profile-avatar-input";
const AVATAR_CROP_SIZE = 512;
const AVATAR_CROP_QUALITY = 0.9;
const MAX_SOURCE_SIZE = 8 * 1024 * 1024;

function setAvatarCropMessage(value = "") {
  const message = document.querySelector("#profile-message");
  if (message) message.textContent = value;
}

function setAvatarCropError(value = "") {
  const error = document.querySelector("#profile-error");
  if (error) error.textContent = value;
}

function paintPreview(url) {
  ["#profile-avatar-preview", "#user-avatar"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.textContent = "";
    element.style.setProperty("background-image", `url("${url}")`, "important");
    element.style.setProperty("background-size", "cover", "important");
    element.style.setProperty("background-position", "center", "important");
    element.style.setProperty("background-repeat", "no-repeat", "important");
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar avatar gagal dibaca."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type = "image/webp", quality = AVATAR_CROP_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Crop avatar gagal diproses."));
      else resolve(blob);
    }, type, quality);
  });
}

async function cropAvatarFile(file) {
  if (!file.type.startsWith("image/")) return file;
  if (file.size > MAX_SOURCE_SIZE) throw new Error("Ukuran gambar maksimal 8MB sebelum crop.");

  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sx = ((image.naturalWidth || image.width) - side) / 2;
  const sy = ((image.naturalHeight || image.height) - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_CROP_SIZE;
  canvas.height = AVATAR_CROP_SIZE;

  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_CROP_SIZE, AVATAR_CROP_SIZE);

  const blob = await canvasToBlob(canvas, "image/webp", AVATAR_CROP_QUALITY);
  return new File([blob], "avatar-cropped.webp", { type: "image/webp", lastModified: Date.now() });
}

async function handleAvatarCrop(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.id !== AVATAR_INPUT_ID) return;

  if (input.dataset.avatarCropped === "1") {
    delete input.dataset.avatarCropped;
    return;
  }

  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  try {
    setAvatarCropError("");
    setAvatarCropMessage("Menyiapkan avatar square 1:1...");

    const cropped = await cropAvatarFile(file);
    const transfer = new DataTransfer();
    transfer.items.add(cropped);
    input.files = transfer.files;
    input.dataset.avatarCropped = "1";

    const previewUrl = URL.createObjectURL(cropped);
    paintPreview(previewUrl);
    setTimeout(() => URL.revokeObjectURL(previewUrl), 4000);

    input.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    input.value = "";
    setAvatarCropMessage("");
    setAvatarCropError(error.message || "Crop avatar gagal.");
  }
}

document.addEventListener("change", handleAvatarCrop, true);
