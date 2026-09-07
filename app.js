const SUPABASE_URL='https://kzokretuuigjhxjzdlmk.supabase.co';
const KEY='sb_publishable_m8gAAZTKnOvCSWNvQijIXw_H1obE9vg';
const H={apikey:KEY,Authorization:`Bearer ${KEY}`};
const $=s=>document.querySelector(s);
let data={branches:[],categories:[],products:[],branchProducts:[],branchSettings:[],variants:[],modifiers:[],productModifiers:[],business:{business_name:'Top Burger',tagline:'🔥 طعم يستاهل التجربة',logo_url:'',currency_symbol:'ج.م',primary_color:'#b51f2b',accent_color:'#f0643d'},branch:null,cat:null,q:'',cart:[],selected:null,selectedVariant:null,selectedExtras:new Set()};

async function get(path){const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:H});if(!r.ok)throw new Error(await r.text());return r.json()}
async function rpc(name,body){const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify(body)});let d=null;try{d=await r.json()}catch{}if(!r.ok)throw new Error(d?.message||'تعذر إرسال الطلب');return d}
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function money(n){return `${Number(n||0).toFixed(0)} ${data.business?.currency_symbol||'ج.م'}`}
function applyBusinessBranding(){
  const b=data.business||{};document.title=`${b.business_name||'Top Burger'} | اطلب أونلاين`;
  const root=document.documentElement;if(b.primary_color)root.style.setProperty('--brand-primary',b.primary_color);if(b.accent_color)root.style.setProperty('--brand-accent',b.accent_color);
  document.querySelectorAll('[data-business-name]').forEach(x=>x.textContent=b.business_name||'Top Burger');
  document.querySelectorAll('[data-business-tagline]').forEach(x=>x.textContent=b.tagline||'');
  document.querySelectorAll('[data-business-logo]').forEach(x=>{if(b.logo_url){x.src=b.logo_url;x.classList.remove('hidden')}else{x.classList.add('hidden')}});
  document.querySelectorAll('[data-business-logo-fallback]').forEach(x=>x.classList.toggle('hidden',!!b.logo_url));
}
function branchRow(p){return data.branchProducts.find(x=>String(x.branch_id)===String(data.branch)&&String(x.product_id)===String(p.id))}
function priceFor(p){const o=branchRow(p);return Number(o?.price_override??p.price??0)}
function available(p){const o=branchRow(p);if(!o)return true;if(o.active===false)return false;const u=o.website_paused_until?new Date(o.website_paused_until):null;return !(u&&!Number.isNaN(u.getTime())&&u.getTime()>Date.now())}
function branchSetting(id=data.branch){return data.branchSettings.find(x=>String(x.branch_id)===String(id))||{branch_id:id,orders_open:true,orders_paused_until:null,prep_min:30,prep_max:45}}
function branchOpen(id=data.branch){const r=branchSetting(id);if(r.orders_open===false)return false;const u=r.orders_paused_until?new Date(r.orders_paused_until):null;return !(u&&!Number.isNaN(u.getTime())&&u.getTime()>Date.now())}
function prepText(id=data.branch){const r=branchSetting(id),a=Number(r.prep_min||30),b=Number(r.prep_max||45);return a===b?`${a} دقيقة`:`${a}–${b} دقيقة`}
function branchStatusText(id){const r=branchSetting(id);if(r.orders_open===false)return '🔴 الطلبات متوقفة مؤقتًا';const u=r.orders_paused_until?new Date(r.orders_paused_until):null;if(u&&!Number.isNaN(u.getTime())&&u.getTime()>Date.now())return `🟠 متوقف حتى ${u.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}`;return `🟢 مفتوح • التجهيز ${prepText(id)}`}
function productVariants(p){return data.variants.filter(v=>String(v.product_id)===String(p.id)&&v.active!==false).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||Number(a.id)-Number(b.id))}
function productExtras(p){if(p.allow_extras===false)return[];const allowed=new Set(data.productModifiers.filter(x=>String(x.product_id)===String(p.id)).map(x=>String(x.modifier_id)));return data.modifiers.filter(m=>m.active!==false&&allowed.has(String(m.id))).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||Number(a.id)-Number(b.id))}
function productDisplayPrice(p){const vs=productVariants(p);if(!vs.length)return money(priceFor(p));const vals=vs.map(v=>Number(v.price||0));return vals.length===1?money(vals[0]):`من ${money(Math.min(...vals))}`}

