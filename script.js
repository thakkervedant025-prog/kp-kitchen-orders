const MANAGER_PASSWORD = '2710';
let orders = [];
let selectedId = null;
let activeFilter = 'All';
let managerLoggedIn = false;
let statusStore = {};
const $ = id => document.getElementById(id);

function readSavedStatuses(){
  try { statusStore = JSON.parse(localStorage.getItem('kpsKitchenOrderStatuses') || '{}'); }
  catch { statusStore = {}; }
}
function saveStatuses(){ localStorage.setItem('kpsKitchenOrderStatuses', JSON.stringify(statusStore)); }
function getStatus(order){ return statusStore[order.id] || order.status || 'New'; }
function initials(name){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function safe(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function renderStats(){
  $('totalCount').textContent = orders.length;
  $('newCount').textContent = orders.filter(o=>getStatus(o)==='New').length;
  $('completeCount').textContent = orders.filter(o=>getStatus(o)==='Complete').length;
}
function visibleOrders(){
  const q=$('searchInput').value.trim().toLowerCase();
  return orders.filter(o=>(activeFilter==='All'||o.type===activeFilter)&&o.customer.toLowerCase().includes(q));
}
function renderList(){
  const list=$('customerList'), filtered=visibleOrders();
  $('customerCount').textContent = `${filtered.length} ${filtered.length===1?'order':'orders'}`;
  if(!filtered.length){list.innerHTML='<div class="no-results">No matching customers found.</div>';return;}
  list.innerHTML=filtered.map(o=>`<button class="customer-item ${selectedId===o.id?'selected':''}" data-id="${safe(o.id)}"><span class="customer-left"><span class="avatar">${safe(initials(o.customer))}</span><span class="customer-name">${safe(o.customer)}</span><span class="type-tag">${safe(o.type)}</span></span><span class="status-pill ${getStatus(o)==='Complete'?'status-complete':'status-new'}">${getStatus(o)}</span></button>`).join('');
  list.querySelectorAll('.customer-item').forEach(btn=>btn.addEventListener('click',()=>selectOrder(btn.dataset.id)));
}
function selectOrder(id){selectedId=id;renderList();renderDetail();}
function renderDetail(){
  const o=orders.find(x=>x.id===selectedId);const panel=$('detailPanel');
  if(!o){panel.innerHTML='<div class="empty-state"><div class="empty-icon">☷</div><h2>Select a customer</h2><p>Their order details will appear here.</p></div>';return;}
  const items=o.items||[];
  panel.innerHTML=`<div class="detail-head"><div><h2>${safe(o.customer)}</h2><div class="order-meta">${safe(o.sheet)} · Customer order</div></div><span class="status-pill ${getStatus(o)==='Complete'?'status-complete':'status-new'}">${getStatus(o)}</span></div>
  <div class="order-summary"><div class="summary-chip">Order type <strong>${safe(o.type)}</strong></div><div class="summary-chip">Items <strong>${items.length}</strong></div></div>
  <div class="items-title">Order details</div>
  <table class="items-table"><thead><tr><th>Item</th><th style="text-align:right">Quantity</th><th>Unit</th></tr></thead><tbody>${items.length?items.map(it=>`<tr><td>${safe(it.item)}</td><td class="qty">${safe(it.quantity)}</td><td>${safe(it.unit||'—')}</td></tr>`).join(''):'<tr><td colspan="3">No item details found in spreadsheet.</td></tr>'}</tbody></table>
  ${o.total?`<div class="total-row"><span>Total</span><span>${safe(o.total.startsWith('$')?o.total:'$'+o.total)}</span></div>`:''}
  ${o.address?`<div class="address-note"><strong>Address / note:</strong><br>${safe(o.address)}</div>`:''}
  <div class="status-section"><div><h3>Order status</h3><p>${managerLoggedIn?'Choose the current order status.':'Manager login is required to change the status.'}</p></div><div class="status-actions"><button class="status-button new ${getStatus(o)==='New'?'active':''}" id="setNew" ${managerLoggedIn?'':'disabled'}>New</button><button class="status-button complete ${getStatus(o)==='Complete'?'active':''}" id="setComplete" ${managerLoggedIn?'':'disabled'}>Complete</button></div></div>
  <div class="manager-note">${managerLoggedIn?'Manager mode is active':'Log in as manager to update this order.'}</div>`;
  if(managerLoggedIn){$('setNew').addEventListener('click',()=>updateStatus(o.id,'New'));$('setComplete').addEventListener('click',()=>updateStatus(o.id,'Complete'));}
}
function updateStatus(id,status){statusStore[id]=status;saveStatuses();renderStats();renderList();renderDetail();}
function setManagerMode(value){managerLoggedIn=value;$('managerButton').textContent=value?'Manager logout':'Manager login';$('lockState').textContent=value?'🔓 Manager access active':'🔒 Manager access required to update';renderDetail();}
async function loadOrders(){
  try{const res=await fetch('orders.json');if(!res.ok)throw new Error('Could not load orders.json');orders=await res.json();readSavedStatuses();renderStats();renderList();}
  catch(err){$('customerList').innerHTML='<div class="no-results">Could not load the order list. Keep orders.json in the same folder as index.html.</div>';console.error(err);}
}
$('managerButton').addEventListener('click',()=>{if(managerLoggedIn){setManagerMode(false);return;}$('loginError').textContent='';$('passwordInput').value='';$('loginModal').classList.add('show');$('loginModal').setAttribute('aria-hidden','false');$('passwordInput').focus();});
function closeLogin(){$('loginModal').classList.remove('show');$('loginModal').setAttribute('aria-hidden','true');}
$('closeModal').addEventListener('click',closeLogin);
$('loginModal').addEventListener('click',e=>{if(e.target===$('loginModal'))closeLogin();});
$('loginForm').addEventListener('submit',e=>{e.preventDefault();if($('passwordInput').value===MANAGER_PASSWORD){setManagerMode(true);closeLogin();}else{$('loginError').textContent='Incorrect password. Please try again.';}});
$('searchInput').addEventListener('input',renderList);
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===btn));renderList();}));
$('todayLabel').textContent=new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
loadOrders();