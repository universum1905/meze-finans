let products = [];
let customers = [];
let GITHUB_USERNAME, REPO_NAME, TOKEN;

function startApp(){
  GITHUB_USERNAME = document.getElementById("ghUser").value;
  REPO_NAME = document.getElementById("ghRepo").value;
  TOKEN = document.getElementById("ghToken").value;
  if(!GITHUB_USERNAME || !REPO_NAME || !TOKEN) return alert("Tüm bilgileri girin!");
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("mainPage").classList.remove("hidden");
  loadData();
}

async function loadData() {
  // Ürünler
  let prodRes = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/products.json`, {
    headers: { Authorization: "token " + TOKEN }
  });
  let prodData = await prodRes.json();
  products = JSON.parse(atob(prodData.content));

  // Müşteriler
  let dataRes = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/mezeData.json`, {
    headers: { Authorization: "token " + TOKEN }
  });
  let data = await dataRes.json();
  customers = JSON.parse(atob(data.content)).customers || [];

  renderCustomers();
}

async function saveData() {
  let content = btoa(JSON.stringify({ customers }, null, 2));
  let url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/mezeData.json`;
  let res = await fetch(url, { headers: { Authorization: "token " + TOKEN } });
  let data = await res.json();
  let sha = data.sha;
  await fetch(url, {
    method: "PUT",
    headers: { Authorization: "token " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Veri güncellendi", content, sha })
  });
  alert("Veri kaydedildi!");
}

function renderCustomers() {
  let list = document.getElementById("customerList");
  list.innerHTML = "";
  customers.forEach((c, i) => {
    let div = document.createElement("div");
    div.className = "customer-item";
    div.textContent = c.name + " - Bakiye: " + calcBalance(c) + " TL";
    div.onclick = () => openCustomer(i);
    list.appendChild(div);
  });
}

function addCustomer() {
  let name = document.getElementById("newCustomerName").value;
  if (!name) return;
  customers.push({ name: name, orders: [], payments: [] });
  document.getElementById("newCustomerName").value = "";
  saveData();
  renderCustomers();
}

let currentCustomerIndex = -1;
function openCustomer(i) {
  currentCustomerIndex = i;
  document.getElementById("mainPage").classList.add("hidden");
  document.getElementById("customerPage").classList.remove("hidden");
  document.getElementById("customerNameTitle").textContent = customers[i].name;
  renderCustomer();
}

function backToMain() {
  document.getElementById("customerPage").classList.add("hidden");
  document.getElementById("mainPage").classList.remove("hidden");
  renderCustomers();
}

function updateCustomerName() {
  customers[currentCustomerIndex].name = document.getElementById("customerNameTitle").textContent;
  saveData();
  renderCustomers();
}

function calcBalance(cust) {
  let totalOrders = cust.orders.reduce((s,o)=>s+o.total,0);
  let totalPayments = cust.payments.reduce((s,p)=>s+p.amount,0);
  return (totalOrders - totalPayments).toFixed(2);
}

function renderCustomer() {
  let cust = customers[currentCustomerIndex];
  document.getElementById("balanceInfo").textContent = "Bakiye: " + calcBalance(cust) + " TL";
  let ordersList = document.getElementById("ordersList"); ordersList.innerHTML="";
  cust.orders.forEach(o=>{
    let div = document.createElement("div");
    div.className="order-header";
    div.innerHTML=`<span>${o.date}</span><span>${o.total} TL</span>`;
    let details = document.createElement("div");
    details.className="order-details hidden";
    o.items.forEach(it=>{
      let p = document.createElement("p");
      p.textContent=`${it.name} - ${it.qty} ${it.unit} - ${it.price} TL`;
      details.appendChild(p);
    });
    div.onclick=()=>details.classList.toggle("hidden");
    ordersList.appendChild(div); ordersList.appendChild(details);
  });
  let paymentsList = document.getElementById("paymentsList"); paymentsList.innerHTML="";
  cust.payments.forEach(p=>{
    let line=document.createElement("p"); line.textContent=`${p.date} - ${p.amount} TL (${p.type})`;
    paymentsList.appendChild(line);
  });
}

function addProductLine() {
  let container = document.getElementById("productLines");
  let div = document.createElement("div");
  div.className="flex";
  div.innerHTML=`
    <select class="productSelect" onchange="updatePrice(this)">
      ${products.map(p=>`<option value="${p.name}">${p.name}</option>`).join("")}
    </select>
    <input type="number" class="productQty" value="1" step="0.5" onchange="recalculateLine(this)">
    <select class="productUnit"><option value="kg">kg</option><option value="adet">adet</option></select>
    <input type="number" class="productPrice" placeholder="Fiyat (TL)">
  `;
  container.appendChild(div);
  updatePrice(div.querySelector(".productSelect"));
}

function updatePrice(select){
  let div = select.parentElement;
  let product = products.find(p=>p.name===select.value);
  div.querySelector(".productUnit").value = product.unit;
  let qty = parseFloat(div.querySelector(".productQty").value);
  div.querySelector(".productPrice").value = (product.price * qty).toFixed(2);
}

function recalculateLine(input){
  let div = input.parentElement;
  let product = products.find(p=>p.name===div.querySelector(".productSelect").value);
  let qty = parseFloat(input.value);
  div.querySelector(".productPrice").value = (product.price * qty).toFixed(2);
}

function saveOrder() {
  let date = document.getElementById("orderDate").value;
  if (!date) return alert("Tarih gerekli!");
  let selects=document.querySelectorAll(".productSelect");
  let qtys=document.querySelectorAll(".productQty");
  let units=document.querySelectorAll(".productUnit");
  let prices=document.querySelectorAll(".productPrice");
  let items=[],total=0;
  for(let i=0;i<selects.length;i++){
    let n=selects[i].value;
    let q=parseFloat(qtys[i].value);
    let u=units[i].value;
    let p=parseFloat(prices[i].value)||0;
    total+=p;
    items.push({name:n,qty:q,unit:u,price:p});
  }
  customers[currentCustomerIndex].orders.push({date:date,items:items,total:total});
  document.getElementById("orderDate").value="";
  document.getElementById("productLines").innerHTML="";
  addProductLine();
  saveData();
  renderCustomer();
}

function savePayment() {
  let date=document.getElementById("paymentDate").value;
  let amount=parseFloat(document.getElementById("paymentAmount").value);
  let type=document.getElementById("paymentType").value;
  if(!date||!amount) return alert("Tarih ve tutar gerekli!");
  customers[currentCustomerIndex].payments.push({date:date,amount:amount,type:type});
  document.getElementById("paymentDate").value="";
  document.getElementById("paymentAmount").value="";
  saveData();
  renderCustomer();
}