async function load(){
  try{
    const [b,c,p,bp,bs,biz,v,m,pm]=await Promise.all([
      get('branches?select=id,name,phone,address&active=eq.true&website_visible=eq.true&order=sort_order.asc,id.asc'),
      get('categories?select=id,name,active,website_visible,website_sort_order,sort_order&active=eq.true&website_visible=eq.true&order=website_sort_order.asc,sort_order.asc,id.asc'),
      get('products?select=id,category_id,name,price,image_url,active,website_visible,website_sort_order,allow_extras,allow_removals,allow_item_notes,removable_components&active=eq.true&website_visible=eq.true&order=website_sort_order.asc,id.asc'),
      get('branch_products?select=branch_id,product_id,active,price_override,website_paused_until'),
      get('branch_website_settings?select=branch_id,orders_open,orders_paused_until,prep_min,prep_max').catch(()=>[]),
      get('business_settings?select=*&id=eq.1&limit=1').catch(()=>[]),
      get('product_variants?select=id,product_id,name,price,sort_order,active&active=eq.true&order=sort_order.asc,id.asc'),
      get('modifiers?select=id,name,price,active&active=eq.true&order=id.asc'),
      get('product_modifiers?select=product_id,modifier_id')
    ]);
    data.branches=b;data.categories=c;data.products=p;data.branchProducts=bp;data.branchSettings=bs;if(biz?.[0])data.business={...data.business,...biz[0]};data.variants=v;data.modifiers=m;data.productModifiers=pm;applyBusinessBranding();data.branch=null;renderBranchGate();
  }catch(e){console.error(e);$('#categoryCards').innerHTML='<div class="empty">تعذر تحميل المنيو. شغّل SQL الخاص بـ Website V3 مرة واحدة.</div>'}
}
function renderAll(){renderBranch();renderCategories();renderCart()}
function renderBranchGate(){
  const box=$('#branchGateOptions');
  if(!data.branches.length){box.innerHTML='<div class="empty">لا توجد فروع متاحة حاليًا</div>';return;}
  box.innerHTML=data.branches.map(x=>{const open=branchOpen(x.id),contact=[x.address,x.phone].filter(Boolean).join(' • ');return `<button class="branch-choice ${open?'':'closed'}" data-choose-branch="${x.id}" ${open?'':'disabled'}><span class="branch-pin">📍</span><b>فرع ${esc(x.name)}</b><small>${esc(branchStatusText(x.id))}</small>${contact?`<small class="branch-contact-small">${esc(contact)}</small>`:''}</button>`}).join('');
}
function chooseBranch(id){
  const b=data.branches.find(x=>String(x.id)===String(id));if(!b)return;if(!branchOpen(b.id))return alert('الفرع لا يستقبل طلبات الموقع حاليًا');
  data.branch=b.id;data.cat=null;data.q='';data.cart=[];
  $('#search').value='';$('#productsView').classList.add('hidden');$('#categoryView').classList.remove('hidden');
  renderAll();$('#branchGate').classList.add('hidden');
}
function changeBranch(id){
  if(String(id)===String(data.branch))return;
  if(data.cart.length&&!confirm('تغيير الفرع هيفضي السلة لأن الأسعار والتوافر ممكن يختلفوا بين الفروع. متابعة؟')){renderBranch();return;}
  chooseBranch(id);
}
function renderBranch(){$('#branch').innerHTML=data.branches.map(x=>`<option value="${x.id}" ${String(x.id)===String(data.branch)?'selected':''} ${branchOpen(x.id)?'':'disabled'}>${esc(x.name)}${branchOpen(x.id)?'':' — مغلق'}</option>`).join('');const br=data.branches.find(x=>String(x.id)===String(data.branch));const info=$('#branchInfo');if(info)info.textContent=branchStatusText(data.branch);const contact=$('#branchContact');if(contact)contact.innerHTML=br?[br.address?`<span>📍 ${esc(br.address)}</span>`:'',br.phone?`<a href="tel:${esc(br.phone)}">☎ ${esc(br.phone)}</a>`:''].filter(Boolean).join(''):'';const note=$('#deliveryNote');if(note)note.textContent=`مدة التجهيز المتوقعة: ${prepText(data.branch)}. رسوم التوصيل يؤكدها الفرع عند مراجعة الطلب.`}
function catProducts(c){return data.products.filter(p=>String(p.category_id)===String(c.id)&&available(p))}
function renderCategories(){$('#categoryCards').innerHTML=data.categories.map(c=>{const ps=catProducts(c),img=ps.find(p=>p.image_url)?.image_url;return `<button class="category-card" data-open-cat="${c.id}">${img?`<img src="${esc(img)}" loading="lazy">`:'<div class="fallback">🍔</div>'}<div class="category-info"><b>${esc(c.name)}</b><small>${ps.length} عناصر</small></div></button>`}).join('')||'<div class="empty">لا توجد تصنيفات متاحة</div>'}
function openCategory(id){data.cat=String(id);$('#categoryView').classList.add('hidden');$('#productsView').classList.remove('hidden');renderProducts();scrollTo({top:0,behavior:'smooth'})}
function renderProducts(){
  const c=data.categories.find(x=>String(x.id)===String(data.cat));$('#categoryTitle').textContent=c?.name||'المنيو';
  $('#cats').innerHTML=data.categories.map(x=>`<button class="cat ${String(x.id)===String(data.cat)?'active':''}" data-open-cat="${x.id}">${esc(x.name)}</button>`).join('');
  let ps=data.products.filter(p=>available(p)&&String(p.category_id)===String(data.cat)&&(!data.q||p.name.toLowerCase().includes(data.q.toLowerCase())));
  $('#status').style.display='none';
  $('#products').innerHTML=ps.length?ps.map(p=>`<article class="product-card" data-product="${p.id}"><div class="photo">${p.image_url?`<img src="${esc(p.image_url)}" loading="lazy">`:'<div class="fallback">🍔</div>'}</div><button class="plus" data-add="${p.id}">+</button><div class="product-body"><h3>${esc(p.name)}</h3><div class="price">${productDisplayPrice(p)}</div></div></article>`).join(''):'<div class="empty">لا توجد أصناف مطابقة</div>'
}
function ensureModalSections(){
  const sheet=$('#productModal .sheet');
  if(!$('#variantBox')){
    const box=document.createElement('div');box.id='variantBox';box.className='choice-box hidden';box.innerHTML='<h3>اختار الحجم</h3><div id="variantOptions" class="choice-grid"></div>';
    $('#modalPrice').after(box);
  }
  if(!$('#extrasBox')){
    const box=document.createElement('div');box.id='extrasBox';box.className='choice-box hidden';box.innerHTML='<h3>الإضافات</h3><div id="extraOptions" class="extras-list"></div>';
    $('#variantBox').after(box);
  }
}
function openProduct(id){
  ensureModalSections();
  const p=data.products.find(x=>String(x.id)===String(id));if(!p)return;
  data.selected=p;data.selectedExtras=new Set();
  const vs=productVariants(p);data.selectedVariant=vs[0]||null;
  $('#modalName').textContent=p.name;$('#modalImg').src=p.image_url||'';$('#modalImg').style.display=p.image_url?'block':'none';$('#modalNotes').value='';
  if(vs.length){
    $('#variantBox').classList.remove('hidden');
    $('#variantOptions').innerHTML=vs.map((v,i)=>`<button class="variant-option ${i===0?'active':''}" data-variant="${v.id}"><b>${esc(v.name)}</b><span>${money(v.price)}</span></button>`).join('');
    $('#modalPrice').textContent=money(vs[0].price);
  }else{$('#variantBox').classList.add('hidden');$('#modalPrice').textContent=money(priceFor(p))}
  const extras=productExtras(p);
  if(extras.length){
    $('#extrasBox').classList.remove('hidden');
    $('#extraOptions').innerHTML=extras.map(m=>`<label class="extra-row"><input type="checkbox" data-extra="${m.id}"><span>${esc(m.name)}</span><b>+ ${money(m.price)}</b></label>`).join('');
  }else $('#extrasBox').classList.add('hidden');
  $('.notes-label').style.display=p.allow_item_notes===false?'none':'block';
  $('#productModal').classList.remove('hidden');
}
function currentUnitPrice(){
  const base=data.selectedVariant?Number(data.selectedVariant.price||0):priceFor(data.selected);
  const extras=[...data.selectedExtras].map(id=>data.modifiers.find(m=>String(m.id)===String(id))).filter(Boolean).reduce((s,m)=>s+Number(m.price||0),0);
  return base+extras;
}
function refreshModalPrice(){$('#modalPrice').textContent=money(currentUnitPrice())}
function addSelected(){
  if(!data.selected)return;
  const chosenExtras=[...data.selectedExtras].map(id=>data.modifiers.find(m=>String(m.id)===String(id))).filter(Boolean).map(m=>({id:m.id,name:m.name,price:Number(m.price||0)}));
  data.cart.push({key:Date.now()+Math.random(),product_id:data.selected.id,name:data.selected.name,variant_id:data.selectedVariant?.id||null,variant_name:data.selectedVariant?.name||'',base_price:data.selectedVariant?Number(data.selectedVariant.price||0):priceFor(data.selected),extras:chosenExtras,price:currentUnitPrice(),qty:1,notes:$('#modalNotes').value.trim()});
  $('#productModal').classList.add('hidden');renderCart();
}
function renderCart(){
  const count=data.cart.reduce((s,x)=>s+x.qty,0),total=data.cart.reduce((s,x)=>s+x.qty*x.price,0);
  $('#cartCount').textContent=count;$('#cartTotal').textContent=money(total);$('#cartModalTotal').textContent=money(total);
  $('#cartItems').innerHTML=data.cart.length?data.cart.map(x=>{const details=[x.variant_name, ...(x.extras||[]).map(e=>e.name), x.notes].filter(Boolean).join(' • ');return `<div class="cart-item"><div><b>${esc(x.name)}</b><small>${money(x.price)}${details?' • '+esc(details):''}</small></div><div class="qty"><button data-minus="${x.key}">−</button><b>${x.qty}</b><button data-plus="${x.key}">+</button></div></div>`}).join(''):'<div class="empty">السلة فاضية</div>'
}
function qty(key,d){const x=data.cart.find(i=>String(i.key)===String(key));if(!x)return;x.qty+=d;if(x.qty<=0)data.cart=data.cart.filter(i=>i!==x);renderCart()}

