const APP_VERSION = "1.3"; 
if(localStorage.getItem("appVersion") !== APP_VERSION){
  localStorage.clear();
  localStorage.setItem("appVersion", APP_VERSION);
}
if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister())); }

let password = "170714";
let customers = [];
let products = [];
let GITHUB_USERNAME, REPO_NAME, TOKEN;

function clearStorage(){
  localStorage.removeItem('mezeGithubUser');
  localStorage.removeItem('mezeRepo');
  localStorage.removeItem('mezeToken');
  alert("Bilgiler temizlendi!");
  location.reload();
}

async function login() {
  let pass = document.getElementById('password').value;
  if(pass !== password) { document.getElementById('loginError').textContent="Hatalı şifre!"; return; }
  GITHUB_USERNAME = document.getElementById('githubUser').value;
  REPO_NAME = document.getElementById('repoName').value;
  TOKEN = document.getElementById('tokenInput').value;
  if(!GITHUB_USERNAME || !REPO_NAME || !TOKEN){ alert("GitHub bilgilerini girin!"); return; }
  localStorage.setItem("mezeGithubUser",GITHUB_USERNAME);
  localStorage.setItem("mezeRepo",REPO_NAME);
  localStorage.setItem("mezeToken",TOKEN);
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
  await loadFromGitHub();
}

async function loadFromGitHub(){
  // Müşteri verisi
  let dataUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/mezeData.json`;
  let res1 = await fetch(dataUrl, { headers: { "Authorization": "token " + TOKEN }});
  if(res1.ok){
      let data = await res1.json();
      let content = atob(data.content);
      let parsed = JSON.parse(content);
      customers = parsed.customers || [];
  }
  // Ürün listesi
  let prodUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/products.json`;
  let res2 = await fetch(prodUrl, { headers: { "Authorization": "token " + TOKEN }});
  if(res2.ok){
      let data = await res2.json();
      let content = atob(data.content);
      products = JSON.parse(content);
  }
  saveData();
  loadCustomers();
}

function saveData(){
  localStorage.setItem('mezeData', JSON.stringify({customers,products}));
}

