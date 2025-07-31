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

// (Buraya önceki sürümde verdiğim tüm müşteri ekleme, sipariş ekleme, ödeme, ürün yönetimi, PDF fonksiyonları aynı şekilde gelecek)