document.addEventListener('click',e=>{if(e.target.closest('[data-choose-branch]')){chooseBranch(e.target.closest('[data-choose-branch]').dataset.chooseBranch);return;}
  const cat=e.target.closest('[data-open-cat]');if(cat)openCategory(cat.dataset.openCat);
  const add=e.target.closest('[data-add]');if(add){e.stopPropagation();openProduct(add.dataset.add)}
  const card=e.target.closest('[data-product]');if(card&&!add)openProduct(card.dataset.product);
  const close=e.target.closest('[data-close]');if(close)$('#'+close.dataset.close).classList.add('hidden');
  const vo=e.target.closest('[data-variant]');if(vo){const v=data.variants.find(x=>String(x.id)===String(vo.dataset.variant));if(v){data.selectedVariant=v;document.querySelectorAll('.variant-option').forEach(x=>x.classList.remove('active'));vo.classList.add('active');refreshModalPrice()}}
  if(e.target.dataset.plus)qty(e.target.dataset.plus,1);if(e.target.dataset.minus)qty(e.target.dataset.minus,-1)
});
document.addEventListener('change',e=>{if(e.target.matches('[data-extra]')){const id=String(e.target.dataset.extra);e.target.checked?data.selectedExtras.add(id):data.selectedExtras.delete(id);refreshModalPrice()}});