async function pushCustomers(){
  let content = btoa(JSON.stringify({customers}, null, 2));
  let url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/mezeData.json`;
  let res = await fetch(url, { headers: { "Authorization": "token " + TOKEN } });
  let data = await res.json();
  let sha = data.sha;
  await fetch(url, {
    method: "PUT",
    headers: { "Authorization": "token " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Müşteri verisi güncellendi", content: content, sha: sha })
  });
  alert("Müşteri verisi kaydedildi!");
}

async function pushProducts(){
  let content = btoa(JSON.stringify(products, null, 2));
  let url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/products.json`;
  let res = await fetch(url, { headers: { "Authorization": "token " + TOKEN } });
  let data = await res.json();
  let sha = data.sha;
  await fetch(url, {
    method: "PUT",
    headers: { "Authorization": "token " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Ürün listesi güncellendi", content: content, sha: sha })
  });
  alert("Ürün listesi kaydedildi!");
}

// ---------- MÜŞTERİ YÖNETİMİ ----------
function loadCustomers() {
  let list = document.getElementById('customerList');
  list.innerHTML="";
  customers.forEach((c, i) => {
    let div = document.createElement('div');
    div.className="customer-item";
    div.textContent = c.name + " - Bakiye: " + calcBalance(c) + " TL";
    div.onclick = ()=>openCustomer(i);
    list.appendChild(div);
  });
}

function addCustomer() {
  let name = document.getElementById('newCustomerName').value;
  if(!name) return;
  customers.push({name:name, orders:[], payments:[]});
  document.getElementById('newCustomerName').value="";
  saveData();
  loadCustomers();
}

let currentCustomerIndex = -1;

function openCustomer(i) {
  currentCustomerIndex = i;
  document.getElementById('mainPage').classList.add('hidden');
  document.getElementById('customerPage').classList.remove('hidden');
  document.getElementById('customerNameTitle').textContent = customers[i].name;
  renderCustomer();
  resetProductLines();
}

function backToMain() {
  document.getElementById('customerPage').classList.add('hidden');
  document.getElementById('productPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
  saveData();
  loadCustomers();
}

function updateCustomerName() {
  customers[currentCustomerIndex].name = document.getElementById('customerNameTitle').textContent;
  saveData();
  loadCustomers();
}

function calcBalance(cust) {
  let totalOrders = cust.orders.reduce((s,o)=>s+o.total,0);
  let totalPayments = cust.payments.reduce((s,p)=>s+p.amount,0);
  return (totalOrders - totalPayments).toFixed(2);
}

function renderCustomer() {
  let cust = customers[currentCustomerIndex];
  document.getElementById('balanceInfo').textContent = "Bakiye: " + calcBalance(cust) + " TL";
  let ordersList = document.getElementById('ordersList'); ordersList.innerHTML="";
  cust.orders.forEach((o) => {
    let div = document.createElement('div');
    let header = document.createElement('div');
    header.className="order-header";
    header.innerHTML = `<span>${o.date}</span><span>${o.total} TL</span>`;
    let details = document.createElement('div'); details.className="order-details hidden";
    o.items.forEach(it=>{
      let p = document.createElement('p');
      p.textContent = `${it.name} - ${it.qty} ${it.unit} - ${it.price} TL`;
      details.appendChild(p);
    });
    header.onclick = ()=>details.classList.toggle('hidden');
    div.appendChild(header); div.appendChild(details); ordersList.appendChild(div);
  });
  let paymentsList = document.getElementById('paymentsList'); paymentsList.innerHTML="";
  cust.payments.forEach(p=>{
    let line = document.createElement('p'); line.textContent = `${p.date} - ${p.amount} TL (${p.type})`;
    paymentsList.appendChild(line);
  });
}

// ---------- SİPARİŞ EKLEME ----------
function addProductLine() {
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

function resetProductLines(){
  document.getElementById('productLines').innerHTML="";
  addProductLine();
}

function updatePrice(select){
  let div = select.parentElement;
  let product = products.find(p=>p.name===select.value);
  div.querySelector('.productUnit').value = product.unit;
  let qty = parseFloat(div.querySelector('.productQty').value);
  div.querySelector('.productPrice').value = (product.price * qty).toFixed(2);
}

function recalculateLine(input){
  let div = input.parentElement;
  let product = products.find(p=>p.name===div.querySelector('.productSelect').value);
  let qty = parseFloat(input.value);
  div.querySelector('.productPrice').value = (product.price * qty).toFixed(2);
}

function saveOrder() {
  let date = document.getElementById('orderDate').value;
  if(!date) return alert("Tarih gerekli!");
  let selects = document.querySelectorAll('.productSelect');
  let qtys = document.querySelectorAll('.productQty');
  let units = document.querySelectorAll('.productUnit');
  let prices = document.querySelectorAll('.productPrice');
  let items = [], total = 0;
  for(let i=0;i<selects.length;i++){
    let n = selects[i].value;
    let q = parseFloat(qtys[i].value);
    let u = units[i].value;
    let p = parseFloat(prices[i].value)||0;
    total += p;
    items.push({name:n, qty:q, unit:u, price:p});
  }
  customers[currentCustomerIndex].orders.push({date:date, items:items, total:total});
  document.getElementById('orderDate').value="";
  resetProductLines();
  saveData();
  renderCustomer();
}

// ---------- ÖDEME EKLEME ----------
function savePayment() {
  let date = document.getElementById('paymentDate').value;
  let amount = parseFloat(document.getElementById('paymentAmount').value);
  let type = document.getElementById('paymentType').value;
  if(!date || !amount) return alert("Tarih ve tutar gerekli!");
  customers[currentCustomerIndex].payments.push({date:date, amount:amount, type:type});
  document.getElementById('paymentDate').value="";
  document.getElementById('paymentAmount').value="";
  saveData();
  renderCustomer();
}

// ---------- ÜRÜN YÖNETİMİ ----------
function openProductPage(){
  document.getElementById('mainPage').classList.add('hidden');
  document.getElementById('productPage').classList.remove('hidden');
  renderProductList();
}

function renderProductList(){
  let list = document.getElementById('productList');
  list.innerHTML="";
  products.forEach((p,i)=>{
    let div = document.createElement('div');
    div.className="flex";
    div.innerHTML = `
      <input value="${p.name}" onchange="products[${i}].name=this.value; saveData();">
      <select onchange="products[${i}].unit=this.value; saveData();">
        <option value="kg" ${p.unit==="kg"?"selected":""}>kg</option>
        <option value="adet" ${p.unit==="adet"?"selected":""}>adet</option>
      </select>
      <input type="number" value="${p.price}" onchange="products[${i}].price=parseFloat(this.value)||0; saveData();">
    `;
    list.appendChild(div);
  });
}

function addProduct(){
  let name = document.getElementById('newProductName').value;
  let unit = document.getElementById('newProductUnit').value;
  let price = parseFloat(document.getElementById('newProductPrice').value)||0;
  if(!name) return;
  products.push({name,unit,price});
  document.getElementById('newProductName').value="";
  document.getElementById('newProductPrice').value="";
  saveData();
  renderProductList();
}

// ---------- PDF ----------
async function generatePDF(){
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let cust = customers[currentCustomerIndex];
  doc.text("Meze Finans Raporu", 10, 10);
  doc.text("Müşteri: "+cust.name, 10, 20);
  doc.text("Tarih: "+new Date().toLocaleDateString(), 10, 30);
  let y=40;
  doc.text("Siparişler:", 10, y); y+=10;
  cust.orders.forEach(o=>{
    doc.text(o.date+" - Toplam: "+o.total+" TL",10,y); y+=10;
    o.items.forEach(it=>{
      doc.text("   "+it.name+" - "+it.qty+" "+it.unit+" - "+it.price+" TL",15,y); y+=10;
    });
  });
  y+=10; doc.text("Ödemeler:",10,y); y+=10;
  cust.payments.forEach(p=>{
    doc.text(p.date+" - "+p.amount+" TL ("+p.type+")",10,y); y+=10;
  });
  y+=10; doc.text("Bakiye: "+calcBalance(cust)+" TL",10,y);
  doc.save("rapor_"+cust.name+".pdf");
}

// ---------- INIT ----------
window.onload = ()=>{
  let data = localStorage.getItem('mezeData');
  if(data){ 
    let parsed = JSON.parse(data);
    customers = parsed.customers || [];
    products = parsed.products || [];
  }
  document.getElementById('githubUser').value = localStorage.getItem('mezeGithubUser') || "";
  document.getElementById('repoName').value = localStorage.getItem('mezeRepo') || "";
  document.getElementById('tokenInput').value = localStorage.getItem('mezeToken') || "";
}
