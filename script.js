let products = [];

// Sayfa açılır açılmaz ürünleri yükle
window.addEventListener("DOMContentLoaded", loadProducts);

async function loadProducts() {
  try {
    const response = await fetch("products.json");
    if (!response.ok) throw new Error("Ürün listesi okunamadı!");
    products = await response.json();
    console.log("Ürünler yüklendi:", products);
  } catch (err) {
    alert("Ürün listesi yüklenemedi: " + err.message);
    products = [];
  }
}

// Sipariş satırı ekle
function addProductLine() {
  if (products.length === 0) {
    alert("Ürün listesi boş! Lütfen products.json'u kontrol edin.");
    return;
  }

  let container = document.getElementById('productLines');
  let div = document.createElement('div');
  div.className="flex";
  div.innerHTML = `
    <select class="productSelect" onchange="updatePrice(this)">
      ${products.map(p=>`<option value="${p.name}">${p.name}</option>`).join("")}
    </select>
    <input type="number" class="productQty" value="1" step="0.5" onchange="recalculateLine(this)">
    <select class="productUnit">
      <option value="kg">kg</option>
      <option value="adet">adet</option>
    </select>
    <input type="number" class="productPrice" placeholder="Fiyat (TL)">
  `;
  container.appendChild(div);
  updatePrice(div.querySelector('.productSelect'));
}

// Seçilen ürünün fiyatını otomatik getir
function updatePrice(select){
  let div = select.parentElement;
  let product = products.find(p=>p.name===select.value);
  div.querySelector('.productUnit').value = product.unit;
  let qty = parseFloat(div.querySelector('.productQty').value);
  div.querySelector('.productPrice').value = (product.price * qty).toFixed(2);
}

// Miktar değişince fiyatı güncelle
function recalculateLine(input){
  let div = input.parentElement;
  let product = products.find(p=>p.name===div.querySelector('.productSelect').value);
  let qty = parseFloat(input.value);
  div.querySelector('.productPrice').value = (product.price * qty).toFixed(2);
}