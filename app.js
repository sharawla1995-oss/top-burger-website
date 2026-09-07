const SUPABASE_URL='https://kzokretuuigjhxjzdlmk.supabase.co';
const KEY='sb_publishable_m8gAAZTKnOvCSWNvQijIXw_H1obE9vg';
const H={apikey:KEY,Authorization:`Bearer ${KEY}`};
const $=s=>document.querySelector(s);
let data={branches:[],categories:[],products:[],branchProducts:[],variants:[],modifiers:[],productModifiers:[],branch:null,cat:null,q:'',cart:[],selected:null,selectedVariant:null,selectedExtras:new Set()};

async function get(path){const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:H});if(!r.ok)throw new Error(await r.text());return r.json()}
async function rpc(name,body){const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify(body)});let d=null;try{d=await r.json()}catch{}if(!r.ok)throw new Error(d?.message||'تعذر إرسال الطلب');return d}
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function money(n){return `${Number(n||0).toFixed(0)} ج.م`}
function branchRow(p){return data.branchProducts.find(x=>String(x.branch_id)===String(data.branch)&&String(x.product_id)===String(p.id))}
function priceFor(p){const o=branchRow(p);return Number(o?.price_override??p.price??0)}
function available(p){const o=branchRow(p);return !(o&&o.active===false)}
function productVariants(p){return data.variants.filter(v=>String(v.product_id)===String(p.id)&&v.active!==false).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||Number(a.id)-Number(b.id))}
function productExtras(p){if(p.allow_extras===false)return[];const allowed=new Set(data.productModifiers.filter(x=>String(x.product_id)===String(p.id)).map(x=>String(x.modifier_id)));return data.modifiers.filter(m=>m.active!==false&&allowed.has(String(m.id))).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||Number(a.id)-Number(b.id))}
function productDisplayPrice(p){const vs=productVariants(p);if(!vs.length)return money(priceFor(p));const vals=vs.map(v=>Number(v.price||0));return vals.length===1?money(vals[0]):`من ${money(Math.min(...vals))}`}

async function load(){
  try{
    const [b,c,p,bp,v,m,pm]=await Promise.all([
      get('branches?select=id,name&order=id'),
      get('categories?select=id,name,active,website_visible,website_sort_order,sort_order&active=eq.true&website_visible=eq.true&order=website_sort_order.asc,sort_order.asc,id.asc'),
      get('products?select=id,category_id,name,price,image_url,active,website_visible,website_sort_order,allow_extras,allow_removals,allow_item_notes,removable_components&active=eq.true&website_visible=eq.true&order=website_sort_order.asc,id.asc'),
      get('branch_products?select=branch_id,product_id,active,price_override'),
      get('product_variants?select=id,product_id,name,price,sort_order,active&active=eq.true&order=sort_order.asc,id.asc'),
      get('modifiers?select=id,name,price,active&active=eq.true&order=id.asc'),
      get('product_modifiers?select=product_id,modifier_id')
    ]);
    data.branches=b;data.categories=c;data.products=p;data.branchProducts=bp;data.variants=v;data.modifiers=m;data.productModifiers=pm;data.branch=b[0]?.id||null;renderAll();
  }catch(e){console.error(e);$('#categoryCards').innerHTML='<div class="empty">تعذر تحميل المنيو. شغّل SQL الخاص بـ Website V3 مرة واحدة.</div>'}
}
function renderAll(){renderBranch();renderCategories();renderCart()}
function renderBranch(){$('#branch').innerHTML=data.branches.map(x=>`<option value="${x.id}" ${String(x.id)===String(data.branch)?'selected':''}>${esc(x.name)}</option>`).join('')}
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

document.addEventListener('click',e=>{
  const cat=e.target.closest('[data-open-cat]');if(cat)openCategory(cat.dataset.openCat);
  const add=e.target.closest('[data-add]');if(add){e.stopPropagation();openProduct(add.dataset.add)}
  const card=e.target.closest('[data-product]');if(card&&!add)openProduct(card.dataset.product);
  const close=e.target.closest('[data-close]');if(close)$('#'+close.dataset.close).classList.add('hidden');
  const vo=e.target.closest('[data-variant]');if(vo){const v=data.variants.find(x=>String(x.id)===String(vo.dataset.variant));if(v){data.selectedVariant=v;document.querySelectorAll('.variant-option').forEach(x=>x.classList.remove('active'));vo.classList.add('active');refreshModalPrice()}}
  if(e.target.dataset.plus)qty(e.target.dataset.plus,1);if(e.target.dataset.minus)qty(e.target.dataset.minus,-1)
});
document.addEventListener('change',e=>{if(e.target.matches('[data-extra]')){const id=String(e.target.dataset.extra);e.target.checked?data.selectedExtras.add(id):data.selectedExtras.delete(id);refreshModalPrice()}});

$('#backBtn').onclick=()=>{$('#productsView').classList.add('hidden');$('#categoryView').classList.remove('hidden');data.q='';$('#search').value=''};
$('#branch').onchange=e=>{data.branch=e.target.value;renderCategories();if(data.cat)renderProducts()};
$('#searchBtn').onclick=()=>$('#searchBar').classList.toggle('hidden');$('#closeSearch').onclick=()=>$('#searchBar').classList.add('hidden');
$('#search').oninput=e=>{data.q=e.target.value.trim();if($('#productsView').classList.contains('hidden')&&data.categories[0])openCategory(data.categories[0].id);renderProducts()};
$('#addToCart').onclick=addSelected;$('#cartBar').onclick=()=>$('#cartModal').classList.remove('hidden');
$('#checkoutBtn').onclick=()=>{if(!data.cart.length)return;$('#checkoutTotal').textContent=money(data.cart.reduce((s,x)=>s+x.qty*x.price,0));$('#cartModal').classList.add('hidden');$('#checkoutModal').classList.remove('hidden')};
$('#submitOrder').onclick=async()=>{
  const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),address=$('#deliveryAddress').value.trim(),notes=$('#orderNotes').value.trim();
  if(name.length<2)return alert('اكتب اسم العميل');if(phone.replace(/\D/g,'').length<8)return alert('اكتب رقم موبايل صحيح');if(address.length<5)return alert('اكتب عنوان التوصيل');
  const btn=$('#submitOrder');btn.disabled=true;btn.textContent='جاري إرسال الطلب...';
  try{
    const items=data.cart.map(x=>({product_id:x.product_id,variant_id:x.variant_id,qty:x.qty,modifier_ids:(x.extras||[]).map(e=>e.id),notes:x.notes||''}));
    const d=await rpc('submit_website_order',{p_branch_id:Number(data.branch),p_customer_name:name,p_customer_phone:phone,p_delivery_address:address,p_notes:notes,p_items:items});
    data.cart=[];renderCart();$('#checkoutModal').classList.add('hidden');$('#websiteOrderCode').textContent=d.code||('WEB-'+d.id);$('#successModal').classList.remove('hidden');
    $('#customerName').value='';$('#customerPhone').value='';$('#deliveryAddress').value='';$('#orderNotes').value='';
  }catch(e){alert(e.message||'تعذر إرسال الطلب')}finally{btn.disabled=false;btn.textContent='تأكيد الطلب'}
};
load();