$('#backBtn').onclick=()=>{$('#productsView').classList.add('hidden');$('#categoryView').classList.remove('hidden');data.q='';$('#search').value=''};
$('#branch').onchange=e=>changeBranch(e.target.value);
$('#searchBtn').onclick=()=>$('#searchBar').classList.toggle('hidden');$('#closeSearch').onclick=()=>$('#searchBar').classList.add('hidden');
$('#search').oninput=e=>{data.q=e.target.value.trim();if($('#productsView').classList.contains('hidden')&&data.categories[0])openCategory(data.categories[0].id);renderProducts()};
$('#addToCart').onclick=addSelected;$('#cartBar').onclick=()=>$('#cartModal').classList.remove('hidden');
$('#checkoutBtn').onclick=async()=>{if(!data.cart.length)return;try{const latest=await get(`branch_website_settings?select=branch_id,orders_open,orders_paused_until,prep_min,prep_max&branch_id=eq.${Number(data.branch)}`);if(latest?.[0]){data.branchSettings=data.branchSettings.filter(x=>String(x.branch_id)!==String(data.branch));data.branchSettings.push(latest[0])}}catch(e){}if(!branchOpen())return alert('الفرع أوقف استقبال طلبات الموقع حاليًا. اختار فرع تاني أو جرّب بعد شوية.');renderBranch();$('#checkoutTotal').textContent=money(data.cart.reduce((s,x)=>s+x.qty*x.price,0));$('#cartModal').classList.add('hidden');$('#checkoutModal').classList.remove('hidden')};
$('#submitOrder').onclick=async()=>{
  try{const latest=await get(`branch_website_settings?select=branch_id,orders_open,orders_paused_until,prep_min,prep_max&branch_id=eq.${Number(data.branch)}`);if(latest?.[0]){data.branchSettings=data.branchSettings.filter(x=>String(x.branch_id)!==String(data.branch));data.branchSettings.push(latest[0])}}catch(e){}
  if(!branchOpen())return alert('الفرع أوقف استقبال طلبات الموقع حاليًا. لم يتم إرسال الطلب.');
  const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),address=$('#deliveryAddress').value.trim(),notes=$('#orderNotes').value.trim();
  if(name.length<2)return alert('اكتب اسم العميل');if(phone.replace(/\D/g,'').length<8)return alert('اكتب رقم موبايل صحيح');if(address.length<5)return alert('اكتب عنوان التوصيل');
  const btn=$('#submitOrder');btn.disabled=true;btn.textContent='جاري إرسال الطلب...';
  try{
    const items=data.cart.map(x=>({
      product_id:x.product_id,
      variant_id:x.variant_id,
      quantity:x.qty,
      modifiers:(x.extras||[]).map(e=>({modifier_id:e.id})),
      notes:x.notes||''
    }));
    const d=await rpc('create_website_order',{p_branch_id:Number(data.branch),p_customer_name:name,p_customer_phone:phone,p_customer_address:address,p_customer_notes:notes,p_items:items});
    const orderId=Number(d);
    data.cart=[];renderCart();$('#checkoutModal').classList.add('hidden');$('#websiteOrderCode').textContent='WEB-'+String(orderId).padStart(5,'0');$('#successModal').classList.remove('hidden');
    $('#customerName').value='';$('#customerPhone').value='';$('#deliveryAddress').value='';$('#orderNotes').value='';
  }catch(e){alert(e.message||'تعذر إرسال الطلب')}finally{btn.disabled=false;btn.textContent='تأكيد الطلب'}
};
load();
setInterval(()=>{if(data.branches.length){if(!$('#branchGate').classList.contains('hidden'))renderBranchGate();if(data.branch)renderBranch()}},30000);
